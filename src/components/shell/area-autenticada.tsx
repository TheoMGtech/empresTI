"use client";

import { TRPCClientError } from "@trpc/client";
import type { ReactNode } from "react";

import { BlocoUsuario } from "@/components/shell/bloco-usuario";
import { Marca } from "@/components/shell/marca";
import { NavegacaoPrincipal } from "@/components/shell/navegacao";
import { ProvedorSessao, type SessaoAplicacao } from "@/components/shell/sessao";
import { trpc } from "@/trpc/cliente";

export const MENSAGEM_FALHA_SESSAO = "Não foi possível carregar a sessão.";

// Erro de autorização não melhora com nova tentativa.
const CODIGOS_SEM_NOVA_TENTATIVA = new Set(["UNAUTHORIZED", "FORBIDDEN", "BAD_REQUEST"]);

function deveTentarDeNovo(falhas: number, erro: unknown) {
  const codigo = erro instanceof TRPCClientError ? erro.data?.code : undefined;
  return falhas < 1 && !(typeof codigo === "string" && CODIGOS_SEM_NOVA_TENTATIVA.has(codigo));
}

function Moldura({
  lateral,
  superior,
  children,
  decorativa = false,
}: {
  lateral: ReactNode;
  superior: ReactNode;
  children: ReactNode;
  decorativa?: boolean;
}) {
  return (
    <div className="min-h-screen bg-(--color-bg) lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside
        aria-hidden={decorativa || undefined}
        aria-label="Barra lateral"
        className="sticky top-0 hidden h-screen flex-col gap-[26px] overflow-y-auto border-r border-(--border-soft) bg-(--sidebar-bg) px-[14px] py-[22px] lg:flex"
      >
        {lateral}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header
          aria-hidden={decorativa || undefined}
          aria-label="Barra superior"
          className="flex flex-col gap-3 border-b border-(--border-soft) bg-(--sidebar-bg) px-3 py-3 lg:hidden"
        >
          {superior}
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function Esqueleto() {
  const bloco = "rounded-[8px] bg-(--surface-sunken)";

  return (
    <Moldura
      decorativa
      lateral={
        <>
          <Marca />
          <div className="flex flex-col gap-[6px]">
            <div className={`${bloco} h-9`} />
            <div className={`${bloco} h-9`} />
          </div>
        </>
      }
      superior={<Marca />}
    >
      <div aria-busy="true" className="flex flex-col gap-4 px-4 py-6 sm:px-7" role="status">
        <span className="sr-only">Carregando sessão</span>
        <div className={`${bloco} h-7 w-48`} />
        <div className={`${bloco} h-24 w-full max-w-[720px]`} />
      </div>
    </Moldura>
  );
}

function FalhaSessao({
  aoTentarNovamente,
  tentando,
}: {
  aoTentarNovamente: () => void;
  tentando: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg) p-4">
      <div
        className="flex w-full max-w-[432px] flex-col gap-4 rounded-[14px] bg-(--color-surface) p-6 shadow-[0_0_0_1px_#454E68,0_18px_44px_rgba(0,0,0,0.7)]"
        role="alert"
      >
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-(--color-text)">
          {MENSAGEM_FALHA_SESSAO}
        </h1>
        <p className="text-[13.5px] text-(--text-muted)">Verifique a conexão e tente novamente.</p>
        <button
          className="flex h-[38px] items-center justify-center self-end rounded-[8px] border border-(--border-strong) bg-transparent px-4 text-[13px] text-(--text-nav) transition-[border-color,color] duration-[140ms] ease-out hover:enabled:border-(--border-hover) hover:enabled:text-(--color-text) disabled:opacity-45 motion-reduce:transition-none"
          disabled={tentando}
          onClick={aoTentarNovamente}
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function Area({ sessao, children }: { sessao: SessaoAplicacao; children: ReactNode }) {
  return (
    <ProvedorSessao value={sessao}>
      <Moldura
        lateral={
          <>
            <Marca />
            <NavegacaoPrincipal papel={sessao.papel} variante="lateral" />
            <div className="mt-auto">
              <BlocoUsuario sessao={sessao} />
            </div>
          </>
        }
        superior={
          <>
            <div className="flex items-center justify-between gap-3">
              <Marca />
              <BlocoUsuario compacto sessao={sessao} />
            </div>
            <NavegacaoPrincipal papel={sessao.papel} variante="superior" />
          </>
        }
      >
        {children}
      </Moldura>
    </ProvedorSessao>
  );
}

/** Shell autenticado (RF-SESSAO-07, RF-SESSAO-13): identificação, navegação por papel e Sair. */
export function AreaAutenticada({ children }: { children: ReactNode }) {
  const sessao = trpc.sessao.atual.useQuery(undefined, { retry: deveTentarDeNovo });

  if (sessao.isPending) return <Esqueleto />;

  if (sessao.isError) {
    return (
      <FalhaSessao aoTentarNovamente={() => void sessao.refetch()} tentando={sessao.isFetching} />
    );
  }

  return <Area sessao={sessao.data}>{children}</Area>;
}
