import type { ReactNode } from "react";

/** Painel de diálogo do Nocturne (§5.9), usado para avisos de acesso. */
export function AvisoAcesso({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div
      className="flex w-full max-w-[432px] flex-col gap-4 rounded-[14px] bg-(--color-surface) p-6 shadow-[0_0_0_1px_#454E68,0_18px_44px_rgba(0,0,0,0.7)]"
      role="alert"
    >
      <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-(--color-text)">{titulo}</h1>
      {children}
    </div>
  );
}
