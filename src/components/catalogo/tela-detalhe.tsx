"use client";

import { TRPCClientError } from "@trpc/client";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { CardSolicitacao } from "@/components/catalogo/card-solicitacao";
import {
  ICONE_CATEGORIA,
  ROTULO_CATEGORIA,
  ROTULO_CATEGORIA_PLURAL,
} from "@/components/catalogo/categorias";
import { PillSituacao } from "@/components/catalogo/pill-situacao";
import { CardSeusItens } from "@/components/emprestimos/card-seus-itens";
import { ControleSituacao } from "@/components/operacoes/controle-situacao";
import { useSessaoOpcional } from "@/components/shell/sessao";
import { ContadorItens } from "@/components/emprestimos/contador-itens";
import { CabecalhoPagina, ConteudoPagina } from "@/components/shell/pagina";
import { Trilha } from "@/components/shell/trilha";
import { Botao } from "@/components/ui/botao";
import { formatarDataCurta, formatarInstanteCurto } from "@/lib/datas";
import { trpc } from "@/trpc/cliente";
import type { SaidasRouter } from "@/trpc/tipos";

type DetalheEquipamento = SaidasRouter["equipamentos"]["detalhar"];

export const MENSAGEM_NAO_ENCONTRADO = "Equipamento não encontrado.";
export const MENSAGEM_FALHA_DETALHE = "Não foi possível carregar o equipamento.";

const REGUA_ESMAECIDA =
  "h-px w-full bg-[linear-gradient(to_right,rgba(230,234,246,0),#222C4A_48px,#222C4A_calc(100%-48px),rgba(230,234,246,0))]";

function ImagemDetalhe({ detalhe }: { detalhe: DetalheEquipamento }) {
  const [falhou, setFalhou] = useState(false);
  const Icone = ICONE_CATEGORIA[detalhe.categoria];
  const usarFoto = Boolean(detalhe.imagemUrl) && !falhou;

  return (
    <div
      className="grid h-[260px] place-items-center overflow-hidden rounded-[12px] border border-(--border-card) bg-[radial-gradient(120%_120%_at_20%_0%,#132663_0%,#0B1128_60%)]"
      data-imagem={usarFoto ? "foto" : "icone"}
    >
      {usarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={detalhe.nome}
          className="size-full object-cover"
          decoding="async"
          height={600}
          onError={() => setFalhou(true)}
          src={detalhe.imagemUrl ?? undefined}
          width={800}
        />
      ) : (
        <Icone aria-hidden="true" className="text-(--accent-600)" size={64} />
      )}
    </div>
  );
}

/** RF-SOLIC-05: só os campos com valor. Série e observações só chegam para Operações. */
function FichaTecnica({ detalhe }: { detalhe: DetalheEquipamento }) {
  const campos: [string, string | null | undefined][] = [
    ["Categoria", ROTULO_CATEGORIA[detalhe.categoria]],
    ["Patrimônio", detalhe.patrimonio],
    ["Local", detalhe.local],
    [
      "Última devolução",
      detalhe.ultimaDevolucao ? formatarInstanteCurto(detalhe.ultimaDevolucao) : null,
    ],
    ["Número de série", detalhe.numeroSerie],
  ];

  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
      {campos
        .filter((campo): campo is [string, string] => Boolean(campo[1]))
        .map(([rotulo, valor]) => (
          <div className="flex min-w-0 flex-col gap-1" key={rotulo}>
            <dt className="text-[11px] tracking-[0.08em] text-(--text-faint) uppercase">
              {rotulo}
            </dt>
            <dd className="truncate text-[13.5px] text-(--color-text)">{valor}</dd>
          </div>
        ))}
    </dl>
  );
}

