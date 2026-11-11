import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaSolicitarEmprestimo,
  esquemaMeuResumo,
  esquemaSaidaSolicitarEmprestimo,
  type MotivoSolicitacao,
} from "@/lib/esquemas/emprestimos";
import { ErroComMotivo, criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import { ErroSolicitacao, solicitarEmprestimo } from "@/server/services/emprestimos";

export const RECUSAS_SOLICITACAO: Record<
  MotivoSolicitacao,
  { code: "NOT_FOUND" | "CONFLICT"; message: string }
> = {
  EQUIPAMENTO_NAO_ENCONTRADO: { code: "NOT_FOUND", message: "Equipamento não encontrado." },
  EQUIPAMENTO_INDISPONIVEL: { code: "CONFLICT", message: "Equipamento indisponível." },
  EQUIPAMENTO_EM_MANUTENCAO: { code: "CONFLICT", message: "Equipamento em manutenção." },
  LIMITE_ATINGIDO: { code: "CONFLICT", message: "Limite de 3 itens atingido." },
  ITEM_EM_ATRASO: { code: "CONFLICT", message: "Há item em atraso. Devolva antes de pegar outro." },
};

export const MENSAGEM_RESUMO_NAO_IMPLEMENTADO = "Resumo ainda não disponível.";

export const routerEmprestimos = criarRouterTRPC({
  // Contrato publicado na T-REGRAS-01 (RF-REGRAS-01). Até a T-REGRAS-03 responde
  // `NOT_IMPLEMENTED` sem ler empréstimos.
  meuResumo: tenantProcedure.output(esquemaMeuResumo).query((): never => {
    throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_RESUMO_NAO_IMPLEMENTADO });
  }),

  // RF-SOLIC-02: recebe só o equipamento; usuário, tenant e prazo vêm do servidor (RS-SOLIC-01).
  // RN-SOLIC-06: colaborador e Operações podem solicitar.
  solicitar: tenantProcedure
    .input(esquemaEntradaSolicitarEmprestimo)
    .output(esquemaSaidaSolicitarEmprestimo)
    .mutation(async ({ ctx, input }) => {
      try {
        return await solicitarEmprestimo(
          ctx.obterClientePrisma(),
          { tenantId: ctx.tenantId, usuarioId: ctx.usuarioId, papel: ctx.papel },
          input.equipamentoId,
          { agora: new Date() },
        );
      } catch (erro) {
        if (erro instanceof ErroSolicitacao) {
          throw new TRPCError({
            ...RECUSAS_SOLICITACAO[erro.motivo],
            cause: new ErroComMotivo(erro.motivo),
          });
        }
        throw erro;
      }
    }),
});
