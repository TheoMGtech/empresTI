import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ItemCatalogo } from "@/components/catalogo/categorias";
import { TelaCatalogo } from "@/components/catalogo/tela-catalogo";
import { TelaDetalhe } from "@/components/catalogo/tela-detalhe";
import { bloqueioDoResumo } from "@/components/emprestimos/resumo";
import { ProvedorSessao } from "@/components/shell/sessao";
import { renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import type { SaidasRouter } from "@/trpc/tipos";

// Dados fictícios de teste.
const DETALHE: SaidasRouter["equipamentos"]["detalhar"] = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  patrimonio: "TI-0001",
  nome: "Notebook 14 polegadas",
  categoria: "notebook",
  imagemUrl: null,
  disponibilidade: { estado: "disponivel" },
  local: null,
  ultimaDevolucao: null,
  devolverAtePrevisto: "2026-11-25",
};

const ITEM: ItemCatalogo = {
  patrimonio: "TI-0001",
  nome: "Notebook 14 polegadas",
  categoria: "notebook",
  imagemUrl: null,
  disponibilidade: { estado: "disponivel" },
};

function resumo(itensAbertos: number, emAtraso = 0) {
  return { itensAbertos, limite: 3, emAtraso, prazoDias: 14 };
}

function renderizarDetalhe(manipuladores: ManipuladoresTRPC) {
  return renderizarComTRPC(<TelaDetalhe patrimonio="TI-0001" />, {
    "equipamentos.detalhar": () => DETALHE,
    ...manipuladores,
  });
}

function renderizarCatalogo(manipuladores: ManipuladoresTRPC) {
  return renderizarComTRPC(
    <ProvedorSessao value={{ nomeExibicao: "Marina Alves", papel: "colaborador" }}>
      <TelaCatalogo />
    </ProvedorSessao>,
    {
      "equipamentos.listar": () => ({
        itens: [ITEM],
        proximoCursor: null,
        resumo: { total: 1, disponiveis: 1 },
      }),
      ...manipuladores,
    },
  );
}

afterEach(() => {
  cleanup();
});

describe("T-REGRAS-04 — limite e atraso na interface", () => {
  it("RF-REGRAS-01 — mostra o contador no cabeçalho do catálogo", async () => {
    renderizarCatalogo({ "emprestimos.meuResumo": () => resumo(2) });

    expect(await screen.findByText("2 de 3")).toBeInTheDocument();
    expect(screen.getByText(/itens com você/)).toBeInTheDocument();
  });

  it("RF-REGRAS-01 — card Seus itens mostra a contagem e os segmentos", async () => {
    renderizarDetalhe({ "emprestimos.meuResumo": () => resumo(2) });

    const card = within(await screen.findByRole("region", { name: "Seus itens" }));
    expect(card.getByRole("img", { name: "2 de 3 itens" })).toBeInTheDocument();
    expect(card.getByRole("img").querySelectorAll('[data-preenchido="true"]')).toHaveLength(2);
    expect(card.getByText("Nenhum item em atraso.")).toBeInTheDocument();
  });

  it("CA-REGRAS-07 — no limite, Solicitar fica desabilitado com a nota do motivo", async () => {
    renderizarDetalhe({ "emprestimos.meuResumo": () => resumo(3) });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled(),
    );
    expect(
      screen.getByText("Limite de 3 itens atingido. Devolva um item para solicitar outro."),
    ).toBeInTheDocument();
  });

  it("CA-REGRAS-07 — com item em atraso, Solicitar fica desabilitado mesmo abaixo do limite", async () => {
    renderizarDetalhe({ "emprestimos.meuResumo": () => resumo(1, 1) });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled(),
    );
    expect(
      screen.getByText("Você tem item em atraso. Devolva antes de solicitar outro."),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Seus itens" })).getByText(
        "1 item em atraso. Devolva antes de solicitar outro.",
      ),
    ).toBeInTheDocument();
  });

  it("RF-REGRAS-03 — o diálogo avisa quando a solicitação leva ao terceiro item", async () => {
    renderizarDetalhe({ "emprestimos.meuResumo": () => resumo(2) });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Solicitar empréstimo" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Solicitar empréstimo" }));
    const dialogo = within(await screen.findByRole("dialog"));

    expect(dialogo.getByText(/Com este item você chega a 3 de 3\./)).toBeInTheDocument();
  });

  it("RF-REGRAS-03 — sem chegar ao limite, o diálogo não mostra o aviso", async () => {
    renderizarDetalhe({ "emprestimos.meuResumo": () => resumo(0) });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Solicitar empréstimo" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Solicitar empréstimo" }));
    const dialogo = within(await screen.findByRole("dialog"));

    expect(dialogo.queryByText(/chega a/)).not.toBeInTheDocument();
  });

  it("CA-REGRAS-07 — no catálogo, o bloqueio mostra a nota e esmaece Solicitar", async () => {
    renderizarCatalogo({ "emprestimos.meuResumo": () => resumo(1, 1) });

    expect(
      await screen.findByText("Você tem item em atraso. Devolva antes de solicitar outro."),
    ).toBeInTheDocument();
    const rodape = screen.getByText("Solicitar").closest("span");
    expect(rodape).toHaveAttribute("aria-disabled", "true");
    expect(rodape).toHaveClass("opacity-45");
  });

  it("RS-REGRAS-01 — sem resumo, a interface não inventa bloqueio; o servidor decide", async () => {
    renderizarDetalhe({
      "emprestimos.meuResumo": () => {
        throw new Error("indisponível");
      },
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Solicitar empréstimo" })).toBeEnabled(),
    );
    expect(screen.queryByRole("region", { name: "Seus itens" })).not.toBeInTheDocument();
    expect(bloqueioDoResumo(undefined)).toBeNull();
  });
});
