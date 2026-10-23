import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import { obterClientePrisma } from "@/server/db";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { criarClienteSupabaseServidor } from "@/server/supabase/cliente";

const obterClienteSupabase = async (): Promise<ClienteSupabaseAutenticacao> =>
  criarClienteSupabaseServidor();

export function criarContextoTRPC() {
  return {
    obterClientePrisma,
    obterClienteSupabase,
  };
}

const t = initTRPC.context<Awaited<ReturnType<typeof criarContextoTRPC>>>().create({
  transformer: superjson,
});

export const criarRouterTRPC = t.router;
export const procedimentoPublico = t.procedure;
