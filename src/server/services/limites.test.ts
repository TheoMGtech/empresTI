// @vitest-environment node
//
// Spec 009 (T-SEG-07): contador atômico em Postgres real, com relógio fixo.
// CA-SEG-09 (serviço): concorrência não ultrapassa o limite; recusa não consome.
// CA-SEG-12 (serviço): banco indisponível ou sem tabela vira `ErroLimiteIndisponivel`.
// CA-SEG-13: só identificadores HMAC na tabela; nada vai para log.
// CA-SEG-15: contador expirado não participa; limpeza em lote limitado preserva a janela atual.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ErroLimiteExcedido, ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import { identificador } from "@/server/services/identificadores-limite";
import {
  consumir,
  consumirJuntos,
  devolver,
  janelaDe,
  LIMITES,
  LOTE_LIMPEZA,
  type Contador,
} from "@/server/services/limites";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const CHAVE = "chave-hmac-do-teste-do-contador-0000000000";
// 12:07:30 UTC: janela de 15 min em 12:00–12:15 (450 s restantes); de 60 s em 12:07–12:08 (30 s).
const AGORA = new Date("2026-11-12T12:07:30Z");
const QUINZE_MIN_DEPOIS = new Date("2026-11-12T12:22:30Z");

const EMAIL: Contador = {
  escopo: "login_email",
  identificador: identificador("login_email", "pessoa@exemplo.com", CHAVE),
};
const IP_LOGIN: Contador = {
  escopo: "login_ip",
  identificador: identificador("login_ip", "203.0.113.7", CHAVE),
};
const USUARIO: Contador = {
  escopo: "mutacao_usuario",
  identificador: identificador(
    "mutacao_usuario",
    "00000000-0000-4000-8000-00000000000a:00000000-0000-4000-8000-000000000001",
    CHAVE,
  ),
};
const IP_MUTACAO: Contador = {
  escopo: "mutacao_ip",
  identificador: identificador("mutacao_ip", "203.0.113.7", CHAVE),
};

type Contexto = { prisma: PrismaClient; cliente: Client };
type Linha = { escopo: string; identificador: string; janela: string; expira: string; contador: number };

let banco: BancoReal;

async function comBanco<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  // Pool maior que as rajadas dos testes (até 20): o que se prova aqui é a contagem atômica no
  // banco, não a fila do pool. Com o pool padrão (10), a máquina carregada estoura o `maxWait` do
  // Prisma, e essas chamadas falham fechadas antes de chegar ao contador.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 50 }) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao({ prisma, cliente });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

async function linhas(cliente: Client): Promise<Linha[]> {
  const { rows } = await cliente.query<Linha>(
    `SELECT escopo, identificador,
            to_char(janela_inicio AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS janela,
            to_char(expira_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS expira,
            contador
       FROM limites_requisicao ORDER BY escopo, identificador, janela_inicio`,
  );
  return rows;
}

async function contadorDe(cliente: Client, { escopo, identificador: id }: Contador) {
  const { rows } = await cliente.query<{ total: number }>(
    `SELECT coalesce(sum(contador), 0)::int AS total FROM limites_requisicao
      WHERE escopo = $1 AND identificador = $2`,
    [escopo, id],
  );
  return rows[0]?.total;
}

async function inserirExpiradas(cliente: Client, quantidade: number) {
  await cliente.query(
    `INSERT INTO limites_requisicao (escopo, identificador, janela_inicio, expira_em, contador)
     SELECT 'mutacao_ip', lpad(to_hex(n), 64, '0'),
            '2026-11-12T11:00:00Z'::timestamptz, '2026-11-12T11:01:00Z'::timestamptz, 1
       FROM generate_series(1, $1) AS n`,
    [quantidade],
  );
}

// Abre `quantidade` conexões no pool fora de transação, onde não há `maxWait`.
async function aquecer(prisma: PrismaClient, quantidade: number) {
  await Promise.all(Array.from({ length: quantidade }, () => prisma.$queryRaw`SELECT 1 AS ok FROM pg_sleep(0.05)`));
}

