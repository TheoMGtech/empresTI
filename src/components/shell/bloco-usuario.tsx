"use client";

import { SignOut } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  iniciais,
  nomeVisivel,
  ROTULO_PAPEL,
  type SessaoAplicacao,
} from "@/components/shell/sessao";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/cliente";

export const MENSAGEM_FALHA_SAIDA = "Não foi possível encerrar o acesso. Tente novamente.";

type PropsBlocoUsuario = { sessao: SessaoAplicacao; compacto?: boolean };

/** Bloco de usuário da sidebar, com a ação `Sair` (RF-SESSAO-12, RF-LOGIN-07). */
export function BlocoUsuario({ sessao, compacto = false }: PropsBlocoUsuario) {
  const roteador = useRouter();
  const clienteConsulta = useQueryClient();
  const sair = trpc.autenticacao.sair.useMutation();
  const [erro, setErro] = useState<string | null>(null);
  const nome = nomeVisivel(sessao);

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
    <div
      className={cn(
        "flex flex-col gap-2",
        !compacto && "rounded-[10px] border border-(--border-soft) bg-(--surface-sunken) p-3",
      )}
    >
      <div className="flex min-w-0 items-center gap-[10px]">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-(--accent-800) text-[11px] font-semibold text-(--accent-300)"
        >
          {iniciais(nome)}
        </span>
        <div className={cn("min-w-0 flex-1", compacto && "hidden sm:block")}>
          <p className="truncate text-[13px] text-(--color-text)">{nome}</p>
          {sessao.nomeExibicao ? (
            <p className="truncate text-[11.5px] text-(--text-faint)">
              {ROTULO_PAPEL[sessao.papel]}
            </p>
          ) : null}
        </div>
        <button
          className="flex h-[30px] shrink-0 items-center gap-[6px] rounded-[7px] border border-(--border-strong) bg-transparent px-[10px] text-[12px] text-(--text-nav) transition-[border-color,color,transform] duration-[140ms] ease-out hover:enabled:border-(--border-hover) hover:enabled:text-(--color-text) active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0"
          disabled={sair.isPending}
          onClick={encerrar}
          type="button"
        >
          <SignOut aria-hidden="true" size={14} />
          Sair
        </button>
      </div>
      <div aria-live="assertive" role="alert">
        {erro ? <p className="text-[12px] text-[#F0A0A5]">{erro}</p> : null}
      </div>
    </div>
  );
}
