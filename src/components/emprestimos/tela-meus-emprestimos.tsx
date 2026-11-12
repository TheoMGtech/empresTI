"use client";

import Link from "next/link";
import { useState } from "react";

import { ROTULO_CATEGORIA } from "@/components/catalogo/categorias";
import { MiniaturaEquipamento } from "@/components/catalogo/miniatura-equipamento";
import { BarraPrazo } from "@/components/emprestimos/barra-prazo";
import { DialogoDevolucao, type AlvoDevolucao } from "@/components/emprestimos/devolucao";
import { useMeuResumo } from "@/components/emprestimos/resumo";
import { SegmentosLimite } from "@/components/emprestimos/segmentos-limite";
import { CabecalhoPagina, ConteudoPagina } from "@/components/shell/pagina";
import { Trilha } from "@/components/shell/trilha";
import { Botao } from "@/components/ui/botao";
import { formatarInstanteCurto } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/cliente";
import type { SaidasRouter } from "@/trpc/tipos";

type EmprestimoAberto = SaidasRouter["emprestimos"]["meus"][number];

export const MENSAGEM_SEM_ITENS = "Nenhum item com você.";
export const MENSAGEM_FALHA_MEUS = "Não foi possível carregar seus empréstimos.";
export const TAMANHO_PAGINA_HISTORICO = 10;

const REGUA_ESMAECIDA =
  "h-px w-full bg-[linear-gradient(to_right,rgba(230,234,246,0),#222C4A_48px,#222C4A_calc(100%-48px),rgba(230,234,246,0))]";

function resumoTexto(itensAbertos: number, limite: number, emAtraso: number) {
  const atraso = emAtraso === 0 ? "nenhum em atraso" : `${emAtraso} em atraso`;
  return `${itensAbertos} de ${limite} itens · ${atraso}`;
}

function LinhaEmprestimo({
  emprestimo,
  aoDevolver,
}: {
  emprestimo: EmprestimoAberto;
  aoDevolver: () => void;
}) {
  const { equipamento } = emprestimo;

  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-[18px] gap-y-3 border-t border-(--border-row) px-4 py-4 first:border-t-0 sm:px-5 md:grid-cols-[44px_minmax(0,1fr)_180px_auto]",
        emprestimo.emAtraso && "bg-[rgba(224,91,98,0.05)]",
      )}
      data-emprestimo={equipamento.patrimonio}
    >
      <span className="[&>span]:size-11 [&>span]:rounded-[10px]">
        <MiniaturaEquipamento categoria={equipamento.categoria} imagemUrl={equipamento.imagemUrl} />
      </span>
      <div className="flex min-w-0 flex-col gap-[2px]">
        <h3 className="truncate text-[15px] font-semibold text-(--color-text)">
          {equipamento.nome}
        </h3>
        <p className="text-[12px] text-(--text-dim)">
          {ROTULO_CATEGORIA[equipamento.categoria]} · {equipamento.patrimonio} · retirado em{" "}
          {formatarInstanteCurto(emprestimo.retiradoEm)}
        </p>
      </div>
      <div className="col-span-2 md:col-span-1">
        <BarraPrazo
          devolverAte={emprestimo.devolverAte}
          emAtraso={emprestimo.emAtraso}
          retiradoEm={emprestimo.retiradoEm}
        />
      </div>
      <button
        aria-label={`Devolver ${equipamento.nome}`}
        className={cn(
          "col-span-2 h-9 rounded-[8px] border px-4 text-[13px] font-semibold text-(--accent-200) transition-[background-color,border-color] duration-[140ms] ease-out active:translate-y-px motion-reduce:transition-none md:col-span-1",
          emprestimo.emAtraso
            ? "border-(--accent-500) bg-[rgba(91,127,224,0.14)] hover:bg-[rgba(91,127,224,0.24)]"
            : "border-(--border-strong) bg-transparent hover:border-(--accent-500) hover:bg-[rgba(91,127,224,0.1)]",
        )}
        onClick={aoDevolver}
        type="button"
      >
        Devolver
      </button>
    </li>
  );
}