function Historico({ historico }: { historico: NonNullable<DetalheEquipamento["historico"]> }) {
  return (
    <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-historico">
        Histórico
      </h2>
      {historico.length === 0 ? (
        <p className="text-[13px] text-(--text-muted)">Nenhum empréstimo registrado.</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-[12px] border border-(--border-soft)">
          {historico.map((emprestimo) => (
            <li
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-1 border-t border-(--border-row) px-4 py-3 text-[13px] first:border-t-0 sm:grid-cols-[64px_minmax(0,1fr)_auto]"
              key={emprestimo.retiradoEm.toISOString()}
            >
              <span className="text-(--text-faint)">
                {formatarInstanteCurto(emprestimo.retiradoEm)}
              </span>
              <span className="truncate text-(--color-text)">
                Retirado por {emprestimo.tomadorNome ?? "pessoa sem nome cadastrado"}
              </span>
              <span className="col-start-2 text-(--text-muted) sm:col-start-auto">
                {emprestimo.devolvidoEm
                  ? `Devolvido em ${formatarInstanteCurto(emprestimo.devolvidoEm)}`
                  : `Em aberto · devolve ${formatarDataCurta(emprestimo.devolverAte)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Estado({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-start gap-3">{children}</div>;
}

/** Tela 03 · Detalhe do equipamento (RF-SOLIC-01, 03 e 05). */
export function TelaDetalhe({ patrimonio }: { patrimonio: string }) {
  const sessao = useSessaoOpcional();
  const consulta = trpc.equipamentos.detalhar.useQuery({ patrimonio });
  const detalhe = consulta.data;
  const codigo =
    consulta.error instanceof TRPCClientError ? (consulta.error.data?.code as string) : undefined;

  const trilha = [
    { rotulo: "Catálogo", href: "/catalogo" },
    ...(detalhe ? [{ rotulo: ROTULO_CATEGORIA_PLURAL[detalhe.categoria] }] : []),
    { rotulo: detalhe?.nome ?? patrimonio },
  ];

  return (
    <>
      <CabecalhoPagina>
        <Trilha itens={trilha} />
        <ContadorItens />
      </CabecalhoPagina>
      <ConteudoPagina>
        {consulta.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-4" role="status">
            <span className="sr-only">Carregando equipamento</span>
            <div className="h-[260px] rounded-[12px] bg-(--surface-sunken)" />
            <div className="h-8 w-64 rounded-[8px] bg-(--surface-sunken)" />
          </div>
        ) : null}

        {codigo === "NOT_FOUND" ? (
          <Estado>
            <h1 className="text-[24px] font-semibold text-(--color-text)">
              {MENSAGEM_NAO_ENCONTRADO}
            </h1>
            <Link href="/catalogo">Voltar ao catálogo</Link>
          </Estado>
        ) : null}

        {consulta.isError && codigo !== "NOT_FOUND" ? (
          <Estado>
            <p className="text-[13.5px] text-(--color-text)" role="alert">
              {MENSAGEM_FALHA_DETALHE}
            </p>
            <Botao
              disabled={consulta.isFetching}
              onClick={() => void consulta.refetch()}
              tamanho="dialogo"
              variante="secundario"
            >
              Tentar novamente
            </Botao>
          </Estado>
        ) : null}

        {detalhe ? (
          <div
            className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_356px]"
            data-screen-label="03 Detalhe do item"
          >
            <div className="flex min-w-0 flex-col gap-6">
              <ImagemDetalhe detalhe={detalhe} />
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.01em] text-(--color-text)">
                  {detalhe.nome}
                </h1>
                <PillSituacao estado={detalhe.disponibilidade.estado} />
              </div>
              {detalhe.observacoes ? (
                <p className="max-w-[60ch] text-[13.5px] text-pretty text-(--text-muted)">
                  {detalhe.observacoes}
                </p>
              ) : null}
              <div className={REGUA_ESMAECIDA} />
              <FichaTecnica detalhe={detalhe} />
              {detalhe.historico ? <Historico historico={detalhe.historico} /> : null}
            </div>
            <aside aria-label="Solicitação" className="flex flex-col gap-4">
              <CardSolicitacao detalhe={detalhe} />
              <CardSeusItens />
              {sessao?.papel === "operacoes" ? <ControleSituacao detalhe={detalhe} /> : null}
            </aside>
          </div>
        ) : null}
      </ConteudoPagina>
    </>
  );
}
