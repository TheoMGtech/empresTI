import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { lerAmbientePublico } from "@/env";

const opcoesSeguras: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export async function atualizarSessao(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });
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

          resposta = NextResponse.next({ request: requisicao });

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

  return resposta;
}
