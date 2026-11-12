"use client";

import { PlusSquare } from "@phosphor-icons/react";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ROTULO_CATEGORIA } from "@/components/catalogo/categorias";
import { DialogoDevolucao, type AlvoDevolucao } from "@/components/emprestimos/devolucao";
import { CabecalhoPagina, ConteudoPagina } from "@/components/shell/pagina";
import { Botao } from "@/components/ui/botao";
import { formatarDataCurta, formatarInstanteCurto } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/cliente";
import type { EntradasRouter, SaidasRouter } from "@/trpc/tipos";

type Entrada = EntradasRouter["operacoes"]["emprestimosEmAberto"];
type EmprestimoEmAberto = SaidasRouter["operacoes"]["emprestimosEmAberto"]["itens"][number];

export const TAMANHO_PAGINA_OPERACOES = 10;
/** ADR-001 §4: sem tempo real; a tela consulta de novo a cada minuto. */
export const INTERVALO_ATUALIZACAO_MS = 60_000;
export const MENSAGEM_SEM_EMPRESTIMOS = "Nenhum empréstimo em aberto.";
export const MENSAGEM_FILTRO_SEM_EMPRESTIMOS = "Nenhum empréstimo para este filtro.";
export const MENSAGEM_FALHA_OPERACOES = "Não foi possível carregar os empréstimos em aberto.";

// Chips da tela 05 (RF-OPER-03). "Vencem esta semana" são os próximos 7 dias (DF-20).
const CHIPS: { rotulo: string; filtro: Pick<Entrada, "filtro" | "categoria"> }[] = [
  { rotulo: "Todos", filtro: { filtro: "todos" } },
  { rotulo: "Em atraso", filtro: { filtro: "em_atraso" } },
  { rotulo: "Vencem esta semana", filtro: { filtro: "vencem_7_dias" } },
  { rotulo: "Notebooks", filtro: { filtro: "todos", categoria: "notebook" } },
];

const FORMATO_HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function nomePessoa(emprestimo: EmprestimoEmAberto) {
  return emprestimo.pessoa.nomeExibicao ?? "Sem nome cadastrado";
}

function CardEstatistica({
  rotulo,
  valor,
  alerta = false,
}: {
  rotulo: string;
  valor: number | undefined;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[11px] border bg-(--color-surface) px-[18px] py-4",
        alerta ? "border-[rgba(224,91,98,0.4)]" : "border-(--border-card)",
      )}
    >
      <dt className={cn("text-[12px]", alerta ? "text-[#E08A90]" : "text-(--text-dim)")}>
        {rotulo}
      </dt>
      <dd
        className={cn(
          "text-[26px] leading-tight font-semibold tabular-nums",
          alerta ? "text-[#F0A0A5]" : "text-(--color-text)",
        )}
      >
        {valor ?? "–"}
      </dd>
    </div>
  );
}

const CELULA_ROTULO = "text-[11px] tracking-[0.08em] text-(--text-faint) uppercase xl:hidden";

