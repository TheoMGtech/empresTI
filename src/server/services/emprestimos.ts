import { Prisma, type PrismaClient } from "@prisma/client";

import {
  LIMITE_ITENS_POR_PESSOA,
  type EmprestimoAberto,
  type EntradaHistorico,
  type MeuResumo,
  type MotivoSolicitacao,
  type SaidaHistorico,
  type SaidaSolicitarEmprestimo,
} from "@/lib/esquemas/emprestimos";
import { LIMITE_PADRAO_LISTAGEM, type Categoria } from "@/lib/esquemas/equipamentos";
import type { Papel } from "@/lib/esquemas/sessao";
import {
  PRAZO_PADRAO_DIAS,
  calcularDevolverAte,
  dataEmSaoPaulo,
  formatarDataDoBanco,
} from "@/lib/prazos";
import { montarUrlImagem } from "@/server/services/equipamentos";

/** Ação gravada na auditoria pela solicitação (RS-SOLIC-04). */
export const ACAO_SOLICITAR = "emprestimo.solicitar";

export class ErroSolicitacao extends Error {
  constructor(readonly motivo: MotivoSolicitacao) {
    super(motivo);
    this.name = "ErroSolicitacao";
  }
}

export type EscopoSolicitacao = { tenantId: string; usuarioId: string; papel: Papel };

/** Recurso auditado: o empréstimo criado. */
export const recursoEmprestimo = (id: string) => `emprestimo:${id}`;

