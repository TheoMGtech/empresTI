import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ItemCatalogo } from "@/components/catalogo/categorias";
import { MENSAGEM_FILTRO_VAZIO, TelaCatalogo } from "@/components/catalogo/tela-catalogo";
import { ProvedorSessao } from "@/components/shell/sessao";
import { renderizarComTRPC } from "@/test/trpc";

// Dados fictícios de teste. O filtro real é do servidor (CA-CATALOGO-07 no backend); aqui a
// simulação aplica o mesmo critério para provar que a tela envia a entrada certa e mostra o
// resultado.
const ITENS: ItemCatalogo[] = [
  ["TI-0001", "Notebook 14 polegadas", "notebook", "disponivel"],
  ["TI-0004", "Notebook 15 polegadas", "notebook", "manutencao"],
  ["TI-0005", "Monitor 24 polegadas", "monitor", "disponivel"],
  ["TI-0008", "Cabo HDMI 2 m", "cabo", "disponivel"],
  ["TI-0011", "Webcam Full HD", "camera", "disponivel"],
].map(([patrimonio, nome, categoria, estado]) => ({
  patrimonio: patrimonio as string,
  nome: nome as string,
  categoria: categoria as ItemCatalogo["categoria"],
  imagemUrl: null,
  disponibilidade: { estado } as ItemCatalogo["disponibilidade"],
}));

type Entrada = { categoria?: string; somenteDisponiveis?: boolean; limite?: number };

function listarComFiltro(entrada: unknown) {
  const { categoria, somenteDisponiveis } = entrada as Entrada;
  const itens = ITENS.filter(
    (item) =>
      (!categoria || item.categoria === categoria) &&
      (!somenteDisponiveis || item.disponibilidade.estado === "disponivel"),
  );
  return { itens, proximoCursor: null, resumo: { total: 5, disponiveis: 4 } };
}

function renderizar(listar: (entrada: unknown) => unknown) {
  return renderizarComTRPC(
    <ProvedorSessao value={{ nomeExibicao: "Marina Alves", papel: "colaborador" }}>
      <TelaCatalogo />
    </ProvedorSessao>,
    { "equipamentos.listar": listar },
  );
}

function chips() {
  return within(screen.getByRole("group", { name: "Categoria" }));
}

async function nomesVisiveis() {
  const cards = await screen.findAllByRole("article");
  return cards.map((card) => card.getAttribute("data-patrimonio"));
}

afterEach(() => {
  cleanup();
});

describe("T-CATALOGO-05 — chips e Só disponíveis", () => {
  it("CA-CATALOGO-07 — começa em Todos, sem filtro na entrada", async () => {
    const listar = vi.fn(listarComFiltro);
    renderizar(listar);

    expect(await nomesVisiveis()).toHaveLength(5);
    expect(chips().getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Só disponíveis" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(listar.mock.calls[0]?.[0]).not.toHaveProperty("categoria");
    expect(listar.mock.calls[0]?.[0]).not.toHaveProperty("somenteDisponiveis");
  });

  it.each([
    ["Notebooks", "notebook", ["TI-0001", "TI-0004"]],
    ["Monitores", "monitor", ["TI-0005"]],
    ["Cabos", "cabo", ["TI-0008"]],
    ["Câmeras", "camera", ["TI-0011"]],
  ])(
    "CA-CATALOGO-07 — o chip %s filtra pela categoria %s",
    async (rotulo, categoria, esperados) => {
      const listar = vi.fn(listarComFiltro);
      renderizar(listar);
      await nomesVisiveis();

      fireEvent.click(chips().getByRole("button", { name: rotulo }));

      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ categoria })),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("article").map((card) => card.dataset.patrimonio)).toEqual(
          esperados,
        ),
      );
      expect(chips().getByRole("button", { name: rotulo })).toHaveAttribute("aria-pressed", "true");
      expect(chips().getByRole("button", { name: "Todos" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    },
  );

  it("CA-CATALOGO-07 — Só disponíveis pede a disponibilidade e combina com a categoria", async () => {
    const listar = vi.fn(listarComFiltro);
    renderizar(listar);
    await nomesVisiveis();

    fireEvent.click(chips().getByRole("button", { name: "Notebooks" }));
    fireEvent.click(screen.getByRole("button", { name: "Só disponíveis" }));

    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoria: "notebook", somenteDisponiveis: true }),
      ),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("article").map((card) => card.dataset.patrimonio)).toEqual([
        "TI-0001",
      ]),
    );
    expect(screen.getByRole("button", { name: "Só disponíveis" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("CA-CATALOGO-07 — voltar a Todos remove a categoria da entrada", async () => {
    const listar = vi.fn(listarComFiltro);
    renderizar(listar);
    await nomesVisiveis();

    fireEvent.click(chips().getByRole("button", { name: "Cabos" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    fireEvent.click(chips().getByRole("button", { name: "Todos" }));

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(5));
    expect(listar.mock.lastCall?.[0]).not.toHaveProperty("categoria");
  });

  it("CA-CATALOGO-07 — filtro sem resultado mostra o vazio do filtro e permite limpar", async () => {
    renderizar((entrada) => {
      const { somenteDisponiveis, categoria } = entrada as Entrada;
      if (somenteDisponiveis && categoria === "notebook") {
        return { itens: [], proximoCursor: null, resumo: { total: 5, disponiveis: 4 } };
      }
      return listarComFiltro(entrada);
    });
    await nomesVisiveis();

    fireEvent.click(chips().getByRole("button", { name: "Notebooks" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Só disponíveis" }));

    expect(await screen.findByText(MENSAGEM_FILTRO_VAZIO)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(5));
    expect(chips().getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });
});
