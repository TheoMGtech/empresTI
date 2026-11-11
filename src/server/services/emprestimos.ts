import { Prisma, type PrismaClient } from "@prisma/client";

import type { MotivoSolicitacao, SaidaSolicitarEmprestimo } from "@/lib/esquemas/emprestimos";
import type { Papel } from "@/lib/esquemas/sessao";
import { calcularDevolverAte } from "@/lib/prazos";

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

/**
 * Empréstimo imediato de um equipamento do tenant da sessão (RF-SOLIC-02, RN-SOLIC-05). Leitura do
 * equipamento, inserção e auditoria ocorrem na mesma transação (RS-SOLIC-04): se a auditoria
 * falhar, nada é gravado (CA-SOLIC-07). O índice único parcial garante um único empréstimo aberto
 * por equipamento, mesmo com solicitações simultâneas (RN-SOLIC-02, CA-SOLIC-03).
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
