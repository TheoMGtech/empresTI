import { cn } from "@/lib/utils";

import type { CategoriaCatalogo } from "@/components/catalogo/categorias";

export type FiltrosCatalogo = { categoria?: CategoriaCatalogo; somenteDisponiveis: boolean };

const OPCOES_CATEGORIA: { valor: CategoriaCatalogo | undefined; rotulo: string }[] = [
  { valor: undefined, rotulo: "Todos" },
  { valor: "notebook", rotulo: "Notebooks" },
  { valor: "monitor", rotulo: "Monitores" },
  { valor: "cabo", rotulo: "Cabos" },
  { valor: "camera", rotulo: "Câmeras" },
];

function classeChip(ativo: boolean) {
  // Chips de filtro do layout §5.3.
  return cn(
    "rounded-full border px-3 py-[6px] text-[12px] transition-[background-color,border-color,color] duration-[140ms] ease-out motion-reduce:transition-none",
    ativo
      ? "border-(--accent-700) bg-(--accent-800) text-(--accent-200)"
      : "border-(--border-frame) bg-transparent text-(--text-nav) hover:border-(--border-strong) hover:text-(--color-text)",
  );
}

type PropsFiltros = { filtros: FiltrosCatalogo; aoMudar: (filtros: FiltrosCatalogo) => void };

/** RF-CATALOGO-04: chips por categoria e "Só disponíveis" à direita. */
export function FiltrosCatalogo({ filtros, aoMudar }: PropsFiltros) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div aria-label="Categoria" className="flex flex-wrap gap-2" role="group">
        {OPCOES_CATEGORIA.map((opcao) => {
          const ativo = filtros.categoria === opcao.valor;
          return (
            <button
              aria-pressed={ativo}
              className={classeChip(ativo)}
              key={opcao.rotulo}
              onClick={() => aoMudar({ ...filtros, categoria: opcao.valor })}
              type="button"
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>
      <button
        aria-pressed={filtros.somenteDisponiveis}
        className={cn(classeChip(filtros.somenteDisponiveis), "sm:ml-auto")}
        onClick={() => aoMudar({ ...filtros, somenteDisponiveis: !filtros.somenteDisponiveis })}
        type="button"
      >
        Só disponíveis
      </button>
    </div>
  );
}
