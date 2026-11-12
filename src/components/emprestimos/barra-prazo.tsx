import { dataCalendarioSaoPaulo, diasEntre, formatarDataCurta } from "@/lib/datas";
import { cn } from "@/lib/utils";

type PropsBarraPrazo = {
  retiradoEm: Date;
  /** `AAAA-MM-DD`, calendário de São Paulo. */
  devolverAte: string;
  emAtraso: boolean;
  /** Para testes com data fixa. */
  agora?: Date;
};

/** RF-DEVOL-04 e layout §5.10: dias decorridos sobre o prazo, no calendário de São Paulo. */
export function BarraPrazo({
  retiradoEm,
  devolverAte,
  emAtraso,
  agora = new Date(),
}: PropsBarraPrazo) {
  const retirada = dataCalendarioSaoPaulo(retiradoEm);
  const total = Math.max(1, diasEntre(retirada, devolverAte));
  const decorridos = Math.min(
    total,
    Math.max(0, diasEntre(retirada, dataCalendarioSaoPaulo(agora))),
  );
  const proporcao = emAtraso ? 100 : Math.round((decorridos / total) * 100);

  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <p className={cn("text-[12.5px]", emAtraso ? "text-[#E08A90]" : "text-(--text-muted)")}>
        {emAtraso ? "Venceu em" : "Devolver até"}{" "}
        <span className={emAtraso ? "font-semibold" : "font-semibold text-(--color-text)"}>
          {formatarDataCurta(devolverAte)}
        </span>
      </p>
      <div
        aria-label="Prazo"
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={emAtraso ? total : decorridos}
        aria-valuetext={`${decorridos} de ${total} dias`}
        className="h-1 overflow-hidden rounded-full bg-(--border-frame)"
        role="progressbar"
      >
        {/* Spec 009, RF-SEG-07: a largura vai em atributo SVG, não em `style`, que a CSP
            bloqueia. O `rx` igual à metade da altura (h-1 = 4px) mantém a ponta arredondada. */}
        <svg aria-hidden="true" className="block h-full w-full" focusable="false">
          <rect
            className={cn(
              "transition-[width] duration-[240ms] ease-out motion-reduce:transition-none",
              emAtraso ? "fill-[#E08A90]" : "fill-(--accent-500)",
            )}
            height="100%"
            rx="2"
            width={`${proporcao}%`}
          />
        </svg>
      </div>
    </div>
  );
}
