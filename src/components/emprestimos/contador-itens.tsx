"use client";

import { useMeuResumo } from "@/components/emprestimos/resumo";

/** Contador do cabeçalho do catálogo e do detalhe (layout §7 e §9.1). */
export function ContadorItens() {
  const { data: resumo } = useMeuResumo();

  if (!resumo) return null;

  return (
    <p className="ml-auto shrink-0 text-[13px] text-(--text-muted)">
      <span className="font-semibold text-(--color-text)">
        {resumo.itensAbertos} de {resumo.limite}
      </span>{" "}
      itens com você
    </p>
  );
}
