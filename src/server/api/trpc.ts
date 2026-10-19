import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export function criarContextoTRPC() {
  return {};
}

const t = initTRPC.context<Awaited<ReturnType<typeof criarContextoTRPC>>>().create({
  transformer: superjson,
});

export const criarRouterTRPC = t.router;
export const procedimentoPublico = t.procedure;
