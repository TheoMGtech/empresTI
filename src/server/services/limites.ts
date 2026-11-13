import type { PrismaClient } from "@prisma/client";

import { ErroLimiteExcedido, ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import {
  identificadoresLogin,
  identificadoresMutacao,
  type EscopoLimite,
} from "@/server/services/identificadores-limite";

// Spec 009 (T-SEG-07): contador atômico em `limites_requisicao`.
// - Janela fixa (RN-SEG-02, P6): começa no múltiplo da duração que contém `agora`.
// - Um único `INSERT … ON CONFLICT … DO UPDATE … WHERE contador < limite RETURNING` por contador
//   (RS-SEG-05). Sem linha devolvida, o limite estourou e nada foi consumido (RN-SEG-07).
// - Contador expirado não participa (RN-SEG-10, item 1): a chave primária inclui `janela_inicio`,
//   então uma janela nova é outra linha.
// - Limpeza oportunística em lote limitado, na mesma transação de cada escrita (RN-SEG-10, item 2).
// - Qualquer erro do banco vira `ErroLimiteIndisponivel`, sem detalhe e sem log (RF-SEG-12,
//   RS-SEG-03).

type Prisma = Pick<PrismaClient, "$transaction">;
type Transacao = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Limites aprovados (Q3): quantidade por janela fixa, em segundos. */
export const LIMITES: Record<EscopoLimite, { limite: number; duracaoSegundos: number }> = {
  login_ip: { limite: 100, duracaoSegundos: 15 * 60 },
  login_email: { limite: 5, duracaoSegundos: 15 * 60 },
  mutacao_usuario: { limite: 30, duracaoSegundos: 60 },
  mutacao_ip: { limite: 120, duracaoSegundos: 60 },
};

/** Linhas expiradas removidas, no máximo, a cada escrita. */
export const LOTE_LIMPEZA = 200;

export type Contador = { escopo: EscopoLimite; identificador: string };
export type Reserva = Contador & { janelaInicio: Date };
type Opcoes = { agora: Date };

export function janelaDe(escopo: EscopoLimite, agora: Date) {
  const duracaoMs = LIMITES[escopo].duracaoSegundos * 1000;
  const inicio = Math.floor(agora.getTime() / duracaoMs) * duracaoMs;
  return { janelaInicio: new Date(inicio), expiraEm: new Date(inicio + duracaoMs) };
}

/** Consome uma vaga de um contador. Lança `ErroLimiteExcedido` sem consumir, se estiver cheio. */
export async function consumir(prisma: Prisma, contador: Contador, opcoes: Opcoes) {
  const [reserva] = await consumirJuntos(prisma, [contador], opcoes);
  return reserva as Reserva;
}

/**
 * Consome uma vaga de cada contador numa única transação (login e mutações). Se qualquer um estiver
 * cheio, a transação é desfeita e nenhum é consumido. Os contadores são travados sempre na mesma
 * ordem, para que chamadas concorrentes não se bloqueiem em ciclo.
 */
export async function consumirJuntos(
  prisma: Prisma,
  contadores: readonly Contador[],
  { agora }: Opcoes,
): Promise<Reserva[]> {
  const ordenados = [...contadores].sort(compararContadores);

  return executar(prisma, async (transacao) => {
    const reservas: Reserva[] = [];
    for (const contador of ordenados) {
      reservas.push(await consumirNaTransacao(transacao, contador, agora));
    }
    await limparExpirados(transacao, agora);
    return contadores.map(
      (contador) =>
        reservas.find(
          (reserva) =>
            reserva.escopo === contador.escopo && reserva.identificador === contador.identificador,
        ) as Reserva,
    );
  });
}

/** Devolve a vaga de uma reserva, na janela em que ela foi feita, sem descer abaixo de zero (P2). */
export async function devolver(prisma: Prisma, reserva: Reserva, { agora }: Opcoes) {
  await executar(prisma, async (transacao) => {
    await transacao.$executeRaw`
      UPDATE "limites_requisicao"
         SET "contador" = "contador" - 1
       WHERE "escopo" = ${reserva.escopo}
         AND "identificador" = ${reserva.identificador}
         AND "janela_inicio" = ${reserva.janelaInicio.toISOString()}::timestamptz
         AND "contador" > 0`;
    await limparExpirados(transacao, agora);
  });
}

async function consumirNaTransacao(
  transacao: Transacao,
  { escopo, identificador }: Contador,
  agora: Date,
): Promise<Reserva> {
  const { limite } = LIMITES[escopo];
  const { janelaInicio, expiraEm } = janelaDe(escopo, agora);

  const linhas = await transacao.$queryRaw<{ contador: number }[]>`
    INSERT INTO "limites_requisicao"
           ("escopo", "identificador", "janela_inicio", "expira_em", "contador")
    VALUES (${escopo}, ${identificador}, ${janelaInicio.toISOString()}::timestamptz,
            ${expiraEm.toISOString()}::timestamptz, 1)
    ON CONFLICT ("escopo", "identificador", "janela_inicio") DO UPDATE
       SET "contador" = "limites_requisicao"."contador" + 1
     WHERE "limites_requisicao"."contador" < ${limite}::int
    RETURNING "contador"`;

  if (linhas.length === 0) {
    const segundos = Math.max(1, Math.ceil((expiraEm.getTime() - agora.getTime()) / 1000));
    throw new ErroLimiteExcedido(segundos);
  }

  return { escopo, identificador, janelaInicio };
}

// `SKIP LOCKED`: duas limpezas simultâneas pegam linhas diferentes em vez de esperar uma pela outra
// ou se bloquearem em ciclo.
async function limparExpirados(transacao: Transacao, agora: Date) {
  await transacao.$executeRaw`
    DELETE FROM "limites_requisicao"
     WHERE ctid IN (
       SELECT ctid FROM "limites_requisicao"
        WHERE "expira_em" <= ${agora.toISOString()}::timestamptz
        LIMIT ${LOTE_LIMPEZA}::int
        FOR UPDATE SKIP LOCKED)`;
}

async function executar<T>(prisma: Prisma, acao: (transacao: Transacao) => Promise<T>) {
  try {
    return await prisma.$transaction(acao);
  } catch (erro) {
    if (erro instanceof ErroLimiteExcedido) throw erro;
    throw new ErroLimiteIndisponivel();
  }
}

/**
 * Limitador usado pelos procedimentos (T-SEG-08). Recebe e-mail, IP e usuário em claro e só grava
 * o HMAC deles. Lança `ErroLimiteExcedido` ou `ErroLimiteIndisponivel`, e nada mais.
 */
export type Limitador = {
  /** Login: `login_ip` e `login_email` juntos (ajuste obrigatório 1). */
  reservarLogin(dados: { email: string; ip: string | null }): Promise<{ ip: Reserva; email: Reserva }>;
  /** Mutações cobertas: `mutacao_usuario` e `mutacao_ip` juntos. */
  reservarMutacao(dados: { tenantId: string; usuarioId: string; ip: string | null }): Promise<void>;
  devolver(reserva: Reserva): Promise<void>;
};

/**
 * Limitador real sobre `limites_requisicao`. A chave e o cliente Prisma só são lidos no uso: sem
 * `CHAVE_HMAC_LIMITES`, sem banco configurado ou com o banco fora, a operação falha fechada
 * (`ErroLimiteIndisponivel`, RF-SEG-12).
 */
export function criarLimitador(
  obterPrisma: () => Prisma,
  relogio: () => Date = () => new Date(),
): Limitador {
  return {
    reservarLogin: (dados) =>
      falharFechado(async () => {
        const ids = identificadoresLogin(dados);
        const [ip, email] = await consumirJuntos(
          obterPrisma(),
          [
            { escopo: "login_ip", identificador: ids.login_ip },
            { escopo: "login_email", identificador: ids.login_email },
          ],
          { agora: relogio() },
        );
        return { ip: ip as Reserva, email: email as Reserva };
      }),
    reservarMutacao: (dados) =>
      falharFechado(async () => {
        const ids = identificadoresMutacao(dados);
        await consumirJuntos(
          obterPrisma(),
          [
            { escopo: "mutacao_usuario", identificador: ids.mutacao_usuario },
            { escopo: "mutacao_ip", identificador: ids.mutacao_ip },
          ],
          { agora: relogio() },
        );
      }),
    devolver: (reserva) => falharFechado(() => devolver(obterPrisma(), reserva, { agora: relogio() })),
  };
}

async function falharFechado<T>(acao: () => Promise<T>) {
  try {
    return await acao();
  } catch (erro) {
    if (erro instanceof ErroLimiteExcedido || erro instanceof ErroLimiteIndisponivel) throw erro;
    throw new ErroLimiteIndisponivel();
  }
}

function compararContadores(a: Contador, b: Contador) {
  return a.escopo.localeCompare(b.escopo) || a.identificador.localeCompare(b.identificador);
}