function LinhaEmprestimo({
  emprestimo,
  aoDevolver,
}: {
  emprestimo: EmprestimoEmAberto;
  aoDevolver: () => void;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-2 border-t border-(--border-row) px-[18px] py-[13px] text-[13px] first:border-t-0 xl:grid-cols-[1.3fr_1.1fr_120px_120px_150px_110px] xl:items-center xl:gap-y-0",
        emprestimo.emAtraso && "bg-[rgba(224,91,98,0.05)]",
      )}
      data-emprestimo={emprestimo.equipamento.patrimonio}
    >
      <div className="col-span-2 flex min-w-0 flex-col xl:col-span-1">
        <span className="truncate font-semibold text-(--color-text)">
          {emprestimo.equipamento.nome}
        </span>
        <span className="text-[12px] text-(--text-dim)">
          {ROTULO_CATEGORIA[emprestimo.equipamento.categoria]} · {emprestimo.equipamento.patrimonio}
        </span>
      </div>
      <div className="col-span-2 flex min-w-0 flex-col xl:col-span-1">
        <span className={CELULA_ROTULO}>Pessoa</span>
        <span className="truncate text-(--color-text)">{nomePessoa(emprestimo)}</span>
      </div>
      <div className="flex flex-col">
        <span className={CELULA_ROTULO}>Retirada</span>
        <span className="text-(--text-muted)">{formatarInstanteCurto(emprestimo.retiradoEm)}</span>
      </div>
      <div className="flex flex-col">
        <span className={CELULA_ROTULO}>Prazo</span>
        <span className={emprestimo.emAtraso ? "text-[#E08A90]" : "text-(--text-muted)"}>
          {formatarDataCurta(emprestimo.devolverAte)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className={CELULA_ROTULO}>Situação</span>
        {emprestimo.emAtraso ? (
          <span className="text-[12px] font-semibold text-[#E08A90]">Em atraso</span>
        ) : (
          <span className="text-[12px] text-(--text-muted)">No prazo</span>
        )}
      </div>
      <div className="flex items-end xl:items-center">
        <button
          aria-label={`Devolver ${emprestimo.equipamento.nome} de ${nomePessoa(emprestimo)}`}
          className={cn(
            "h-[30px] rounded-[7px] border px-3 text-[12.5px] font-semibold text-(--accent-200) transition-[background-color,border-color] duration-[140ms] ease-out active:translate-y-px motion-reduce:transition-none",
            emprestimo.emAtraso
              ? "border-(--accent-500) bg-[rgba(91,127,224,0.14)] hover:bg-[rgba(91,127,224,0.24)]"
              : "border-(--border-strong) bg-transparent hover:border-(--accent-500) hover:bg-[rgba(91,127,224,0.1)]",
          )}
          onClick={aoDevolver}
          type="button"
        >
          Devolver
        </button>
      </div>
    </li>
  );
}

