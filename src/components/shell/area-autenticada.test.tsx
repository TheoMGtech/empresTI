import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AreaAutenticada, MENSAGEM_FALHA_SESSAO } from "@/components/shell/area-autenticada";
import { MENSAGEM_FALHA_SAIDA } from "@/components/shell/sair";
import { iniciais } from "@/components/shell/sessao";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";

const { navegacao } = vi.hoisted(() => ({
  navegacao: { caminho: "/catalogo", substituir: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navegacao.caminho,
  useRouter: () => ({ replace: navegacao.substituir, push: vi.fn(), prefetch: vi.fn() }),
}));

const COLABORADORA = { nomeExibicao: "Marina Alves", papel: "colaborador" as const };
const OPERACOES = { nomeExibicao: "Rafael Lima", papel: "operacoes" as const };

function renderizar(manipuladores: ManipuladoresTRPC) {
  return renderizarComTRPC(
    <AreaAutenticada>
      <p>Conteúdo da página</p>
    </AreaAutenticada>,
    manipuladores,
  );
}

async function barraLateral() {
  return within(await screen.findByRole("complementary", { name: "Barra lateral" }));
}

beforeEach(() => {
  navegacao.caminho = "/catalogo";
  navegacao.substituir.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("T-SESSAO-08 — shell autenticado", () => {
  it("CA-SESSAO-06 — colaborador não vê o grupo Operações", async () => {
    renderizar({ "sessao.atual": () => COLABORADORA });

    const lateral = await barraLateral();
    expect(lateral.getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "/catalogo");
    expect(lateral.getByRole("link", { name: "Meus empréstimos" })).toHaveAttribute(
      "href",
      "/meus-emprestimos",
    );
    expect(lateral.queryByText("Operações")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Empréstimos em aberto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cadastrar equipamento" })).not.toBeInTheDocument();
  });

  it("CA-SESSAO-06 — operacoes vê o grupo Operações na barra lateral e na superior", async () => {
    renderizar({ "sessao.atual": () => OPERACOES });

    const lateral = await barraLateral();
    expect(lateral.getByText("Operações", { selector: "p.uppercase" })).toBeInTheDocument();
    expect(lateral.getByRole("link", { name: "Empréstimos em aberto" })).toHaveAttribute(
      "href",
      "/operacoes/emprestimos",
    );
    expect(lateral.getByRole("link", { name: "Cadastrar equipamento" })).toHaveAttribute(
      "href",
      "/operacoes/equipamentos/novo",
    );

    const superior = within(screen.getByRole("banner", { name: "Barra superior" }));
    expect(superior.getByRole("list", { name: "Operações" })).toBeInTheDocument();
    expect(superior.getByRole("link", { name: "Empréstimos em aberto" })).toBeInTheDocument();
  });

  it("RF-SESSAO-07 — identifica a pessoa pelo nome e mostra o papel", async () => {
    renderizar({ "sessao.atual": () => OPERACOES });

    const lateral = await barraLateral();
    expect(lateral.getByText("Rafael Lima")).toBeInTheDocument();
    expect(lateral.getByText("RL")).toBeInTheDocument();
    expect(lateral.getAllByText("Operações").length).toBeGreaterThan(0);
  });

  it("RF-SESSAO-07 — sem nome de exibição, mostra o papel", async () => {
    renderizar({ "sessao.atual": () => ({ nomeExibicao: null, papel: "colaborador" }) });

    const lateral = await barraLateral();
    expect(lateral.getByText("Colaborador", { selector: "p.truncate" })).toBeInTheDocument();
    expect(lateral.getByText("C")).toBeInTheDocument();
  });

  it("RF-SESSAO-07 — marca o item da rota atual como ativo", async () => {
    navegacao.caminho = "/catalogo/TI-0001";
    renderizar({ "sessao.atual": () => COLABORADORA });

    const lateral = await barraLateral();
    expect(lateral.getByRole("link", { name: "Catálogo" })).toHaveAttribute("aria-current", "page");
    expect(lateral.getByRole("link", { name: "Meus empréstimos" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("RF-SESSAO-07 — renderiza o conteúdo da página dentro do main", async () => {
    renderizar({ "sessao.atual": () => COLABORADORA });

    const conteudo = await screen.findByText("Conteúdo da página");
    expect(conteudo.closest("main")).toBe(screen.getByRole("main"));
  });

  it("CA-SESSAO-13 — sidebar só a partir de 1024px; abaixo, barra superior que quebra linha", async () => {
    renderizar({ "sessao.atual": () => OPERACOES });

    const aside = await screen.findByRole("complementary", { name: "Barra lateral" });
    expect(aside).toHaveClass("hidden", "lg:flex", "sticky");
    expect(aside.parentElement).toHaveClass("lg:grid-cols-[236px_minmax(0,1fr)]");

    const superior = screen.getByRole("banner", { name: "Barra superior" });
    expect(superior).toHaveClass("lg:hidden");
    expect(within(superior).getByRole("navigation").querySelector("ul")).toHaveClass("flex-wrap");
    expect(screen.getByRole("main")).toHaveClass("min-w-0");
  });

  it("CA-LOGIN-06/RF-SESSAO-12 — Sair, na sidebar, encerra a sessão, limpa o cache e volta a /", async () => {
    const sair = vi.fn(() => ({ autenticado: false }));
    const { clienteConsulta } = renderizar({
      "sessao.atual": () => COLABORADORA,
      "autenticacao.sair": sair,
    });
    const limpar = vi.spyOn(clienteConsulta, "clear");

    const lateral = await barraLateral();
    fireEvent.click(lateral.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(navegacao.substituir).toHaveBeenCalledWith("/"));
    expect(sair).toHaveBeenCalledTimes(1);
    expect(limpar).toHaveBeenCalled();
  });

  it("RF-SESSAO-12 — falha ao sair mantém a sessão e avisa", async () => {
    renderizar({
      "sessao.atual": () => COLABORADORA,
      "autenticacao.sair": () => {
        throw erroTRPC("INTERNAL_SERVER_ERROR", MENSAGEM_FALHA_SAIDA);
      },
    });

    const lateral = await barraLateral();
    fireEvent.click(lateral.getByRole("button", { name: "Sair" }));

    expect(await lateral.findByText(MENSAGEM_FALHA_SAIDA)).toBeInTheDocument();
    expect(navegacao.substituir).not.toHaveBeenCalled();
  });

  it("RF-SESSAO-07 — mostra o carregamento enquanto a sessão não chega", () => {
    renderizar({ "sessao.atual": () => new Promise(() => undefined) });

    expect(screen.getByRole("status")).toHaveTextContent("Carregando sessão");
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
  });

  it("RF-SESSAO-07 — falha ao carregar a sessão permite tentar de novo", async () => {
    let chamadas = 0;
    renderizar({
      "sessao.atual": () => {
        chamadas += 1;
        if (chamadas <= 2) throw erroTRPC("INTERNAL_SERVER_ERROR", "falha");
        return COLABORADORA;
      },
    });

    const alerta = await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(alerta).toHaveTextContent(MENSAGEM_FALHA_SESSAO);
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Conteúdo da página")).toBeInTheDocument();
  });

  it("RF-SESSAO-07 — iniciais usam o primeiro e o último nome", () => {
    expect(iniciais("Ana Maria Sato")).toBe("AS");
    expect(iniciais("operações")).toBe("O");
  });
});
