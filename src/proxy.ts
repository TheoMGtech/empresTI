import type { NextRequest } from "next/server";

import { atualizarSessao } from "@/server/supabase/proxy";

export async function proxy(requisicao: NextRequest) {
  return atualizarSessao(requisicao);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
