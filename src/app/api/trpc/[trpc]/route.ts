import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { routerAplicacao } from "@/server/api/raiz";
import { criarContextoTRPC } from "@/server/api/trpc";

export const runtime = "nodejs";

function manipular(requisicao: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: requisicao,
    router: routerAplicacao,
    createContext: criarContextoTRPC,
  });
}

export { manipular as GET, manipular as POST };