/** Tela 05 · Operações: empréstimos em aberto (RF-OPER-01 a 04). */
export function TelaEmprestimosAbertos() {
  const [chip, setChip] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [alvo, setAlvo] = useState<AlvoDevolucao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const filtroAtual = CHIPS[chip]?.filtro ?? { filtro: "todos" };
  const resumo = trpc.operacoes.resumo.useQuery(undefined, {
    refetchInterval: INTERVALO_ATUALIZACAO_MS,
  });
  const lista = trpc.operacoes.emprestimosEmAberto.useInfiniteQuery(
    { ...filtroAtual, limite: TAMANHO_PAGINA_OPERACOES },
    {
      getNextPageParam: (ultima) => ultima.proximoCursor ?? undefined,
      placeholderData: keepPreviousData,
      refetchInterval: INTERVALO_ATUALIZACAO_MS,
    },
  );
  const registrar = trpc.operacoes.registrarDevolucao.useMutation();

  const paginas = lista.data?.pages ?? [];
  const itens = paginas[pagina]?.itens ?? [];
  const temProxima = pagina < paginas.length - 1 || lista.hasNextPage;
  const totalSemFiltro =
    filtroAtual.filtro === "todos" && !filtroAtual.categoria ? resumo.data?.emAberto : undefined;
  const inicio = pagina * TAMANHO_PAGINA_OPERACOES;

  function escolherChip(indice: number) {
    setChip(indice);
    setPagina(0);
  }

  async function avancar() {
    if (pagina >= paginas.length - 1) await lista.fetchNextPage();
    setPagina((atual) => atual + 1);
  }

  return (
    <>
      <CabecalhoPagina>
        <p className="text-[13px] text-(--text-nav)">Operações</p>
        <Link
          className="ml-auto flex h-[34px] shrink-0 items-center gap-2 rounded-[8px] border border-(--accent-500) px-[14px] text-[13px] font-semibold text-(--accent-300) transition-[background-color,color] duration-[140ms] ease-out hover:bg-[rgba(91,127,224,0.12)] hover:text-(--accent-100)"
          href="/operacoes/equipamentos/novo"
        >
          <PlusSquare aria-hidden="true" size={16} />
          Cadastrar equipamento
        </Link>
      </CabecalhoPagina>
      <ConteudoPagina>
        <div className="flex flex-col gap-1" data-screen-label="05 Operações">
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-(--color-text)">
            Empréstimos em aberto
          </h1>
          {resumo.data ? (
            <p className="text-[13px] text-(--text-muted)">
              {resumo.data.emAberto} {resumo.data.emAberto === 1 ? "item fora" : "itens fora"} ·
              atualizado às {FORMATO_HORA.format(new Date(resumo.dataUpdatedAt))}
            </p>
          ) : null}
        </div>

        <dl aria-label="Resumo" className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          <CardEstatistica rotulo="Em aberto" valor={resumo.data?.emAberto} />
          <CardEstatistica rotulo="Vencem em 3 dias" valor={resumo.data?.vencendoEm3Dias} />
          <CardEstatistica alerta rotulo="Em atraso" valor={resumo.data?.emAtraso} />
          <CardEstatistica rotulo="Em manutenção" valor={resumo.data?.emManutencao} />
        </dl>

        <div aria-label="Filtro" className="flex flex-wrap gap-2" role="group">
          {CHIPS.map((opcao, indice) => (
            <button
              aria-pressed={chip === indice}
              className={cn(
                "rounded-full border px-3 py-[6px] text-[12px] transition-[background-color,border-color,color] duration-[140ms] ease-out motion-reduce:transition-none",
                chip === indice
                  ? "border-(--accent-700) bg-(--accent-800) text-(--accent-200)"
                  : "border-(--border-frame) bg-transparent text-(--text-nav) hover:border-(--border-strong) hover:text-(--color-text)",
              )}
              key={opcao.rotulo}
              onClick={() => escolherChip(indice)}
              type="button"
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        {aviso ? (
          <p className="text-[12.5px] text-[#5FD3AA]" role="status">
            {aviso}
          </p>
        ) : null}

        {lista.isPending ? (
          <div
            aria-busy="true"
            className="h-[160px] rounded-[12px] bg-(--surface-sunken)"
            role="status"
          >
            <span className="sr-only">Carregando empréstimos</span>
          </div>
        ) : null}

        {lista.isError && itens.length === 0 ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-[13.5px] text-(--color-text)">{MENSAGEM_FALHA_OPERACOES}</p>
            <Botao
              disabled={lista.isFetching}
              onClick={() => void lista.refetch()}
              tamanho="dialogo"
              variante="secundario"
            >
              Tentar novamente
            </Botao>
          </div>
        ) : null}

        {lista.isSuccess && itens.length === 0 ? (
          <p className="text-[13.5px] text-(--text-muted)">
            {chip === 0 ? MENSAGEM_SEM_EMPRESTIMOS : MENSAGEM_FILTRO_SEM_EMPRESTIMOS}
          </p>
        ) : null}

        {itens.length > 0 ? (
          <div className="overflow-hidden rounded-[12px] border border-(--border-soft)">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[1.3fr_1.1fr_120px_120px_150px_110px] gap-x-4 bg-(--surface-sunken) px-[18px] py-3 text-[11px] tracking-[0.08em] text-(--text-faint) uppercase xl:grid"
            >
              <span>Item</span>
              <span>Pessoa</span>
              <span>Retirada</span>
              <span>Prazo</span>
              <span>Situação</span>
              <span>Ação</span>
            </div>
            <ul aria-label="Empréstimos em aberto">
              {itens.map((emprestimo) => (
                <LinhaEmprestimo
                  aoDevolver={() => {
                    setAviso(null);
                    setAlvo({
                      id: emprestimo.id,
                      nome: emprestimo.equipamento.nome,
                      patrimonio: emprestimo.equipamento.patrimonio,
                    });
                  }}
                  emprestimo={emprestimo}
                  key={emprestimo.id}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {itens.length > 0 ? (
          <nav
            aria-label="Paginação"
            className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-(--text-muted)"
          >
            <span>
              {inicio + 1}–{inicio + itens.length}
              {totalSemFiltro !== undefined ? ` de ${totalSemFiltro}` : ""} empréstimos
            </span>
            <div className="flex gap-2">
              <Botao
                disabled={pagina === 0}
                onClick={() => setPagina((atual) => atual - 1)}
                tamanho="dialogo"
                variante="secundario"
              >
                Anterior
              </Botao>
              <Botao
                disabled={!temProxima || lista.isFetchingNextPage}
                onClick={() => void avancar()}
                tamanho="dialogo"
                variante="secundario"
              >
                Próximo
              </Botao>
            </div>
          </nav>
        ) : null}
      </ConteudoPagina>

      <DialogoDevolucao
        alvo={alvo}
        aoConcluir={(devolvido) => setAviso(`Devolução registrada: ${devolvido.nome}.`)}
        aoFechar={() => setAlvo(null)}
        consequencia="A devolução é registrada no balcão e o item volta ao catálogo se estiver ativo."
        devolver={(emprestimoId) => registrar.mutateAsync({ emprestimoId })}
        pendente={registrar.isPending}
      />
    </>
  );
}
