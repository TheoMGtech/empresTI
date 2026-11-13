import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { routerAplicacao } from "@/server/api/raiz";
import { criarContextoTRPC, metaRespostaLimite } from "@/server/api/trpc";

export const runtime = "nodejs";

function manipular(requisicao: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: requisicao,
    router: routerAplicacao,
    createContext: criarContextoTRPC,
    // Spec 009 (RF-SEG-11): `Retry-After` nas respostas 429.
    responseMeta: metaRespostaLimite,
  });
}

export { manipular as GET, manipular as POST };