function Historico() {
  const consulta = trpc.emprestimos.historico.useInfiniteQuery(
    { limite: TAMANHO_PAGINA_HISTORICO },
    { getNextPageParam: (pagina) => pagina.proximoCursor ?? undefined },
  );
  const itens = consulta.data?.pages.flatMap((pagina) => pagina.itens) ?? [];

  return (
    <section aria-labelledby="titulo-historico-pessoal" className="flex flex-col gap-3">
      <h2 className="text-[17px] font-semibold text-(--color-text)" id="titulo-historico-pessoal">
        Histórico
      </h2>
      {consulta.isPending ? (
        <p className="text-[13px] text-(--text-muted)" role="status">
          Carregando histórico
        </p>
      ) : null}
      {consulta.isError ? (
        <p className="text-[13px] text-(--color-text)" role="alert">
          Não foi possível carregar o histórico.
        </p>
      ) : null}
      {consulta.isSuccess && itens.length === 0 ? (
        <p className="text-[13px] text-(--text-muted)">Nenhuma devolução registrada.</p>
      ) : null}
      {itens.length > 0 ? (
        <div className="overflow-x-auto rounded-[12px] border border-(--border-soft)">
          <table className="w-full min-w-[480px] table-fixed text-[13px]">
            <colgroup>
              <col />
              <col className="w-[110px] md:w-[150px]" />
              <col className="w-[110px] md:w-[150px]" />
              <col className="w-[110px] md:w-[130px]" />
            </colgroup>
            <thead className="bg-(--surface-sunken) text-left text-[11px] tracking-[0.08em] text-(--text-faint) uppercase">
              <tr>
                <th className="px-4 py-3 font-normal">Item</th>
                <th className="px-4 py-3 font-normal">Retirada</th>
                <th className="px-4 py-3 font-normal">Devolução</th>
                <th className="px-4 py-3 font-normal">Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr className="border-t border-(--border-row)" key={item.id}>
                  <td className="truncate px-4 py-3 text-(--color-text)">
                    {item.equipamento.nome}
                  </td>
                  <td className="px-4 py-3 text-(--text-muted)">
                    {formatarInstanteCurto(item.retiradoEm)}
                  </td>
                  <td className="px-4 py-3 text-(--text-muted)">
                    {formatarInstanteCurto(item.devolvidoEm)}
                  </td>
                  <td className="px-4 py-3">
                    {item.noPrazo ? (
                      <span className="rounded-full border border-[rgba(63,185,140,0.35)] bg-[rgba(63,185,140,0.12)] px-[9px] py-[3px] text-[11px] font-semibold text-[#5FD3AA]">
                        No prazo
                      </span>
                    ) : (
                      <span className="rounded-full border border-[rgba(224,163,63,0.35)] bg-[rgba(224,163,63,0.12)] px-[9px] py-[3px] text-[11px] font-semibold text-[#E8B961]">
                        Com atraso
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {consulta.hasNextPage ? (
        <Botao
          className="self-start"
          disabled={consulta.isFetchingNextPage}
          onClick={() => void consulta.fetchNextPage()}
          tamanho="dialogo"
          variante="secundario"
        >
          {consulta.isFetchingNextPage ? "Carregando..." : "Mostrar mais"}
        </Botao>
      ) : null}
    </section>
  );
}

/** Tela 04 · Meus empréstimos (RF-DEVOL-01 a 06). */
export function TelaMeusEmprestimos() {
  const meus = trpc.emprestimos.meus.useQuery();
  const { data: resumo } = useMeuResumo();
  const devolver = trpc.emprestimos.devolver.useMutation();
  const [alvo, setAlvo] = useState<AlvoDevolucao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const itens = meus.data ?? [];

  return (
    <>
      <CabecalhoPagina>
        <Trilha itens={[{ rotulo: "Meus empréstimos" }]} />
        <Link
          className="ml-auto flex h-[34px] shrink-0 items-center rounded-[8px] border border-(--accent-500) px-[14px] text-[13px] font-semibold text-(--accent-300) transition-[background-color,color] duration-[140ms] ease-out hover:bg-[rgba(91,127,224,0.12)] hover:text-(--accent-100)"
          href="/catalogo"
        >
          Pegar emprestado
        </Link>
      </CabecalhoPagina>
      <ConteudoPagina>
        <div
          className="flex flex-wrap items-end justify-between gap-4"
          data-screen-label="04 Meus empréstimos"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-(--color-text)">
              Comigo agora
            </h1>
            {resumo ? (
              <p className="text-[13px] text-(--text-muted)">
                {resumoTexto(resumo.itensAbertos, resumo.limite, resumo.emAtraso)}
              </p>
            ) : null}
          </div>
          {resumo ? (
            <SegmentosLimite
              className="w-[180px]"
              limite={resumo.limite}
              usados={resumo.itensAbertos}
            />
          ) : null}
        </div>

        {aviso ? (
          <p className="text-[12.5px] text-[#5FD3AA]" role="status">
            {aviso}
          </p>
        ) : null}

        {meus.isPending ? (
          <div
            aria-busy="true"
            className="h-[88px] rounded-[12px] bg-(--surface-sunken)"
            role="status"
          >
            <span className="sr-only">Carregando seus empréstimos</span>
          </div>
        ) : null}

        {meus.isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-[13.5px] text-(--color-text)">{MENSAGEM_FALHA_MEUS}</p>
            <Botao
              disabled={meus.isFetching}
              onClick={() => void meus.refetch()}
              tamanho="dialogo"
              variante="secundario"
            >
              Tentar novamente
            </Botao>
          </div>
        ) : null}

        {meus.isSuccess && itens.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[13.5px] text-(--text-muted)">{MENSAGEM_SEM_ITENS}</p>
            <Link href="/catalogo">Ver o catálogo</Link>
          </div>
        ) : null}

        {itens.length > 0 ? (
          <ul
            aria-label="Itens com você"
            className="overflow-hidden rounded-[12px] border border-(--border-card) bg-(--color-surface)"
          >
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
        ) : null}

        <div className={REGUA_ESMAECIDA} />

        <Historico />
      </ConteudoPagina>

      <DialogoDevolucao
        alvo={alvo}
        aoConcluir={(devolvido) => setAviso(`Devolução registrada: ${devolvido.nome}.`)}
        aoFechar={() => setAlvo(null)}
        devolver={(emprestimoId) => devolver.mutateAsync({ emprestimoId })}
        pendente={devolver.isPending}
      />
    </>
  );
}
