import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

import { ROTULO_CATEGORIA, type ItemCatalogo } from "@/components/catalogo/categorias";
import { MiniaturaEquipamento } from "@/components/catalogo/miniatura-equipamento";
import { PillSituacao } from "@/components/catalogo/pill-situacao";
import { formatarDataCurta } from "@/lib/datas";
import { cn } from "@/lib/utils";

function Rodape({ item }: { item: ItemCatalogo }) {
  const { disponibilidade } = item;

  switch (disponibilidade.estado) {
    case "disponivel":
      return (
        <span className="flex items-center gap-[5px] text-(--accent-400)">
          Solicitar
          <ArrowRight aria-hidden="true" size={12} />
        </span>
      );
    case "emprestado":
      // RF-CATALOGO-07 e RS-CATALOGO-03: sem nome de quem pegou.
      return (
        <span className="text-(--text-faint)">
          Emprestado · devolve {formatarDataCurta(disponibilidade.devolverAte)}
        </span>
      );
    case "manutencao":
      return <span className="text-(--text-faint)">Em manutenção · sem empréstimo</span>;
    case "fora_de_uso":
      return <span className="text-(--text-faint)">Fora de uso · sem empréstimo</span>;
  }
}

type PropsCartao = {
  item: ItemCatalogo;
  /** RF-CATALOGO-06: Operações abre o detalhe de item indisponível. */
  abreIndisponivel: boolean;
};

/** Card do catálogo (layout §5.4). */
export function CartaoEquipamento({ item, abreIndisponivel }: PropsCartao) {
  const disponivel = item.disponibilidade.estado === "disponivel";
  const clicavel = disponivel || abreIndisponivel;

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <MiniaturaEquipamento categoria={item.categoria} imagemUrl={item.imagemUrl} />
        <PillSituacao estado={item.disponibilidade.estado} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-[14.5px] leading-snug font-semibold text-(--color-text)">
          {item.nome}
        </h2>
        <p className="text-[12px] text-(--text-dim)">
          {ROTULO_CATEGORIA[item.categoria]} · {item.patrimonio}
        </p>
      </div>
      <div className="text-[12px]">
        <Rodape item={item} />
      </div>
    </>
  );

  const classe =
    "flex h-full flex-col gap-3 rounded-[12px] border border-(--border-card) bg-(--color-surface) p-4";

  if (!clicavel) {
    return (
      <article aria-label={item.nome} className={classe} data-patrimonio={item.patrimonio}>
        {conteudo}
      </article>
    );
  }

  return (
    <article aria-label={item.nome} className="h-full" data-patrimonio={item.patrimonio}>
      <Link
        className={cn(
          classe,
          "text-inherit transition-[border-color] duration-[160ms] ease-out hover:border-(--accent-600) hover:text-inherit motion-reduce:transition-none",
        )}
        href={`/catalogo/${encodeURIComponent(item.patrimonio)}`}
      >
        {conteudo}
      </Link>
    </article>
  );
}
