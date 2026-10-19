"use client";

import { trpc } from "@/trpc/cliente";

type Estado = "operacional" | "pendente" | "verificando";

const ROTULOS: Record<Estado, string> = {
  operacional: "Operacional",
  pendente: "Pendente",
  verificando: "Verificando",
};

function Indicador({ estado }: { estado: Estado }) {
  return (
    <span className={`indicador indicador--${estado}`}>
      <span aria-hidden="true" className="indicador__ponto" />
      {ROTULOS[estado]}
    </span>
  );
}

export function PainelStatus() {
  const status = trpc.tecnico.status.useQuery(undefined, {
    refetchInterval: 30_000,
    retry: 1,
  });

  const horario = status.data?.verificadoEm
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(status.data.verificadoEm))
    : "—";

  const estadoApi: Estado = status.isPending
    ? "verificando"
    : status.isError
      ? "pendente"
      : "operacional";

  return (
    <main className="pagina-status">
      <header className="topo">
        <a className="marca" href="#inicio" aria-label="EmpresTI — início">
          <span className="marca__sinal" aria-hidden="true">
            E
          </span>
          <span>EmpresTI</span>
        </a>
        <span className="ambiente">FUNDAÇÃO TÉCNICA</span>
      </header>

      <section className="hero" id="inicio">
        <p className="sobretitulo">STATUS DO SISTEMA / ANDAR ZERO</p>
        <h1>A base está de pé.</h1>
        <p className="hero__texto">
          Uma prova operacional da arquitetura. Sem catálogo. Sem empréstimos. Sem regra de negócio
          inventada.
        </p>
      </section>

      <section className="grade" aria-label="Estado dos componentes técnicos">
        <article className="cartao">
          <div className="cartao__cabecalho">
            <span className="cartao__numero">01</span>
            <Indicador estado="operacional" />
          </div>
          <div>
            <h2>Aplicação</h2>
            <p>Next.js · App Router · TypeScript estrito</p>
          </div>
        </article>

        <article className="cartao">
          <div className="cartao__cabecalho">
            <span className="cartao__numero">02</span>
            <Indicador estado={estadoApi} />
          </div>
          <div>
            <h2>API técnica</h2>
            <p>tRPC · TanStack Query · Route Handler</p>
          </div>
        </article>

        <article className="cartao">
          <div className="cartao__cabecalho">
            <span className="cartao__numero">03</span>
            <Indicador estado={status.data?.supabaseVinculado ? "operacional" : "pendente"} />
          </div>
          <div>
            <h2>Supabase</h2>
            <p>Projeto restrito · banco aguardando migration aprovada</p>
          </div>
        </article>
      </section>

      <footer className="rodape">
        <dl>
          <div>
            <dt>AMBIENTE</dt>
            <dd>{status.data?.ambiente ?? "—"}</dd>
          </div>
          <div>
            <dt>ÚLTIMA VERIFICAÇÃO</dt>
            <dd>{horario}</dd>
          </div>
          <div>
            <dt>VERSÃO</dt>
            <dd>{status.data?.versao ?? "0.1.0"}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => void status.refetch()} disabled={status.isFetching}>
          {status.isFetching ? "VERIFICANDO" : "VERIFICAR AGORA"}
        </button>
      </footer>
    </main>
  );
}
