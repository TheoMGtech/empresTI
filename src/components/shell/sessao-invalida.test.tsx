import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AreaAutenticada, MENSAGEM_ACESSO_NAO_LIBERADO } from "@/components/shell/area-autenticada";
import { GuardaOperacoes, MENSAGEM_RESTRITO_OPERACOES } from "@/components/shell/guarda-operacoes";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import { trpc } from "@/trpc/cliente";

const { navegacao } = vi.hoisted(() => ({
  navegacao: { caminho: "/operacoes/emprestimos", substituir: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navegacao.caminho,
  useRouter: () => ({ replace: navegacao.substituir, push: vi.fn(), prefetch: vi.fn() }),
}));

const COLABORADORA = { nomeExibicao: "Marina Alves", papel: "colaborador" as const };
const OPERACOES = { nomeExibicao: "Rafael Lima", papel: "operacoes" as const };

/** Página que consulta um procedimento, para simular a sessão expirando no meio do uso. */
function PaginaComConsulta() {
  const consulta = trpc.equipamentos.listar.useQuery({});
  return <p>{consulta.isSuccess ? "Catálogo carregado" : "Carregando catálogo"}</p>;
}

function renderizar(conteudo: ReactNode, manipuladores: ManipuladoresTRPC) {
  return renderizarComTRPC(<AreaAutenticada>{conteudo}</AreaAutenticada>, manipuladores);
}

beforeEach(() => {
  navegacao.caminho = "/operacoes/emprestimos";
  navegacao.substituir.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("T-SESSAO-09 — sessão inválida e acesso restrito", () => {
  it("CA-SESSAO-07 — sessão sem membership vê acesso não liberado e consegue sair", async () => {
    const sair = vi.fn(() => ({ autenticado: false }));
    renderizar(<p>Conteúdo da página</p>, {
      "sessao.atual": () => {
        throw erroTRPC("FORBIDDEN", MENSAGEM_ACESSO_NAO_LIBERADO);
      },
      "autenticacao.sair": sair,
    });

    expect(
      await screen.findByRole("heading", { name: MENSAGEM_ACESSO_NAO_LIBERADO }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(navegacao.substituir).toHaveBeenCalledWith("/"));
    expect(sair).toHaveBeenCalledTimes(1);
  });

  it("CA-SESSAO-08 — múltiplos memberships também ficam sem acesso, sem escolher tenant", async () => {
    const listar = vi.fn();
    renderizar(<p>Conteúdo da página</p>, {
      "sessao.atual": () => {
        throw erroTRPC("FORBIDDEN", MENSAGEM_ACESSO_NAO_LIBERADO, {
          motivo: "MULTIPLOS_MEMBERSHIPS",
        });
      },
      "equipamentos.listar": listar,
    });

    expect(
      await screen.findByRole("heading", { name: MENSAGEM_ACESSO_NAO_LIBERADO }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
    expect(listar).not.toHaveBeenCalled();
  });

  it("CA-SESSAO-09 — sem sessão ao abrir a área, volta a / e limpa o cache", async () => {
    const { clienteConsulta } = renderizar(<p>Conteúdo da página</p>, {
      "sessao.atual": () => {
        throw erroTRPC("UNAUTHORIZED", "Sessão encerrada. Entre novamente.");
      },
    });
    const limpar = vi.spyOn(clienteConsulta, "clear");

    await waitFor(() => expect(navegacao.substituir).toHaveBeenCalledWith("/"));
    expect(limpar).toHaveBeenCalled();
    expect(navegacao.substituir).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
  });

  it("CA-SESSAO-09 — sessão que expira durante o uso volta a / e limpa o cache", async () => {
    const { clienteConsulta } = renderizar(<PaginaComConsulta />, {
      "sessao.atual": () => COLABORADORA,
      "equipamentos.listar": () => {
        throw erroTRPC("UNAUTHORIZED", "Sessão encerrada. Entre novamente.");
      },
    });
    const limpar = vi.spyOn(clienteConsulta, "clear");

    await waitFor(() => expect(navegacao.substituir).toHaveBeenCalledWith("/"));
    expect(limpar).toHaveBeenCalled();
  });

  it("CA-SESSAO-09 — erro que não é de sessão não encerra o acesso", async () => {
    renderizar(<PaginaComConsulta />, {
      "sessao.atual": () => COLABORADORA,
      "equipamentos.listar": () => {
        throw erroTRPC("FORBIDDEN", "Acesso restrito a Operações.");
      },
    });

    expect(await screen.findByText("Carregando catálogo")).toBeInTheDocument();
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(navegacao.substituir).not.toHaveBeenCalled();
  });

  it("CA-SESSAO-10 — colaborador em /operacoes/* vê Acesso restrito a Operações", async () => {
    renderizar(
      <GuardaOperacoes>
        <p>Painel de Operações</p>
      </GuardaOperacoes>,
      { "sessao.atual": () => COLABORADORA },
    );

    expect(
      await screen.findByRole("heading", { name: MENSAGEM_RESTRITO_OPERACOES }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Painel de Operações")).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Barra lateral" })).toBeInTheDocument();
  });

  it("CA-SESSAO-10 — operacoes em /operacoes/* vê o conteúdo", async () => {
    renderizar(
      <GuardaOperacoes>
        <p>Painel de Operações</p>
      </GuardaOperacoes>,
      { "sessao.atual": () => OPERACOES },
    );

    expect(await screen.findByText("Painel de Operações")).toBeInTheDocument();
    expect(screen.queryByText(MENSAGEM_RESTRITO_OPERACOES)).not.toBeInTheDocument();
  });
});
