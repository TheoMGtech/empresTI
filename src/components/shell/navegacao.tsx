"use client";

import {
  HandArrowDown,
  ListChecks,
  PlusSquare,
  SquaresFour,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { PapelSessao } from "@/components/shell/sessao";
import { cn } from "@/lib/utils";

type ItemNavegacao = { href: string; rotulo: string; icone: Icon };
type GrupoNavegacao = { rotulo: string; somenteOperacoes: boolean; itens: ItemNavegacao[] };

// Layout §7: dois grupos na mesma aplicação. Operações é seção extra, não app separado.
const GRUPOS: GrupoNavegacao[] = [
  {
    rotulo: "Colaborador",
    somenteOperacoes: false,
    itens: [
      { href: "/catalogo", rotulo: "Catálogo", icone: SquaresFour },
      { href: "/meus-emprestimos", rotulo: "Meus empréstimos", icone: HandArrowDown },
    ],
  },
  {
    rotulo: "Operações",
    somenteOperacoes: true,
    itens: [
      { href: "/operacoes/emprestimos", rotulo: "Empréstimos em aberto", icone: ListChecks },
      {
        href: "/operacoes/equipamentos/novo",
        rotulo: "Cadastrar equipamento",
        icone: PlusSquare,
      },
    ],
  },
];

/** RF-SESSAO-07: o grupo Operações só aparece para `operacoes`. Não substitui o servidor. */
export function gruposVisiveis(papel: PapelSessao) {
  return GRUPOS.filter((grupo) => !grupo.somenteOperacoes || papel === "operacoes");
}

function estaAtivo(caminho: string, href: string) {
  return caminho === href || caminho.startsWith(`${href}/`);
}

type PropsNavegacao = { papel: PapelSessao; variante: "lateral" | "superior" };

export function NavegacaoPrincipal({ papel, variante }: PropsNavegacao) {
  const caminho = usePathname() ?? "";
  const lateral = variante === "lateral";

  return (
    <nav aria-label="Navegação principal" className={cn(lateral ? "flex flex-col" : "min-w-0")}>
      <ul className={cn(lateral ? "flex flex-col" : "flex flex-wrap gap-[3px]")}>
        {gruposVisiveis(papel).map((grupo, indice) => (
          <li key={grupo.rotulo} className={cn(!lateral && "contents")}>
            {lateral ? (
              <p
                className={cn(
                  "px-2 pb-[6px] text-[10px] tracking-[0.12em] text-(--text-ghost) uppercase",
                  indice > 0 && "pt-[18px]",
                )}
              >
                {grupo.rotulo}
              </p>
            ) : null}
            <ul
              aria-label={grupo.rotulo}
              className={cn(lateral ? "flex flex-col gap-[3px]" : "contents")}
            >
              {grupo.itens.map((item) => {
                const ativo = estaAtivo(caminho, item.href);
                const Icone = item.icone;

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-[10px] rounded-[8px] px-[10px] text-[13px] transition-[background-color,color] duration-[120ms] ease-out motion-reduce:transition-none",
                        lateral ? "py-[9px]" : "py-[7px] whitespace-nowrap",
                        ativo
                          ? "bg-(--color-surface) text-(--color-text) shadow-[inset_2px_0_0_#5B7FE0]"
                          : "text-(--text-nav) hover:bg-(--surface-sunken) hover:text-(--color-text)",
                      )}
                      href={item.href}
                    >
                      <Icone
                        aria-hidden="true"
                        className={cn("shrink-0", ativo && "text-(--accent-400)")}
                        size={16}
                        weight={ativo ? "fill" : "regular"}
                      />
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
