"use client";

import { useState } from "react";

import { trpc } from "@/trpc/cliente";

export const MENSAGEM_FALHA_SAIDA = "Não foi possível encerrar o acesso. Tente novamente.";

export function SessaoAtiva() {
  const utilitarios = trpc.useUtils();
  const sair = trpc.autenticacao.sair.useMutation();
  const [erroSaida, setErroSaida] = useState<string | null>(null);

  async function encerrar() {
    setErroSaida(null);

    try {
      await sair.mutateAsync();
      utilitarios.autenticacao.sessao.setData(undefined, { autenticado: false });
    } catch {
      setErroSaida(MENSAGEM_FALHA_SAIDA);
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-(--color-text)">
        Acesso confirmado
      </h2>

      <div aria-live="assertive" role="alert">
        {erroSaida ? <p className="text-[12.5px] text-[#F0A0A5]">{erroSaida}</p> : null}
      </div>

      <button
        className="flex h-11 items-center justify-center rounded-[8px] border border-(--border-strong) bg-transparent px-5 text-[14px] text-[#9AA3BC] transition-[border-color,color,transform] duration-[140ms] ease-out hover:enabled:border-[#454E68] hover:enabled:text-(--color-text) active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0"
        disabled={sair.isPending}
        onClick={encerrar}
        type="button"
      >
        Sair
      </button>
    </div>
  );
}
