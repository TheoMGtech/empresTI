import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

import { ROTULO_CATEGORIA, type ItemCatalogo } from "@/components/catalogo/categorias";
import { MiniaturaEquipamento } from "@/components/catalogo/miniatura-equipamento";
import { PillSituacao } from "@/components/catalogo/pill-situacao";
import { formatarDataCurta } from "@/lib/datas";
import { cn } from "@/lib/utils";

function Rodape({ item, bloqueada }: { item: ItemCatalogo; bloqueada: boolean }) {
  const { disponibilidade } = item;

  switch (disponibilidade.estado) {
    case "disponivel":
      // RF-REGRAS-02: com atraso ou no limite, "Solicitar" aparece desabilitado (§9.3).
      return (
        <span
          aria-disabled={bloqueada || undefined}
          className={cn(
            "flex items-center gap-[5px] text-(--accent-400)",
            bloqueada && "opacity-45",
          )}
        >
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
  /** RF-REGRAS-02: atraso ou limite atingido. O card continua abrindo o detalhe. */
  solicitacaoBloqueada?: boolean;
  /** Prévia do cadastro (tela 06): mesmo visual, sem link. */
  semAcao?: boolean;
};

/** Card do catálogo (layout §5.4). */
export function CartaoEquipamento({
  item,
  abreIndisponivel,
  solicitacaoBloqueada = false,
  semAcao = false,
}: PropsCartao) {
  const disponivel = item.disponibilidade.estado === "disponivel";
  const clicavel = !semAcao && (disponivel || abreIndisponivel);

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
        <Rodape bloqueada={solicitacaoBloqueada} item={item} />
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
