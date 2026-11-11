"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { CartaoEquipamento } from "@/components/catalogo/cartao-equipamento";
import { FaixaRegras } from "@/components/catalogo/faixa-regras";
import {
  FiltrosCatalogo,
  type FiltrosCatalogo as Filtros,
} from "@/components/catalogo/filtros-catalogo";
import { ContadorItens } from "@/components/emprestimos/contador-itens";
import { bloqueioDoResumo, useMeuResumo } from "@/components/emprestimos/resumo";
import { CabecalhoPagina, ConteudoPagina } from "@/components/shell/pagina";
import { useSessaoAplicacao } from "@/components/shell/sessao";
import { trpc } from "@/trpc/cliente";

export const TAMANHO_PAGINA_CATALOGO = 24;
export const MENSAGEM_FALHA_CATALOGO = "Não foi possível carregar o catálogo.";
export const MENSAGEM_CATALOGO_VAZIO = "Nenhum equipamento cadastrado.";
export const MENSAGEM_FILTRO_VAZIO = "Nenhum equipamento para este filtro.";

const SEM_FILTROS: Filtros = { categoria: undefined, somenteDisponiveis: false };

const BOTAO_SECUNDARIO =
  "flex h-9 items-center justify-center rounded-[8px] border border-(--border-strong) bg-transparent px-4 text-[13px] text-(--text-nav) transition-[border-color,color,transform] duration-[140ms] ease-out hover:enabled:border-(--border-hover) hover:enabled:text-(--color-text) active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0";

function plural(quantidade: number, singular: string, pluralTexto: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Esqueleto() {
  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">Carregando catálogo</span>
      <Grade>
        {Array.from({ length: 6 }, (_, indice) => (
          <div
            className="h-[150px] rounded-[12px] border border-(--border-card) bg-(--color-surface)"
            key={indice}
          />
        ))}
      </Grade>
    </div>
  );
}

/** Tela 02 · Catálogo (RF-CATALOGO-03 a 07). */
export function TelaCatalogo() {
  const sessao = useSessaoAplicacao();
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS);
  const filtrando = filtros.categoria !== undefined || filtros.somenteDisponiveis;
  const consulta = trpc.equipamentos.listar.useInfiniteQuery(
    {
      limite: TAMANHO_PAGINA_CATALOGO,
      ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
      ...(filtros.somenteDisponiveis ? { somenteDisponiveis: true } : {}),
    },
    {
      getNextPageParam: (pagina) => pagina.proximoCursor ?? undefined,
      // Ao trocar o filtro, a grade anterior fica na tela até a nova chegar.
      placeholderData: keepPreviousData,
    },
  );

  const paginas = consulta.data?.pages ?? [];
  const itens = paginas.flatMap((pagina) => pagina.itens);
  const resumo = paginas[0]?.resumo;
  const atualizandoFiltro = consulta.isPlaceholderData && consulta.isFetching;
  const bloqueio = bloqueioDoResumo(useMeuResumo().data);

  return (
    <>
      <CabecalhoPagina>
        <ContadorItens />
      </CabecalhoPagina>
      <ConteudoPagina>
        <div className="flex flex-col gap-1" data-screen-label="02 Catálogo">
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-(--color-text)">
            Catálogo
          </h1>
          {resumo ? (
            <p className="text-[13px] text-(--text-muted)">
              {plural(resumo.total, "equipamento", "equipamentos")} ·{" "}
              {plural(resumo.disponiveis, "disponível agora", "disponíveis agora")}
            </p>
          ) : null}
        </div>

        <FaixaRegras />

        {bloqueio ? (
          <p className="text-[12.5px] text-[#F0A0A5]" role="note">
            {bloqueio.nota}
          </p>
        ) : null}

        <FiltrosCatalogo aoMudar={setFiltros} filtros={filtros} />

        {consulta.isPending ? <Esqueleto /> : null}

        {consulta.isError && itens.length === 0 ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-[13.5px] text-(--color-text)">{MENSAGEM_FALHA_CATALOGO}</p>
            <button
              className={BOTAO_SECUNDARIO}
              disabled={consulta.isFetching}
              onClick={() => void consulta.refetch()}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {consulta.isSuccess && itens.length === 0 && !filtrando ? (
          <p className="text-[13.5px] text-(--text-muted)">{MENSAGEM_CATALOGO_VAZIO}</p>
        ) : null}

        {consulta.isSuccess && itens.length === 0 && filtrando ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[13.5px] text-(--text-muted)">{MENSAGEM_FILTRO_VAZIO}</p>
            <button
              className={BOTAO_SECUNDARIO}
              onClick={() => setFiltros(SEM_FILTROS)}
              type="button"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}

        {itens.length > 0 ? (
          <div
            aria-busy={atualizandoFiltro || undefined}
            className={
              atualizandoFiltro
                ? "opacity-60 transition-opacity motion-reduce:transition-none"
                : undefined
            }
          >
            <Grade>
              {itens.map((item) => (
                <CartaoEquipamento
                  abreIndisponivel={sessao.papel === "operacoes"}
                  item={item}
                  key={item.patrimonio}
                  solicitacaoBloqueada={bloqueio !== null}
                />
              ))}
            </Grade>
          </div>
        ) : null}

        {consulta.hasNextPage ? (
          <button
            className={`${BOTAO_SECUNDARIO} self-start`}
            disabled={consulta.isFetchingNextPage}
            onClick={() => void consulta.fetchNextPage()}
            type="button"
          >
            {consulta.isFetchingNextPage ? "Carregando..." : "Mostrar mais"}
          </button>
        ) : null}
      </ConteudoPagina>
    </>
  );
}
