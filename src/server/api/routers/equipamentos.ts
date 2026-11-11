import { TRPCError } from "@trpc/server";

import { lerAmbientePublico } from "@/env";
import {
  esquemaCadastroEquipamento,
  esquemaDetalheEquipamento,
  esquemaEntradaAlterarSituacao,
  esquemaEntradaDetalharEquipamento,
  esquemaEntradaListarEquipamentos,
  esquemaSaidaAlterarSituacao,
  esquemaSaidaCadastroEquipamento,
  esquemaSaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { naoImplementadoOperacoes } from "@/server/api/routers/operacoes";
import { ErroComMotivo, adminProcedure, criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import {
  ErroEquipamentoNaoEncontrado,
  ErroPatrimonioDuplicado,
  cadastrarEquipamento,
  detalharEquipamento,
  listarEquipamentos,
} from "@/server/services/equipamentos";

export const MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO = "Equipamento não encontrado.";
export const MENSAGEM_PATRIMONIO_DUPLICADO = "Já existe equipamento com este patrimônio.";

export const routerEquipamentos = criarRouterTRPC({
  // RF-CATALOGO-01, RS-CATALOGO-01: tenant e papel vêm do contexto, nunca do input.
  listar: tenantProcedure
    .input(esquemaEntradaListarEquipamentos)
    .output(esquemaSaidaListarEquipamentos)
    .query(({ ctx, input }) =>
      listarEquipamentos(
        ctx.obterClientePrisma(),
        { tenantId: ctx.tenantId, papel: ctx.papel },
        input,
        { urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL },
      ),
    ),

  // RF-SOLIC-01: detalhe por patrimônio no tenant da sessão, com campos por papel.
  detalhar: tenantProcedure
    .input(esquemaEntradaDetalharEquipamento)
    .output(esquemaDetalheEquipamento)
    .query(async ({ ctx, input }) => {
      try {
        return await detalharEquipamento(
          ctx.obterClientePrisma(),
          { tenantId: ctx.tenantId, papel: ctx.papel },
          input.patrimonio,
          { urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL, agora: new Date() },
        );
      } catch (erro) {
        if (erro instanceof ErroEquipamentoNaoEncontrado) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO,
            cause: new ErroComMotivo("EQUIPAMENTO_NAO_ENCONTRADO"),
          });
        }
        throw erro;
      }
    }),

  // Spec 008: só Operações (RS-OPER-01). RF-OPER-05: o mesmo esquema do formulário valida aqui.
  cadastrar: adminProcedure
    .input(esquemaCadastroEquipamento)
    .output(esquemaSaidaCadastroEquipamento)
    .mutation(async ({ ctx, input }) => {
      try {
        return await cadastrarEquipamento(
          ctx.obterClientePrisma(),
          { tenantId: ctx.tenantId, ator: ctx.usuarioId },
          input,
        );
      } catch (erro) {
        if (erro instanceof ErroPatrimonioDuplicado) {
          throw new TRPCError({
            code: "CONFLICT",
            message: MENSAGEM_PATRIMONIO_DUPLICADO,
            cause: new ErroComMotivo("PATRIMONIO_DUPLICADO"),
          });
        }
        throw erro;
      }
    }),
  // Responde `NOT_IMPLEMENTED` até a T-OPER-05.
  alterarSituacao: adminProcedure
    .input(esquemaEntradaAlterarSituacao)
    .output(esquemaSaidaAlterarSituacao)
    .mutation(naoImplementadoOperacoes),
});
