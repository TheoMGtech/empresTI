"use client";

import * as PrimitivoDialogo from "@radix-ui/react-dialog";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Diálogo no padrão shadcn/ui (ADR-001 §2) sobre Radix, com o visual do layout §5.9.

export const Dialogo = PrimitivoDialogo.Root;
export const FecharDialogo = PrimitivoDialogo.Close;

export function ConteudoDialogo({
  className,
  children,
  ...props
}: ComponentProps<typeof PrimitivoDialogo.Content>) {
  return (
    <PrimitivoDialogo.Portal>
      <PrimitivoDialogo.Overlay className="fixed inset-0 z-40 bg-[rgba(4,6,14,0.68)] data-[state=closed]:animate-[fundo-dialogo-sair_120ms_ease-in] data-[state=open]:animate-[fundo-dialogo-entrar_180ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none" />
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <PrimitivoDialogo.Content
          className={cn(
            "pointer-events-auto flex w-full max-w-[432px] flex-col gap-4 rounded-[14px] bg-(--color-surface) p-6 shadow-[0_0_0_1px_#454E68,0_18px_44px_rgba(0,0,0,0.7)] focus:outline-none data-[state=closed]:animate-[dialogo-sair_120ms_ease-in] data-[state=open]:animate-[dialogo-entrar_180ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none",
            className,
          )}
          {...props}
        >
          {children}
        </PrimitivoDialogo.Content>
      </div>
    </PrimitivoDialogo.Portal>
  );
}

export function TituloDialogo({ children }: { children: ReactNode }) {
  return (
    <PrimitivoDialogo.Title className="text-[19px] font-semibold tracking-[-0.01em] text-(--color-text)">
      {children}
    </PrimitivoDialogo.Title>
  );
}

export function DescricaoDialogo({ children }: { children: ReactNode }) {
  return (
    <PrimitivoDialogo.Description className="text-[13.5px] text-(--text-muted)">
      {children}
    </PrimitivoDialogo.Description>
  );
}

/** Bloco de consequência do diálogo (layout §5.9). */
export function ConsequenciaDialogo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[9px] border border-(--border-soft) bg-(--surface-sunken) px-[14px] py-3 text-[12.5px] text-(--text-nav)">
      {children}
    </div>
  );
}

export function AcoesDialogo({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-[10px]">{children}</div>;
}
