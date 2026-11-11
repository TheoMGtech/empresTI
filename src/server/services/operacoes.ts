import type { PrismaClient } from "@prisma/client";

import { LIMITE_PADRAO_LISTAGEM } from "@/lib/esquemas/equipamentos";
import {
  QUANTIDADE_ULTIMOS_CADASTROS,
  type EntradaEmprestimosEmAberto,
  type ResumoOperacoes,
  type SaidaEmprestimosEmAberto,
  type UltimoCadastro,
} from "@/lib/esquemas/operacoes";
import { dataEmSaoPaulo, formatarDataDoBanco, somarDias } from "@/lib/prazos";
import { montarUrlImagem } from "@/server/services/equipamentos";

/** Janela de "Vencendo em 3 dias" (RF-OPER-02, D-OPER-05). */
export const JANELA_CARD_DIAS = 3;
/** Janela de "Vencem esta semana" (RF-OPER-03, DF-20, D-OPER-05). */
export const JANELA_SEMANA_DIAS = 7;

/** Data AAAA-MM-DD como valor da coluna `DATE` no Prisma (meia-noite UTC). */
const comoDataDoBanco = (data: string) => new Date(`${data}T00:00:00Z`);

/**
 * Janelas de vencimento a partir da data de hoje em São Paulo (D-OPER-05): atrasado é
 * `devolver_ate` antes de hoje (RN-REGRAS-06); "vence em N dias" vai de hoje até hoje + N,
 * inclusive, e por isso nunca inclui atrasados.
 */
function janelas(agora: Date) {
  const hoje = dataEmSaoPaulo(agora);
  return {
    hoje: comoDataDoBanco(hoje),
    emAtraso: { lt: comoDataDoBanco(hoje) },
    venceEm: (dias: number) => ({
      gte: comoDataDoBanco(hoje),
      lte: comoDataDoBanco(somarDias(hoje, dias)),
    }),
  };
}

/**
 * Empréstimos em aberto do tenant (RF-OPER-01), do vencimento mais antigo ao mais distante, com os
 * chips da tela (RF-OPER-03) e cursor no `id` do último item. Traz só o nome de exibição de quem
 * está com o item (DF-5, D-OPER-05).
 */
export async function listarEmprestimosEmAberto(
  prisma: Pick<PrismaClient, "emprestimo">,
  tenantId: string,
  entrada: EntradaEmprestimosEmAberto,
  opcoes: { agora: Date; urlSupabase: string },
): Promise<SaidaEmprestimosEmAberto> {
  const limite = entrada.limite ?? LIMITE_PADRAO_LISTAGEM;
  const { hoje, emAtraso, venceEm } = janelas(opcoes.agora);

  const recorte = {
    AND: [
      { tenantId, devolvidoEm: null },
      entrada.filtro === "em_atraso" ? { devolverAte: emAtraso } : {},
      entrada.filtro === "vencem_7_dias" ? { devolverAte: venceEm(JANELA_SEMANA_DIAS) } : {},
      entrada.categoria ? { equipamento: { categoria: entrada.categoria } } : {},
    ],
  };

  let depoisDoCursor = {};
  if (entrada.cursor) {
    const ancora = await prisma.emprestimo.findFirst({
      where: { AND: [recorte, { id: entrada.cursor }] },
      select: { id: true, devolverAte: true },
    });
    if (!ancora) return { itens: [], proximoCursor: null };
    depoisDoCursor = {
      OR: [
        { devolverAte: { gt: ancora.devolverAte } },
        { devolverAte: ancora.devolverAte, id: { gt: ancora.id } },
      ],
    };
  }

  const registros = await prisma.emprestimo.findMany({
    where: { AND: [recorte, depoisDoCursor] },
    orderBy: [{ devolverAte: "asc" }, { id: "asc" }],
    take: limite + 1,
    select: {
      id: true,
      retiradoEm: true,
      devolverAte: true,
      equipamento: {
        select: { patrimonio: true, nome: true, categoria: true, imagemCaminho: true },
      },
      membership: { select: { nomeExibicao: true } },
    },
  });

  const pagina = registros.slice(0, limite);
  return {
    itens: pagina.map((emprestimo) => {
      const nome = emprestimo.membership.nomeExibicao?.trim();
      return {
        id: emprestimo.id,
        equipamento: {
          patrimonio: emprestimo.equipamento.patrimonio,
          nome: emprestimo.equipamento.nome,
          categoria: emprestimo.equipamento.categoria,
          imagemUrl: montarUrlImagem(opcoes.urlSupabase, emprestimo.equipamento.imagemCaminho),
        },
        pessoa: { nomeExibicao: nome ? nome : null },
        retiradoEm: emprestimo.retiradoEm,
        devolverAte: formatarDataDoBanco(emprestimo.devolverAte),
        emAtraso: emprestimo.devolverAte < hoje,
      };
    }),
    proximoCursor: registros.length > limite ? (pagina.at(-1)?.id ?? null) : null,
  };
}

/** Cards de estatística do tenant (RF-OPER-02), com as janelas de D-OPER-05. */
export async function consultarResumoOperacoes(
  prisma: Pick<PrismaClient, "emprestimo" | "equipamento">,
  tenantId: string,
  opcoes: { agora: Date },
): Promise<ResumoOperacoes> {
  const { emAtraso, venceEm } = janelas(opcoes.agora);
  const abertos = { tenantId, devolvidoEm: null };

  const [emAberto, vencendoEm3Dias, atrasados, emManutencao] = await Promise.all([
    prisma.emprestimo.count({ where: abertos }),
    prisma.emprestimo.count({ where: { ...abertos, devolverAte: venceEm(JANELA_CARD_DIAS) } }),
    prisma.emprestimo.count({ where: { ...abertos, devolverAte: emAtraso } }),
    prisma.equipamento.count({ where: { tenantId, situacao: "em_manutencao" } }),
  ]);

  return { emAberto, vencendoEm3Dias, emAtraso: atrasados, emManutencao };
}

/** Os 3 equipamentos cadastrados mais recentemente no tenant (RF-OPER-08, CA-OPER-10). */
export async function listarUltimosCadastros(
  prisma: Pick<PrismaClient, "equipamento">,
  tenantId: string,
): Promise<UltimoCadastro[]> {
  return prisma.equipamento.findMany({
    where: { tenantId },
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    take: QUANTIDADE_ULTIMOS_CADASTROS,
    select: { patrimonio: true, nome: true, criadoEm: true },
  });
}