async function resultados<T>(promessas: Promise<T>[]) {
  const todos = await Promise.allSettled(promessas);
  const recusas = todos.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  return {
    aceitas: todos.length - recusas.length,
    recusas: recusas.map((r) => r.reason as unknown),
  };
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("janela fixa", () => {
  it("RN-SEG-02 — login: 15 min a partir do múltiplo da duração", () => {
    expect(janelaDe("login_email", AGORA)).toEqual({
      janelaInicio: new Date("2026-11-12T12:00:00Z"),
      expiraEm: new Date("2026-11-12T12:15:00Z"),
    });
  });

  it("RN-SEG-02 — mutações: 60 s a partir do múltiplo da duração", () => {
    expect(janelaDe("mutacao_usuario", AGORA)).toEqual({
      janelaInicio: new Date("2026-11-12T12:07:00Z"),
      expiraEm: new Date("2026-11-12T12:08:00Z"),
    });
  });

  it("Q3 — limites aprovados", () => {
    expect(LIMITES).toEqual({
      login_ip: { limite: 100, duracaoSegundos: 900 },
      login_email: { limite: 5, duracaoSegundos: 900 },
      mutacao_usuario: { limite: 30, duracaoSegundos: 60 },
      mutacao_ip: { limite: 120, duracaoSegundos: 60 },
    });
  });
});

describe("consumir", () => {
  it("CA-SEG-13 — grava só o identificador HMAC, na janela atual", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reserva = await consumir(prisma, EMAIL, { agora: AGORA });

      expect(reserva).toEqual({ ...EMAIL, janelaInicio: new Date("2026-11-12T12:00:00Z") });
      expect(await linhas(cliente)).toEqual([
        {
          escopo: "login_email",
          identificador: EMAIL.identificador,
          janela: "2026-11-12T12:00:00Z",
          expira: "2026-11-12T12:15:00Z",
          contador: 1,
        },
      ]);
      expect(EMAIL.identificador).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it("CA-SEG-09 — conta até o limite e recusa a seguinte com os segundos até o fim da janela", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      for (let i = 0; i < LIMITES.login_email.limite; i += 1) {
        await consumir(prisma, EMAIL, { agora: AGORA });
      }

      const recusa = await consumir(prisma, EMAIL, { agora: AGORA }).catch((erro: unknown) => erro);

      expect(recusa).toBeInstanceOf(ErroLimiteExcedido);
      expect((recusa as ErroLimiteExcedido).segundos).toBe(450);
      expect(await contadorDe(cliente, EMAIL)).toBe(5);
    });
  });

  it("CA-SEG-09 — Retry-After arredonda para cima e nunca é zero", async () => {
    await comBanco(async ({ prisma }) => {
      const quaseNoFim = new Date("2026-11-12T12:07:59.400Z");
      for (let i = 0; i < LIMITES.mutacao_usuario.limite; i += 1) {
        await consumir(prisma, USUARIO, { agora: quaseNoFim });
      }

      const recusa = await consumir(prisma, USUARIO, { agora: quaseNoFim }).catch(
        (erro: unknown) => erro,
      );

      expect((recusa as ErroLimiteExcedido).segundos).toBe(1);
    });
  });

  it("CA-SEG-09 — tentativas simultâneas não passam do limite e as recusadas não consomem", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { aceitas, recusas } = await resultados(
        Array.from({ length: 20 }, () => consumir(prisma, EMAIL, { agora: AGORA })),
      );

      expect(recusas.filter((erro) => !(erro instanceof ErroLimiteExcedido))).toEqual([]);
      expect(aceitas).toBe(5);
      expect(recusas).toHaveLength(15);
      expect(await contadorDe(cliente, EMAIL)).toBe(5);
    });
  });

  it("CA-SEG-15 — contador expirado ainda na tabela não bloqueia nem soma à janela atual", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      for (let i = 0; i < LIMITES.login_email.limite; i += 1) {
        await consumir(prisma, EMAIL, { agora: AGORA });
      }
      // A linha cheia da janela anterior ainda está na tabela quando a próxima janela começa: o
      // INSERT da janela nova roda antes da limpeza, na mesma transação.
      const reserva = await consumir(prisma, EMAIL, { agora: QUINZE_MIN_DEPOIS });

      expect(reserva.janelaInicio).toEqual(new Date("2026-11-12T12:15:00Z"));
      expect(await linhas(cliente)).toEqual([
        expect.objectContaining({ janela: "2026-11-12T12:15:00Z", contador: 1 }),
      ]);
    });
  });

  it("CA-SEG-15 — uma janela nova começa do zero mesmo antes da limpeza", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      // Linha cheia e expirada inserida à mão, como se a limpeza ainda não tivesse passado.
      await cliente.query(
        `INSERT INTO limites_requisicao VALUES ($1, $2, '2026-11-12T11:45:00Z', '2026-11-12T12:00:00Z', 5)`,
        [EMAIL.escopo, EMAIL.identificador],
      );

      await expect(consumir(prisma, EMAIL, { agora: AGORA })).resolves.toMatchObject({
        janelaInicio: new Date("2026-11-12T12:00:00Z"),
      });
      expect(await contadorDe(cliente, EMAIL)).toBe(1);
    });
  });
});