function eViolacaoDeUnicidade(erro: unknown) {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

type Pessoa = { tenantId: string; usuarioId: string };

/**
 * Empréstimos abertos da pessoa no tenant e quantos estão em atraso (RS-REGRAS-02). O atraso começa
 * depois do fim da data de vencimento no calendário de São Paulo (RN-REGRAS-06): está atrasado o
 * empréstimo aberto com `devolver_ate` anterior à data de hoje. Atrasados contam no limite
 * (RN-REGRAS-05).
 */
async function situacaoDaPessoa(
  cliente: Pick<PrismaClient, "emprestimo">,
  pessoa: Pessoa,
  agora: Date,
) {
  const abertos = { tenantId: pessoa.tenantId, userId: pessoa.usuarioId, devolvidoEm: null };
  const hoje = new Date(`${dataEmSaoPaulo(agora)}T00:00:00Z`);

  const itensAbertos = await cliente.emprestimo.count({ where: abertos });
  const emAtraso = await cliente.emprestimo.count({
    where: { ...abertos, devolverAte: { lt: hoje } },
  });
  return { itensAbertos, emAtraso };
}

/** Resumo da própria pessoa para a interface (RF-REGRAS-01). `agora` é injetado (CA-REGRAS-09). */
export async function consultarMeuResumo(
  prisma: Pick<PrismaClient, "emprestimo">,
  pessoa: Pessoa,
  opcoes: { agora: Date },
): Promise<MeuResumo> {
  const { itensAbertos, emAtraso } = await situacaoDaPessoa(prisma, pessoa, opcoes.agora);
  return { itensAbertos, limite: LIMITE_ITENS_POR_PESSOA, emAtraso, prazoDias: PRAZO_PADRAO_DIAS };
}

/**
 * Empréstimo imediato de um equipamento do tenant da sessão (RF-SOLIC-02, RN-SOLIC-05). Leitura do
 * equipamento, inserção e auditoria ocorrem na mesma transação (RS-SOLIC-04): se a auditoria
 * falhar, nada é gravado (CA-SOLIC-07). O índice único parcial garante um único empréstimo aberto
 * por equipamento, mesmo com solicitações simultâneas (RN-SOLIC-02, CA-SOLIC-03). O limite de
 * itens por pessoa (RN-REGRAS-01) é contado depois de bloquear o membership (CA-REGRAS-02).
 * `agora` é o momento da confirmação: retirada e prazo saem dele (RN-SOLIC-03).
 */
export async function solicitarEmprestimo(
  prisma: Pick<PrismaClient, "$transaction">,
  escopo: EscopoSolicitacao,
  equipamentoId: string,
  opcoes: { agora: Date },
): Promise<SaidaSolicitarEmprestimo> {
  const devolverAte = calcularDevolverAte(opcoes.agora);

  try {
    return await prisma.$transaction(async (transacao) => {
      // Serializa as solicitações da mesma pessoa antes de contar (plano da Spec 006): sem o
      // bloqueio, pedidos simultâneos leriam a mesma contagem e ultrapassariam o limite.
      await transacao.$queryRaw`
        SELECT 1 FROM "memberships"
         WHERE "user_id" = ${escopo.usuarioId}::uuid AND "tenant_id" = ${escopo.tenantId}::uuid
         FOR UPDATE`;

      // Ordem da Spec 006: atraso, limite, depois as recusas da Spec 005.
      const { itensAbertos, emAtraso } = await situacaoDaPessoa(transacao, escopo, opcoes.agora);
      if (emAtraso > 0) throw new ErroSolicitacao("ITEM_EM_ATRASO");
      if (itensAbertos >= LIMITE_ITENS_POR_PESSOA) throw new ErroSolicitacao("LIMITE_ATINGIDO");

      // Trava compartilhada na linha do equipamento: uma alteração de situação simultânea
      // (`equipamentos.alterarSituacao`, que usa FOR UPDATE) espera esta transação, e vice-versa.
      // Assim, item em manutenção nunca termina com empréstimo aberto (CA-OPER-07, CA-OPER-09).
      await transacao.$queryRaw`
        SELECT 1 FROM "equipamentos"
         WHERE "id" = ${equipamentoId}::uuid AND "tenant_id" = ${escopo.tenantId}::uuid
         FOR SHARE`;

      const equipamento = await transacao.equipamento.findFirst({
        where: { id: equipamentoId, tenantId: escopo.tenantId },
        select: { situacao: true },
      });

      // Outro tenant ou inexistente; `fora_de_uso` não existe para colaborador (RN-SOLIC-07).
      if (
        !equipamento ||
        (equipamento.situacao === "fora_de_uso" && escopo.papel !== "operacoes")
      ) {
        throw new ErroSolicitacao("EQUIPAMENTO_NAO_ENCONTRADO");
      }
      if (equipamento.situacao === "em_manutencao") {
        throw new ErroSolicitacao("EQUIPAMENTO_EM_MANUTENCAO");
      }
      if (equipamento.situacao !== "ativo") {
        throw new ErroSolicitacao("EQUIPAMENTO_INDISPONIVEL");
      }

      const aberto = await transacao.emprestimo.findFirst({
        where: { tenantId: escopo.tenantId, equipamentoId, devolvidoEm: null },
        select: { id: true },
      });
      if (aberto) throw new ErroSolicitacao("EQUIPAMENTO_INDISPONIVEL");

      const emprestimo = await transacao.emprestimo.create({
        data: {
          tenantId: escopo.tenantId,
          equipamentoId,
          userId: escopo.usuarioId,
          retiradoEm: opcoes.agora,
          devolverAte: new Date(`${devolverAte}T00:00:00Z`),
        },
        select: { id: true },
      });

      await transacao.auditoria.create({
        data: {
          tenantId: escopo.tenantId,
          ator: escopo.usuarioId,
          acao: ACAO_SOLICITAR,
          recurso: recursoEmprestimo(emprestimo.id),
        },
      });

      return { id: emprestimo.id, devolverAte };
    });
  } catch (erro) {
    // Duas confirmações simultâneas: a segunda esbarra no índice único parcial.
    if (eViolacaoDeUnicidade(erro)) throw new ErroSolicitacao("EQUIPAMENTO_INDISPONIVEL");
    throw erro;
  }
}

// ---------------------------------------------------------------------------------------------
// Spec 007 — consultas da própria pessoa.

const EQUIPAMENTO_RESUMIDO = {
  select: { patrimonio: true, nome: true, categoria: true, imagemCaminho: true },
} as const;

function resumirEquipamento(
  equipamento: {
    patrimonio: string;
    nome: string;
    categoria: Categoria;
    imagemCaminho: string | null;
  },
  urlSupabase: string,
) {
  return {
    patrimonio: equipamento.patrimonio,
    nome: equipamento.nome,
    categoria: equipamento.categoria,
    imagemUrl: montarUrlImagem(urlSupabase, equipamento.imagemCaminho),
  };
}

/**
 * Empréstimos em aberto da própria pessoa no tenant da sessão (RF-DEVOL-01), do vencimento mais
 * próximo para o mais distante. `emAtraso` segue a regra da Spec 006, no fuso de São Paulo.
 */
export async function listarMeusEmprestimos(
  prisma: Pick<PrismaClient, "emprestimo">,
  pessoa: Pessoa,
  opcoes: { agora: Date; urlSupabase: string },
): Promise<EmprestimoAberto[]> {
  const hoje = dataEmSaoPaulo(opcoes.agora);
  const abertos = await prisma.emprestimo.findMany({
    where: { tenantId: pessoa.tenantId, userId: pessoa.usuarioId, devolvidoEm: null },
    orderBy: [{ devolverAte: "asc" }, { retiradoEm: "asc" }, { id: "asc" }],
    select: { id: true, retiradoEm: true, devolverAte: true, equipamento: EQUIPAMENTO_RESUMIDO },
  });

  return abertos.map((emprestimo) => {
    const devolverAte = formatarDataDoBanco(emprestimo.devolverAte);
    return {
      id: emprestimo.id,
      equipamento: resumirEquipamento(emprestimo.equipamento, opcoes.urlSupabase),
      retiradoEm: emprestimo.retiradoEm,
      devolverAte,
      emAtraso: devolverAte < hoje,
    };
  });
}

/**
 * Empréstimos encerrados da própria pessoa (RF-DEVOL-02), do mais recente para o mais antigo, por
 * cursor no `id` do último item. O cursor só vale dentro do histórico da própria pessoa: um cursor
 * de outra pessoa ou de outro tenant devolve página vazia. `noPrazo` compara a data da devolução
 * em São Paulo com `devolverAte` (RF-DEVOL-05).
 */
export async function listarHistorico(
  prisma: Pick<PrismaClient, "emprestimo">,
  pessoa: Pessoa,
  entrada: EntradaHistorico,
  opcoes: { urlSupabase: string },
): Promise<SaidaHistorico> {
  const limite = entrada.limite ?? LIMITE_PADRAO_LISTAGEM;
  const encerrados = {
    tenantId: pessoa.tenantId,
    userId: pessoa.usuarioId,
    devolvidoEm: { not: null },
  };

  let depoisDoCursor = {};
  if (entrada.cursor) {
    const ancora = await prisma.emprestimo.findFirst({
      where: { ...encerrados, id: entrada.cursor },
      select: { id: true, devolvidoEm: true },
    });
    if (!ancora?.devolvidoEm) return { itens: [], proximoCursor: null };
    depoisDoCursor = {
      OR: [
        { devolvidoEm: { lt: ancora.devolvidoEm } },
        { devolvidoEm: ancora.devolvidoEm, id: { lt: ancora.id } },
      ],
    };
  }

  const registros = await prisma.emprestimo.findMany({
    where: { AND: [encerrados, depoisDoCursor] },
    orderBy: [{ devolvidoEm: "desc" }, { id: "desc" }],
    take: limite + 1,
    select: {
      id: true,
      retiradoEm: true,
      devolverAte: true,
      devolvidoEm: true,
      equipamento: EQUIPAMENTO_RESUMIDO,
    },
  });

  const pagina = registros.slice(0, limite);
  return {
    itens: pagina.map((emprestimo) => {
      const devolverAte = formatarDataDoBanco(emprestimo.devolverAte);
      const devolvidoEm = emprestimo.devolvidoEm as Date;
      return {
        id: emprestimo.id,
        equipamento: resumirEquipamento(emprestimo.equipamento, opcoes.urlSupabase),
        retiradoEm: emprestimo.retiradoEm,
        devolverAte,
        devolvidoEm,
        noPrazo: dataEmSaoPaulo(devolvidoEm) <= devolverAte,
      };
    }),
    proximoCursor: registros.length > limite ? (pagina.at(-1)?.id ?? null) : null,
  };
}
