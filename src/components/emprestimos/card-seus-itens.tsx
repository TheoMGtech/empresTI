"use client";

import { useMeuResumo } from "@/components/emprestimos/resumo";
import { SegmentosLimite } from "@/components/emprestimos/segmentos-limite";

/** Card "Seus itens" da tela 03 (layout §6, tela 03). */
export function CardSeusItens() {
  const { data: resumo } = useMeuResumo();

  if (!resumo) return null;

  const nota =
    resumo.emAtraso > 0
      ? `${resumo.emAtraso} ${resumo.emAtraso === 1 ? "item em atraso" : "itens em atraso"}. Devolva antes de solicitar outro.`
      : "Nenhum item em atraso.";

  return (
    <section
      aria-labelledby="titulo-seus-itens"
      className="flex flex-col gap-3 rounded-[12px] border border-(--border-card) bg-(--color-surface) p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-seus-itens">
          Seus itens
        </h2>
        <span className="text-[13px] font-semibold text-(--accent-300)">
          {resumo.itensAbertos} de {resumo.limite}
        </span>
      </div>
      <SegmentosLimite limite={resumo.limite} usados={resumo.itensAbertos} />
      <p
        className={
          resumo.emAtraso > 0 ? "text-[12px] text-[#F0A0A5]" : "text-[12px] text-(--text-faint)"
        }
      >
        {nota}
      </p>
    </section>
  );
}
