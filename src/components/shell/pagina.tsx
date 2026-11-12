import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Cabeçalho do main (layout §4.4): 64px no desktop, quebra em linhas no celular. */
export function CabecalhoPagina({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 border-b border-(--border-soft) px-4 py-3 sm:px-7 lg:h-16 lg:flex-nowrap lg:py-0",
        className,
      )}
    >
      {children}
    </header>
  );
}

/** Área de conteúdo do main (layout §4.4). */
export function ConteudoPagina({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[22px] px-4 py-6 sm:px-7 lg:py-7">{children}</div>
  );
}
