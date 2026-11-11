"use client";

import { SignOut } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/trpc/cliente";

export const MENSAGEM_FALHA_SAIDA = "Não foi possível encerrar o acesso. Tente novamente.";

/** `Sair` (RF-SESSAO-12, RF-LOGIN-07): encerra a sessão, limpa o cache e volta ao login. */
export function BotaoSair() {
  const roteador = useRouter();
  const clienteConsulta = useQueryClient();
  const sair = trpc.autenticacao.sair.useMutation();
  const [erro, setErro] = useState<string | null>(null);

  async function encerrar() {
    setErro(null);

    try {
      await sair.mutateAsync();
      // Nenhum dado da conta anterior fica em cache para a próxima pessoa no navegador.
      clienteConsulta.clear();
      roteador.replace("/");
    } catch {
      setErro(MENSAGEM_FALHA_SAIDA);
    }
  }

  return (
    <>
      <button
        className="flex h-[30px] shrink-0 items-center gap-[6px] rounded-[7px] border border-(--border-strong) bg-transparent px-[10px] text-[12px] text-(--text-nav) transition-[border-color,color,transform] duration-[140ms] ease-out hover:enabled:border-(--border-hover) hover:enabled:text-(--color-text) active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0"
        disabled={sair.isPending}
        onClick={encerrar}
        type="button"
      >
        <SignOut aria-hidden="true" size={14} />
        Sair
      </button>
      <span aria-live="assertive" className="contents" role="alert">
        {erro ? <span className="basis-full text-[12px] text-[#F0A0A5]">{erro}</span> : null}
      </span>
    </>
  );
}
