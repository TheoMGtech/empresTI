"use client";

import { BotaoSair } from "@/components/shell/sair";
import {
  iniciais,
  nomeVisivel,
  ROTULO_PAPEL,
  type SessaoAplicacao,
} from "@/components/shell/sessao";
import { cn } from "@/lib/utils";

type PropsBlocoUsuario = { sessao: SessaoAplicacao; compacto?: boolean };

/** Bloco de usuário da sidebar, com a ação `Sair` (RF-SESSAO-12). */
export function BlocoUsuario({ sessao, compacto = false }: PropsBlocoUsuario) {
  const nome = nomeVisivel(sessao);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-[10px] gap-y-2",
        !compacto && "rounded-[10px] border border-(--border-soft) bg-(--surface-sunken) p-3",
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-full bg-(--accent-800) text-[11px] font-semibold text-(--accent-300)"
      >
        {iniciais(nome)}
      </span>
      <div className={cn("min-w-0 flex-1", compacto && "hidden sm:block")}>
        <p className="truncate text-[13px] text-(--color-text)">{nome}</p>
        {sessao.nomeExibicao ? (
          <p className="truncate text-[11.5px] text-(--text-faint)">{ROTULO_PAPEL[sessao.papel]}</p>
        ) : null}
      </div>
      <BotaoSair />
    </div>
  );
}
