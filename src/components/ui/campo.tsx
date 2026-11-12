import { CaretDown } from "@phosphor-icons/react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Campos do layout §5.5: 42px, borda #2B3450, fundo afundado. Textarea de 88px sem redimensionar.
const BASE =
  "w-full rounded-[8px] border border-(--border-strong) bg-(--surface-sunken) px-3 text-[14px] text-(--color-text) aria-invalid:border-[#E08A90]";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(BASE, "h-[42px]", className)} {...props} />;
}

export function Selecao({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(BASE, "h-[42px] appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <CaretDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-(--text-faint)"
        size={13}
      />
    </div>
  );
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(BASE, "h-[88px] resize-none py-[10px]", className)} {...props} />;
}

type PropsCampo = {
  id: string;
  rotulo: string;
  erro?: string;
  nota?: string;
  opcional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Rótulo, nota e erro ligados ao controle por `id` (RI de acessibilidade do projeto). */
export function CampoFormulario({
  id,
  rotulo,
  erro,
  nota,
  opcional,
  className,
  children,
}: PropsCampo) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label className="text-[12px] text-(--text-nav)" htmlFor={id}>
        {rotulo} {opcional ? <span className="text-(--text-ghost)">(opcional)</span> : null}
      </label>
      {children}
      {nota ? (
        <p className="text-[11.5px] text-(--text-faint)" id={`${id}-nota`}>
          {nota}
        </p>
      ) : null}
      {erro ? (
        <p className="text-[12px] text-[#F0A0A5]" id={`${id}-erro`}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` e `aria-invalid` de um campo com erro e nota opcionais. */
export function ligacoesDoCampo(id: string, erro?: string, nota?: string) {
  const descricoes = [nota ? `${id}-nota` : null, erro ? `${id}-erro` : null].filter(Boolean);
  return {
    "aria-describedby": descricoes.length > 0 ? descricoes.join(" ") : undefined,
    "aria-invalid": erro ? true : undefined,
    id,
  };
}
