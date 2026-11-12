import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MENSAGEM_FALHA_INCERTA } from "@/components/catalogo/card-solicitacao";
import {
  MENSAGEM_FALHA_DETALHE,
  MENSAGEM_NAO_ENCONTRADO,
  TelaDetalhe,
} from "@/components/catalogo/tela-detalhe";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import type { SaidasRouter } from "@/trpc/tipos";

type Detalhe = SaidasRouter["equipamentos"]["detalhar"];

// Dados fictícios de teste, com datas fixas (rules/tests.md).
const DETALHE: Detalhe = {
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

const DETALHE_OPERACOES: Detalhe = {
  ...DETALHE,
  local: "Balcão 2º andar",
  ultimaDevolucao: new Date("2026-10-30T15:00:00Z"),
  numeroSerie: "SN-FICTICIO-01",
  observacoes: "Carregador na caixa.",
  historico: [
    {
      retiradoEm: new Date("2026-10-10T13:00:00Z"),
      devolverAte: "2026-10-24",
      devolvidoEm: new Date("2026-10-30T15:00:00Z"),
      tomadorNome: "Rafael Lima",
    },
  ],
};

function renderizar(manipuladores: ManipuladoresTRPC) {
  return renderizarComTRPC(<TelaDetalhe patrimonio="TI-0001" />, manipuladores);
}

async function abrirDialogo() {
  fireEvent.click(await screen.findByRole("button", { name: "Solicitar empréstimo" }));
  return within(await screen.findByRole("dialog", { name: "Confirmar empréstimo" }));
}

afterEach(() => {
  cleanup();
});

describe("T-SOLIC-07 — detalhe e diálogo", () => {
  it("RF-SOLIC-01 — mostra nome, situação, trilha e ficha do equipamento", async () => {
    renderizar({ "equipamentos.detalhar": () => DETALHE });

    expect(
      await screen.findByRole("heading", { level: 1, name: "Notebook 14 polegadas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Disponível")).toBeInTheDocument();
    const trilha = within(screen.getByRole("navigation", { name: "Trilha" }));
    expect(trilha.getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "/catalogo");
    expect(trilha.getByText("Notebooks")).toBeInTheDocument();
    expect(screen.getByText("Patrimônio").nextSibling).toHaveTextContent("TI-0001");
  });

  it("RF-SOLIC-05 — oculta campos sem valor", async () => {
    renderizar({ "equipamentos.detalhar": () => DETALHE });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Local")).not.toBeInTheDocument();
    expect(screen.queryByText("Última devolução")).not.toBeInTheDocument();
  });

  it("CA-SOLIC-09 — colaborador não vê série, observações nem histórico", async () => {
    renderizar({ "equipamentos.detalhar": () => DETALHE });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Número de série")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Histórico" })).not.toBeInTheDocument();
  });

  it("CA-SOLIC-09 — Operações vê série, observações e histórico com o nome de quem pegou", async () => {
    renderizar({ "equipamentos.detalhar": () => DETALHE_OPERACOES });

    expect(await screen.findByText("SN-FICTICIO-01")).toBeInTheDocument();
    expect(screen.getByText("Carregador na caixa.")).toBeInTheDocument();
    expect(screen.getByText("Balcão 2º andar")).toBeInTheDocument();
    const historico = within(screen.getByRole("region", { name: "Histórico" }));
    expect(historico.getByText("Retirado por Rafael Lima")).toBeInTheDocument();
    expect(historico.getByText("Devolvido em 30/out")).toBeInTheDocument();
  });

  it("CA-SOLIC-10 — card e diálogo mostram o prazo calculado no servidor", async () => {
    renderizar({ "equipamentos.detalhar": () => DETALHE });

    const card = within(await screen.findByRole("region", { name: "Solicitar empréstimo" }));
    expect(card.getByText("Devolver até").nextSibling).toHaveTextContent("25/nov");

    const dialogo = await abrirDialogo();
    expect(
      dialogo.getByText("Devolver até 25/nov. A retirada é registrada agora."),
    ).toBeInTheDocument();
    expect(dialogo.getByText("Notebook 14 polegadas · TI-0001")).toBeInTheDocument();
  });

  it("RF-SOLIC-02 — confirmar envia só o equipamento e mostra o empréstimo registrado", async () => {
    const detalhar = vi.fn(() => DETALHE);
    const solicitar = vi.fn(() => ({
      id: "0b1c2d3e-4f50-4a61-8b72-c3d4e5f60718",
      devolverAte: "2026-11-25",
    }));
    renderizar({ "equipamentos.detalhar": detalhar, "emprestimos.solicitar": solicitar });

    const dialogo = await abrirDialogo();
    fireEvent.click(dialogo.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Empréstimo registrado. Devolva até 25/nov.",
    );
    expect(solicitar).toHaveBeenCalledWith({ equipamentoId: DETALHE.id });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(detalhar).toHaveBeenCalledTimes(2));
  });

  it("RF-SOLIC-02 — durante o envio, os botões ficam bloqueados e mostram Solicitando...", async () => {
    renderizar({
      "equipamentos.detalhar": () => DETALHE,
      "emprestimos.solicitar": () => new Promise(() => undefined),
    });

    const dialogo = await abrirDialogo();
    fireEvent.click(dialogo.getByRole("button", { name: "Confirmar" }));

    expect(await dialogo.findByRole("button", { name: "Solicitando..." })).toBeDisabled();
    expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it.each([
    ["EQUIPAMENTO_INDISPONIVEL", "Este equipamento acabou de ser emprestado."],
    ["EQUIPAMENTO_EM_MANUTENCAO", "Este equipamento está em manutenção."],
    ["LIMITE_ATINGIDO", "Limite de 3 itens atingido. Devolva um item para solicitar outro."],
    ["ITEM_EM_ATRASO", "Você tem item em atraso. Devolva antes de solicitar outro."],
  ])(
    "RF-SOLIC-06 — recusa %s fica no diálogo, bloqueia nova tentativa e recarrega",
    async (motivo, mensagem) => {
      const detalhar = vi.fn(() => DETALHE);
      renderizar({
        "equipamentos.detalhar": detalhar,
        "emprestimos.solicitar": () => {
          throw erroTRPC("CONFLICT", "recusa", { motivo });
        },
      });

      const dialogo = await abrirDialogo();
      fireEvent.click(dialogo.getByRole("button", { name: "Confirmar" }));

      expect(await dialogo.findByText(mensagem)).toBeInTheDocument();
      expect(dialogo.getByRole("button", { name: "Confirmar" })).toBeDisabled();
      await waitFor(() => expect(detalhar).toHaveBeenCalledTimes(2));
    },
  );

  it("RF-SOLIC-06 — falha sem resposta avisa que o resultado é incerto e recarrega", async () => {
    const detalhar = vi.fn(() => DETALHE);
    renderizar({
      "equipamentos.detalhar": detalhar,
      "emprestimos.solicitar": () => {
        throw new Error("fetch failed");
      },
    });

    const dialogo = await abrirDialogo();
    fireEvent.click(dialogo.getByRole("button", { name: "Confirmar" }));

    expect(await dialogo.findByText(MENSAGEM_FALHA_INCERTA)).toBeInTheDocument();
    await waitFor(() => expect(detalhar).toHaveBeenCalledTimes(2));
  });

  it("RN-SOLIC-04 — item em manutenção não pode ser solicitado", async () => {
    renderizar({
      "equipamentos.detalhar": () => ({ ...DETALHE, disponibilidade: { estado: "manutencao" } }),
    });

    expect(await screen.findByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled();
    expect(screen.getByText("Em manutenção. Indisponível para empréstimo.")).toBeInTheDocument();
    expect(screen.queryByText("Devolver até")).not.toBeInTheDocument();
  });

  it("RN-SOLIC-01 — item emprestado não pode ser solicitado e mostra a devolução", async () => {
    renderizar({
      "equipamentos.detalhar": () => ({
        ...DETALHE,
        disponibilidade: { estado: "emprestado", devolverAte: "2026-11-20" },
      }),
    });

    expect(await screen.findByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled();
    expect(screen.getByText("Emprestado · devolve 20/nov.")).toBeInTheDocument();
  });

  it("CA-SOLIC-08 — equipamento inexistente ou oculto mostra não encontrado", async () => {
    renderizar({
      "equipamentos.detalhar": () => {
        throw erroTRPC("NOT_FOUND", "Equipamento não encontrado.", {
          motivo: "EQUIPAMENTO_NAO_ENCONTRADO",
        });
      },
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: MENSAGEM_NAO_ENCONTRADO }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao catálogo" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  it("RF-SOLIC-01 — falha ao carregar permite tentar de novo", async () => {
    let chamadas = 0;
    renderizar({
      "equipamentos.detalhar": () => {
        chamadas += 1;
        if (chamadas === 1) throw erroTRPC("INTERNAL_SERVER_ERROR", "falha");
        return DETALHE;
      },
    });

    expect(await screen.findByText(MENSAGEM_FALHA_DETALHE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Notebook 14 polegadas" }),
    ).toBeInTheDocument();
  });
});
