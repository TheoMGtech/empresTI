import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { Fragment } from "react";

type ItemTrilha = { rotulo: string; href?: string };

/** Breadcrumb do header nas telas de profundidade 2 (layout §7). */
export function Trilha({ itens }: { itens: ItemTrilha[] }) {
  return (
    <nav aria-label="Trilha" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-[6px] text-[13px]">
        {itens.map((item, indice) => {
          const ultimo = indice === itens.length - 1;
          return (
            <Fragment key={`${item.rotulo}-${indice}`}>
              <li className={ultimo ? "min-w-0 truncate text-(--color-text)" : "text-(--text-nav)"}>
                {item.href && !ultimo ? (
                  <Link href={item.href}>{item.rotulo}</Link>
                ) : (
                  <span aria-current={ultimo ? "page" : undefined}>{item.rotulo}</span>
                )}
              </li>
              {ultimo ? null : (
                <li aria-hidden="true" className="text-(--text-faint)">
                  <CaretRight size={12} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
