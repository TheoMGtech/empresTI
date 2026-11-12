import type { Disponibilidade } from "@/components/catalogo/categorias";
import { cn } from "@/lib/utils";

type Estado = Disponibilidade["estado"];

// Trios de cor do layout §2.4. "Fora de uso" não tem cor própria no layout e usa o trio neutro.
const ESTILO: Record<Estado, { rotulo: string; classe: string }> = {
  disponivel: {
    rotulo: "Disponível",
    classe: "border-[rgba(63,185,140,0.35)] bg-[rgba(63,185,140,0.12)] text-[#5FD3AA]",
  },
  emprestado: {
    rotulo: "Emprestado",
    classe: "border-(--border-strong) bg-(--border-soft) text-(--text-nav)",
  },
  manutencao: {
    rotulo: "Manutenção",
    classe: "border-[rgba(224,163,63,0.35)] bg-[rgba(224,163,63,0.12)] text-[#E8B961]",
  },
  fora_de_uso: {
    rotulo: "Fora de uso",
    classe: "border-(--border-strong) bg-(--border-soft) text-(--text-nav)",
  },
};

export function PillSituacao({ estado }: { estado: Estado }) {
  const { rotulo, classe } = ESTILO[estado];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-[9px] py-[3px] text-[11px] leading-none font-semibold",
        classe,
      )}
    >
      {rotulo}
    </span>
  );
}
