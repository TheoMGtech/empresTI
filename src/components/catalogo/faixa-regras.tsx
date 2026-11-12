import { Info } from "@phosphor-icons/react";

/** Faixa de aviso de regras do topo do catálogo (layout §5.8 e §9). */
export function FaixaRegras() {
  return (
    <section
      aria-label="Regras de empréstimo"
      className="flex items-start gap-3 rounded-[10px] border border-(--accent-700) bg-[linear-gradient(90deg,#0E1530,#0B1128)] px-4 py-[13px]"
    >
      <Info aria-hidden="true" className="mt-px shrink-0 text-(--accent-400)" size={17} />
      <div className="flex min-w-0 flex-col gap-[2px]">
        <p className="text-[13px] font-semibold text-(--color-text)">Regras de empréstimo</p>
        <p className="text-[12.5px] text-pretty text-(--text-nav)">
          Até 3 itens por pessoa, com prazo padrão de 14 dias. Quem tem item em atraso não pega
          outro. Equipamento em manutenção não pode ser solicitado.
        </p>
      </div>
    </section>
  );
}
