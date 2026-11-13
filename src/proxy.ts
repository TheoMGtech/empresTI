import type { NextRequest } from "next/server";

import { lerAmbientePublico } from "@/env";
import { gerarNonce, montarCsp } from "@/server/seguranca/csp";
import { atualizarSessao } from "@/server/supabase/proxy";

export async function proxy(requisicao: NextRequest) {
  // Nonce novo a cada requisição (Spec 009, RF-SEG-01 e RS-SEG-06).
  const nonce = gerarNonce();
  const csp = montarCsp({
    nonce,
    desenvolvimento: process.env.NODE_ENV === "development",
    urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL,
  });

  return atualizarSessao(requisicao, { nonce, csp });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