describe("limpeza oportunística", () => {
  it("CA-SEG-15 — cada escrita remove no máximo o lote de linhas expiradas e preserva as atuais", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await consumir(prisma, USUARIO, { agora: AGORA });
      await inserirExpiradas(cliente, LOTE_LIMPEZA + 50);

      await consumir(prisma, IP_MUTACAO, { agora: AGORA });
      const depoisDaPrimeira = await linhas(cliente);
      await consumir(prisma, IP_MUTACAO, { agora: AGORA });
      const depoisDaSegunda = await linhas(cliente);

      expect(depoisDaPrimeira).toHaveLength(50 + 2);
      expect(depoisDaSegunda).toEqual([
        expect.objectContaining({ escopo: "mutacao_ip", identificador: IP_MUTACAO.identificador, contador: 2 }),
        expect.objectContaining({ escopo: "mutacao_usuario", identificador: USUARIO.identificador, contador: 1 }),
      ]);
    });
  });

  it("CA-SEG-15 — a devolução também limpa expiradas", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reserva = await consumir(prisma, EMAIL, { agora: AGORA });
      await inserirExpiradas(cliente, 10);

      await devolver(prisma, reserva, { agora: AGORA });

      expect(await linhas(cliente)).toEqual([
        expect.objectContaining({ identificador: EMAIL.identificador, contador: 0 }),
      ]);
    });
  });
});

describe("consumirJuntos", () => {
  it("CA-SEG-09 — consome os dois contadores e devolve as reservas na ordem pedida", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reservas = await consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA });

      expect(reservas.map((reserva) => reserva.escopo)).toEqual(["login_ip", "login_email"]);
      expect(await contadorDe(cliente, IP_LOGIN)).toBe(1);
      expect(await contadorDe(cliente, EMAIL)).toBe(1);
    });
  });

  it("CA-SEG-09 — e-mail no limite não consome o IP", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await cliente.query(
        `INSERT INTO limites_requisicao VALUES ($1, $2, '2026-11-12T12:00:00Z', '2026-11-12T12:15:00Z', 5)`,
        [EMAIL.escopo, EMAIL.identificador],
      );

      await expect(
        consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA }),
      ).rejects.toBeInstanceOf(ErroLimiteExcedido);
      expect(await contadorDe(cliente, IP_LOGIN)).toBe(0);
      expect(await contadorDe(cliente, EMAIL)).toBe(5);
    });
  });

  it("CA-SEG-09 — IP no limite não consome o e-mail", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await cliente.query(
        `INSERT INTO limites_requisicao VALUES ($1, $2, '2026-11-12T12:00:00Z', '2026-11-12T12:15:00Z', 100)`,
        [IP_LOGIN.escopo, IP_LOGIN.identificador],
      );

      await expect(
        consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA }),
      ).rejects.toBeInstanceOf(ErroLimiteExcedido);
      expect(await contadorDe(cliente, EMAIL)).toBe(0);
      expect(await contadorDe(cliente, IP_LOGIN)).toBe(100);
    });
  });

  it("CA-SEG-09 — chamadas simultâneas: os dois contadores param juntos no menor limite", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      // Conexões abertas antes da rajada: o que se mede é o contador, não a abertura de conexões,
      // que numa máquina carregada passa do `maxWait` do Prisma e falha fechada (503).
      await aquecer(prisma, 12);

      const { aceitas, recusas } = await resultados(
        Array.from({ length: 12 }, () =>
          consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA }),
        ),
      );

      expect(recusas.filter((erro) => !(erro instanceof ErroLimiteExcedido))).toEqual([]);
      expect(aceitas).toBe(5);
      expect(await contadorDe(cliente, EMAIL)).toBe(5);
      expect(await contadorDe(cliente, IP_LOGIN)).toBe(5);
    });
  });

  it("CA-SEG-09 — ordens diferentes, ao mesmo tempo, não travam em ciclo", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { aceitas, recusas } = await resultados(
        Array.from({ length: 20 }, (_, i) =>
          consumirJuntos(prisma, i % 2 ? [USUARIO, IP_MUTACAO] : [IP_MUTACAO, USUARIO], {
            agora: AGORA,
          }),
        ),
      );

      expect(recusas).toEqual([]);
      expect(aceitas).toBe(20);
      expect(await contadorDe(cliente, USUARIO)).toBe(20);
    });
  });
});

