"use client";

import { createContext, useContext } from "react";

import type { SaidasRouter } from "@/trpc/tipos";

export type SessaoAplicacao = SaidasRouter["sessao"]["atual"];
export type PapelSessao = SessaoAplicacao["papel"];

export const ROTULO_PAPEL: Record<PapelSessao, string> = {
  colaborador: "Colaborador",
  operacoes: "Operações",
};

/** Sem nome de exibição, a interface mostra o papel (RF-SESSAO-07, D-SESSAO-02). */
export function nomeVisivel(sessao: SessaoAplicacao) {
  return sessao.nomeExibicao ?? ROTULO_PAPEL[sessao.papel];
}

export function iniciais(texto: string) {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";

  return `${primeira}${ultima}`.toLocaleUpperCase("pt-BR");
}

const ContextoSessao = createContext<SessaoAplicacao | null>(null);

export const ProvedorSessao = ContextoSessao.Provider;

export function useSessaoAplicacao() {
  const sessao = useContext(ContextoSessao);

  if (!sessao) {
    throw new Error("useSessaoAplicacao precisa estar dentro da área autenticada.");
  }

  return sessao;
}
