import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import { obterClientePrisma } from "@/server/db";

export function criarContextoTRPC() {
  return { obterClientePrisma };
}

const t = initTRPC.context<Awaited<ReturnType<typeof criarContextoTRPC>>>().create({
  transformer: superjson,
});

export const criarRouterTRPC = t.router;
export const procedimentoPublico = t.procedure;
