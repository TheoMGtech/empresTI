import { cn } from "@/lib/utils";

type Opcao<T extends string> = { valor: T; rotulo: string };

type PropsSegmentado<T extends string> = {
  nome: string;
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  desabilitado?: boolean;
  descricaoId?: string;
};

/** Controle segmentado do layout §5.6, como grupo de rádios nativos. */
export function ControleSegmentado<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  aoMudar,
  desabilitado = false,
  descricaoId,
}: PropsSegmentado<T>) {
  return (
    <fieldset
      aria-describedby={descricaoId}
      className="flex w-fit max-w-full flex-wrap overflow-hidden rounded-[8px] border border-(--border-strong)"
      disabled={desabilitado}
    >
      <legend className="sr-only">{rotulo}</legend>
      {opcoes.map((opcao, indice) => {
        const ativo = opcao.valor === valor;
        return (
          <label
            className={cn(
              "cursor-pointer px-[18px] py-[9px] text-[13px] transition-[background-color,color] duration-[140ms] ease-out has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-(--accent-500) motion-reduce:transition-none",
              indice > 0 && "border-l border-(--border-strong)",
              ativo
                ? "bg-(--accent-800) font-semibold text-(--accent-200)"
                : "text-(--text-nav) hover:text-(--color-text)",
            )}
            key={opcao.valor}
          >
            <input
              checked={ativo}
              className="sr-only"
              name={nome}
              onChange={() => aoMudar(opcao.valor)}
              type="radio"
              value={opcao.valor}
            />
            {opcao.rotulo}
          </label>
        );
      })}
    </fieldset>
  );
}
