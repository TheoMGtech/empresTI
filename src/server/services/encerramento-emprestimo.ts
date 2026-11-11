import type { PrismaClient } from "@prisma/client";

import type { MotivoDevolucao, SaidaDevolver } from "@/lib/esquemas/emprestimos";

/** Ação gravada na auditoria pelo encerramento (RS-DEVOL-03, RS-OPER-03). */
export const ACAO_DEVOLVER = "emprestimo.devolver";

/** Recurso auditado: o empréstimo encerrado (mesmo formato da solicitação). */
export const recursoEmprestimoEncerrado = (id: string) => `emprestimo:${id}`;

/** Empréstimo inexistente, de outro tenant ou, na devolução pela própria pessoa, de outra pessoa. */
export class ErroEmprestimoNaoEncontrado extends Error {}

export class ErroEncerramento extends Error {
  constructor(readonly motivo: MotivoDevolucao) {
    super(motivo);
    this.name = "ErroEncerramento";
  }
}

export type EscopoEncerramento = {
  tenantId: string;
  /** UUID de quem registra a devolução: vai para `devolvido_por` e para a auditoria. */
  ator: string;
  /**
   * Na devolução pela própria pessoa (Spec 007), só empréstimos dela. Operações (Spec 008) omite e
   * encerra qualquer empréstimo do tenant.
   */
  somenteDoTomador?: string;
};

/**
 * Serviço único de encerramento (RN-DEVOL-03), compartilhado por `emprestimos.devolver` e
 * `operacoes.registrarDevolucao`. O `UPDATE` é condicionado a `devolvido_em IS NULL` no tenant:
 * zero linhas afetadas vira `EMPRESTIMO_JA_ENCERRADO`, inclusive em devoluções simultâneas
 * (RN-DEVOL-02). A auditoria entra na mesma transação: se falhar, nada é encerrado (CA-DEVOL-07).
 * Ao encerrar, um item `ativo` volta a ser disponível, porque a disponibilidade é derivada
 * (RN-DEVOL-01).
 */
export async function encerrarEmprestimo(
  prisma: Pick<PrismaClient, "$transaction">,
  escopo: EscopoEncerramento,
  emprestimoId: string,
  opcoes: { agora: Date },
): Promise<SaidaDevolver> {
  return prisma.$transaction(async (transacao) => {
    const doEscopo = {
      id: emprestimoId,
      tenantId: escopo.tenantId,
      ...(escopo.somenteDoTomador ? { userId: escopo.somenteDoTomador } : {}),
    };

    const emprestimo = await transacao.emprestimo.findFirst({
      where: doEscopo,
      select: { devolvidoEm: true },
    });
    if (!emprestimo) throw new ErroEmprestimoNaoEncontrado();
    if (emprestimo.devolvidoEm) throw new ErroEncerramento("EMPRESTIMO_JA_ENCERRADO");

    const { count } = await transacao.emprestimo.updateMany({
      where: { ...doEscopo, devolvidoEm: null },
      data: { devolvidoEm: opcoes.agora, devolvidoPor: escopo.ator },
    });
    if (count === 0) throw new ErroEncerramento("EMPRESTIMO_JA_ENCERRADO");

    await transacao.auditoria.create({
      data: {
        tenantId: escopo.tenantId,
        ator: escopo.ator,
        acao: ACAO_DEVOLVER,
        recurso: recursoEmprestimoEncerrado(emprestimoId),
      },
    });

    return { id: emprestimoId, devolvidoEm: opcoes.agora };
  });
}
