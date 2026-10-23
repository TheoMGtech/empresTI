import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { lerAmbientePublico } from "@/env";

const OPCOES_SEGURAS: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export async function criarClienteSupabaseServidor() {
  const armazenamento = await cookies();
  const ambiente = lerAmbientePublico();

  return createServerClient(
    ambiente.NEXT_PUBLIC_SUPABASE_URL,
    ambiente.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: OPCOES_SEGURAS,
      cookies: {
        getAll: () => armazenamento.getAll(),
        setAll: (cookiesParaDefinir) => {
          for (const cookie of cookiesParaDefinir) {
            armazenamento.set(cookie.name, cookie.value, {
              ...cookie.options,
              ...OPCOES_SEGURAS,
            });
          }
        },
      },
    },
  );
}