describe("devolver", () => {
  it("P2 — devolve a vaga na janela da reserva", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reservas = await Promise.all(
        Array.from({ length: 5 }, () => consumir(prisma, EMAIL, { agora: AGORA })),
      );

      await devolver(prisma, reservas[0]!, { agora: AGORA });

      expect(await contadorDe(cliente, EMAIL)).toBe(4);
      await expect(consumir(prisma, EMAIL, { agora: AGORA })).resolves.toBeDefined();
    });
  });

  it("P2 — nunca desce abaixo de zero", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reserva = await consumir(prisma, EMAIL, { agora: AGORA });

      await devolver(prisma, reserva, { agora: AGORA });
      await devolver(prisma, reserva, { agora: AGORA });

      expect(await contadorDe(cliente, EMAIL)).toBe(0);
    });
  });

  it("P2 — devolução de reserva de janela já encerrada não mexe na janela atual", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const antiga = await consumir(prisma, EMAIL, { agora: AGORA });
      await consumir(prisma, EMAIL, { agora: QUINZE_MIN_DEPOIS });

      await devolver(prisma, antiga, { agora: QUINZE_MIN_DEPOIS });

      expect(await linhas(cliente)).toEqual([
        expect.objectContaining({ janela: "2026-11-12T12:15:00Z", contador: 1 }),
      ]);
    });
  });
});

describe("falha fechada", () => {
  it("CA-SEG-12 — sem a tabela, consumir, consumirJuntos e devolver lançam ErroLimiteIndisponivel", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const reserva = await consumir(prisma, EMAIL, { agora: AGORA });
      await cliente.query("DROP TABLE limites_requisicao");

      await expect(consumir(prisma, EMAIL, { agora: AGORA })).rejects.toBeInstanceOf(
        ErroLimiteIndisponivel,
      );
      await expect(
        consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA }),
      ).rejects.toBeInstanceOf(ErroLimiteIndisponivel);
      await expect(devolver(prisma, reserva, { agora: AGORA })).rejects.toBeInstanceOf(
        ErroLimiteIndisponivel,
      );
    });
  });

  it("CA-SEG-12 — banco inacessível lança ErroLimiteIndisponivel, sem detalhe nem causa", async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg("postgresql://ninguem:nada@127.0.0.1:1/inexistente"),
    });
    try {
      const erro = await consumir(prisma, EMAIL, { agora: AGORA }).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroLimiteIndisponivel);
      expect((erro as Error).message).toBe("Limitador de requisições indisponível.");
      expect((erro as Error).cause).toBeUndefined();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("CA-SEG-12 — falha no meio da transação desfaz o que já tinha sido consumido", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      // Um identificador fora do formato quebra a CHECK do segundo contador.
      const invalido: Contador = { escopo: "login_ip", identificador: "nao-hex" };

      await expect(
        consumirJuntos(prisma, [EMAIL, invalido], { agora: AGORA }),
      ).rejects.toBeInstanceOf(ErroLimiteIndisponivel);
      expect(await linhas(cliente)).toEqual([]);
    });
  });
});

describe("logs", () => {
  it("CA-SEG-13 — nenhum caminho do contador escreve no console", async () => {
    const espioes = (["log", "info", "warn", "error", "debug"] as const).map((metodo) =>
      vi.spyOn(console, metodo).mockImplementation(() => undefined),
    );

    await comBanco(async ({ prisma, cliente }) => {
      const reservas = await consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA });
      await devolver(prisma, reservas[1]!, { agora: AGORA });
      await cliente.query(
        `UPDATE limites_requisicao SET contador = 5 WHERE escopo = 'login_email'`,
      );
      await consumirJuntos(prisma, [IP_LOGIN, EMAIL], { agora: AGORA }).catch(() => undefined);
      await cliente.query("DROP TABLE limites_requisicao");
      await consumir(prisma, EMAIL, { agora: AGORA }).catch(() => undefined);
    });

    for (const espiao of espioes) expect(espiao).not.toHaveBeenCalled();
  });
});
