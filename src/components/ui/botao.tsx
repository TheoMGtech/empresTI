import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// Botões do layout §5.1 e alturas do §4.5. Primário é contornado, nunca preenchido.
const variantesBotao = cva(
  "inline-flex items-center justify-center gap-2 rounded-[8px] border transition-[background-color,border-color,color,transform] duration-[140ms] ease-out active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0",
  {
    variants: {
      variante: {
        primario:
          "border-(--accent-500) bg-transparent font-semibold text-(--accent-300) hover:enabled:bg-[rgba(91,127,224,0.12)] hover:enabled:text-(--accent-100)",
        confirmacao:
          "border-(--accent-500) bg-[rgba(91,127,224,0.12)] font-semibold text-(--accent-200) hover:enabled:bg-[rgba(91,127,224,0.2)]",
        secundario:
          "border-(--border-strong) bg-transparent text-(--text-nav) hover:enabled:border-(--border-hover) hover:enabled:text-(--color-text)",
      },
      tamanho: {
        formulario: "h-11 px-5 text-[14px]",
        dialogo: "h-[38px] px-4 text-[13px]",
      },
    },
    defaultVariants: { variante: "primario", tamanho: "formulario" },
  },
);

export type PropsBotao = ComponentProps<"button"> & VariantProps<typeof variantesBotao>;

export function Botao({ className, variante, tamanho, type = "button", ...props }: PropsBotao) {
  return (
    <button
      className={cn(variantesBotao({ variante, tamanho }), className)}
      type={type}
      {...props}
    />
  );
}
