import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteSupabaseAutenticacao = {
  auth: Pick<SupabaseClient["auth"], "getUser" | "signInWithPassword" | "signOut">;
};

export class ErroCredenciaisInvalidas extends Error {}
export class ErroAutenticacaoIndisponivel extends Error {}

export async function entrar(
  cliente: ClienteSupabaseAutenticacao,
  credenciais: { email: string; senha: string },
) {
  const { data, error } = await cliente.auth.signInWithPassword({
    email: credenciais.email,
    password: credenciais.senha,
  });

  // Só `invalid_credentials` é erro de credencial; indisponibilidade ou limite de
  // requisições do Supabase não podem aparecer como "confira e-mail e senha".
  if (error?.code === "invalid_credentials") {
    throw new ErroCredenciaisInvalidas();
  }

  if (error || !data.user) {
    throw new ErroAutenticacaoIndisponivel();
  }

  return { autenticado: true as const };
}

export async function consultarSessao(cliente: ClienteSupabaseAutenticacao) {
  const { data, error } = await cliente.auth.getUser();

  return { autenticado: !error && Boolean(data.user) };
}

export async function sair(cliente: ClienteSupabaseAutenticacao) {
  const { error } = await cliente.auth.signOut({ scope: "local" });

  if (error) {
    throw new ErroAutenticacaoIndisponivel();
  }

  return { autenticado: false as const };
}
