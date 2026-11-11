import { cn } from "@/lib/utils";

type PropsSegmentos = { usados: number; limite: number; className?: string };

/** Segmentos de limite de itens (layout §5.10). */
export function SegmentosLimite({ usados, limite, className }: PropsSegmentos) {
  return (
    <div
      aria-label={`${usados} de ${limite} itens`}
      className={cn("flex gap-[5px]", className)}
      role="img"
    >
      {Array.from({ length: limite }, (_, indice) => (
        <span
          className={cn(
            "h-[5px] flex-1 rounded-full transition-[background-color] duration-[240ms] ease-out motion-reduce:transition-none",
            indice < usados ? "bg-(--accent-500)" : "bg-(--border-frame)",
          )}
          data-preenchido={indice < usados}
          key={indice}
        />
      ))}
    </div>
  );
}
