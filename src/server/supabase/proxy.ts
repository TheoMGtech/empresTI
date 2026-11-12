import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { lerAmbientePublico } from "@/env";
import { CABECALHO_CSP, CABECALHO_NONCE } from "@/server/seguranca/csp";

const opcoesSeguras: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

/** CSP desta requisição e o nonce que ela autoriza (Spec 009, RF-SEG-01 e RF-SEG-06). */
export type SegurancaDaRequisicao = { nonce: string; csp: string };

export async function atualizarSessao(
  requisicao: NextRequest,
  { nonce, csp }: SegurancaDaRequisicao,
) {
  // Cabeçalhos repassados à renderização: copiados no momento da chamada, para levar os cookies
  // que `setAll` acabou de gravar em `requisicao.cookies`, mais a CSP, de onde o Next extrai o
  // nonce dos próprios scripts.
  const cabecalhosParaONext = () => {
    const cabecalhos = new Headers(requisicao.headers);
    cabecalhos.set(CABECALHO_NONCE, nonce);
    cabecalhos.set(CABECALHO_CSP, csp);
    return cabecalhos;
  };

  let resposta = NextResponse.next({ request: { headers: cabecalhosParaONext() } });
  const ambiente = lerAmbientePublico();

  const supabase = createServerClient(
    ambiente.NEXT_PUBLIC_SUPABASE_URL,
    ambiente.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: opcoesSeguras,
      cookies: {
        getAll: () => requisicao.cookies.getAll(),
        setAll: (cookiesParaDefinir) => {
          for (const cookie of cookiesParaDefinir) {
            requisicao.cookies.set(cookie.name, cookie.value);
          }

          resposta = NextResponse.next({ request: { headers: cabecalhosParaONext() } });

          for (const cookie of cookiesParaDefinir) {
            resposta.cookies.set(cookie.name, cookie.value, {
              ...cookie.options,
              ...opcoesSeguras,
            });
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  resposta.headers.set("Cache-Control", "private, no-store");
  // A mesma política da renderização vai na resposta, em modo aplicado (RF-SEG-01).
  resposta.headers.set(CABECALHO_CSP, csp);

  return resposta;
}
