import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaDevolver,
  esquemaEntradaHistorico,
  esquemaEntradaSolicitarEmprestimo,
  esquemaMeuResumo,
  esquemaSaidaDevolver,
  esquemaSaidaHistorico,
  esquemaSaidaMeusEmprestimos,
  esquemaSaidaSolicitarEmprestimo,
  type MotivoSolicitacao,
} from "@/lib/esquemas/emprestimos";
import { ErroComMotivo, criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import {
  ErroSolicitacao,
  consultarMeuResumo,
  solicitarEmprestimo,
} from "@/server/services/emprestimos";
import {
  ErroEmprestimoNaoEncontrado,
  ErroEncerramento,
  encerrarEmprestimo,
} from "@/server/services/encerramento-emprestimo";

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

export const MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO = "Empréstimo não encontrado.";
export const MENSAGEM_EMPRESTIMO_JA_ENCERRADO = "Este empréstimo já foi encerrado.";

/**
 * Traduz as recusas do serviço de encerramento para `TRPCError`; usado também por
 * `operacoes.registrarDevolucao` (RN-DEVOL-03). Outros erros seguem como estão.
 */
export function traduzirErroEncerramento(erro: unknown): unknown {
  if (erro instanceof ErroEmprestimoNaoEncontrado) {
    return new TRPCError({ code: "NOT_FOUND", message: MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO });
  }
  if (erro instanceof ErroEncerramento) {
    return new TRPCError({
      code: "CONFLICT",
      message: MENSAGEM_EMPRESTIMO_JA_ENCERRADO,
      cause: new ErroComMotivo(erro.motivo),
    });
  }
  return erro;
}

export const MENSAGEM_DEVOLUCAO_NAO_IMPLEMENTADA =
  "Meus empréstimos e histórico ainda não disponíveis.";

const naoImplementado = (): never => {
  throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_DEVOLUCAO_NAO_IMPLEMENTADA });
};

export const routerEmprestimos = criarRouterTRPC({
  // Contratos publicados na T-DEVOL-01 (Spec 007). Já exigem sessão e membership (RS-DEVOL-01);
  // `meus` e `historico` respondem `NOT_IMPLEMENTED` até a T-DEVOL-03.
  meus: tenantProcedure.output(esquemaSaidaMeusEmprestimos).query(naoImplementado),
  historico: tenantProcedure
    .input(esquemaEntradaHistorico)
    .output(esquemaSaidaHistorico)
    .query(naoImplementado),
  // RF-DEVOL-03: a própria pessoa encerra um empréstimo dela, em aberto (RS-DEVOL-02).
  devolver: tenantProcedure
    .input(esquemaEntradaDevolver)
    .output(esquemaSaidaDevolver)
    .mutation(async ({ ctx, input }) => {
      try {
        return await encerrarEmprestimo(
          ctx.obterClientePrisma(),
          { tenantId: ctx.tenantId, ator: ctx.usuarioId, somenteDoTomador: ctx.usuarioId },
          input.emprestimoId,
          { agora: new Date() },
        );
      } catch (erro) {
        throw traduzirErroEncerramento(erro);
      }
    }),

  // RF-REGRAS-01: itens abertos, limite, atrasados e prazo da própria pessoa (RS-REGRAS-02).
  meuResumo: tenantProcedure
    .output(esquemaMeuResumo)
    .query(({ ctx }) =>
      consultarMeuResumo(
        ctx.obterClientePrisma(),
        { tenantId: ctx.tenantId, usuarioId: ctx.usuarioId },
        { agora: new Date() },
      ),
    ),

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
