import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BarraPrazo } from "@/components/emprestimos/barra-prazo";
import { MENSAGEM_JA_ENCERRADO } from "@/components/emprestimos/devolucao";
import {
  MENSAGEM_FALHA_MEUS,
  MENSAGEM_SEM_ITENS,
  TelaMeusEmprestimos,
} from "@/components/emprestimos/tela-meus-emprestimos";
import { MENSAGEM_FALHA_INCERTA } from "@/components/catalogo/card-solicitacao";
import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import type { SaidasRouter } from "@/trpc/tipos";

type Aberto = SaidasRouter["emprestimos"]["meus"][number];

// Dados fictícios de teste, com datas fixas.
const NOTEBOOK: Aberto = {
  id: "11111111-1111-4111-8111-111111111111",
  equipamento: {
    patrimonio: "TI-0001",
    nome: "Notebook 14 polegadas",
    categoria: "notebook",
    imagemUrl: null,
  },
  retiradoEm: new Date("2026-11-10T13:00:00Z"),
  devolverAte: "2026-11-24",
  emAtraso: false,
};

const MONITOR_ATRASADO: Aberto = {
  id: "22222222-2222-4222-8222-222222222222",
  equipamento: {
    patrimonio: "TI-0005",
    nome: "Monitor 24 polegadas",
    categoria: "monitor",
    imagemUrl: null,
  },
  retiradoEm: new Date("2026-10-20T13:00:00Z"),
  devolverAte: "2026-11-03",
  emAtraso: true,
};

const HISTORICO = {
  itens: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      equipamento: {
        patrimonio: "TI-0009",
        nome: "Cabo USB-C 1 m",
        categoria: "cabo",
        imagemUrl: null,
      },
      retiradoEm: new Date("2026-10-01T13:00:00Z"),
      devolverAte: "2026-10-15",
      devolvidoEm: new Date("2026-10-12T13:00:00Z"),
      noPrazo: true,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      equipamento: {
        patrimonio: "TI-0011",
        nome: "Webcam Full HD",
        categoria: "camera",
        imagemUrl: null,
      },
      retiradoEm: new Date("2026-09-01T13:00:00Z"),
      devolverAte: "2026-09-15",
      devolvidoEm: new Date("2026-09-20T13:00:00Z"),
      noPrazo: false,
    },
  ],
  proximoCursor: null,
};

function base(manipuladores: ManipuladoresTRPC = {}): ManipuladoresTRPC {
  return {
    "emprestimos.meus": () => [NOTEBOOK, MONITOR_ATRASADO],
    "emprestimos.meuResumo": () => ({ itensAbertos: 2, limite: 3, emAtraso: 1, prazoDias: 14 }),
    "emprestimos.historico": () => HISTORICO,
    ...manipuladores,
  };
}

function renderizar(manipuladores: ManipuladoresTRPC = {}) {
  return renderizarComTRPC(<TelaMeusEmprestimos />, base(manipuladores));
}

async function abrirDevolucao(nome: string) {
  fireEvent.click(await screen.findByRole("button", { name: `Devolver ${nome}` }));
  return within(await screen.findByRole("dialog", { name: "Confirmar devolução" }));
}

afterEach(() => {
  cleanup();
});

describe("T-DEVOL-04 — Meus empréstimos", () => {
  it("CA-DEVOL-01 — lista os empréstimos em aberto da pessoa, com prazo e resumo", async () => {
    renderizar();

    const lista = within(await screen.findByRole("list", { name: "Itens com você" }));
    expect(lista.getAllByRole("listitem")).toHaveLength(2);
    expect(lista.getByText("Notebook 14 polegadas")).toBeInTheDocument();
    expect(lista.getByText("Notebook · TI-0001 · retirado em 10/nov")).toBeInTheDocument();
    expect(await screen.findByText("2 de 3 itens · 1 em atraso")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 de 3 itens" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pegar emprestado" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  it("RF-DEVOL-04 — item em atraso aparece destacado e com a data vencida", async () => {
    renderizar();

    await screen.findByRole("list", { name: "Itens com você" });
    const linha = document.querySelector('[data-emprestimo="TI-0005"]');
    expect(linha).toHaveClass("bg-[rgba(224,91,98,0.05)]");
    expect(within(linha as HTMLElement).getByText(/Venceu em/)).toBeInTheDocument();
    expect(within(linha as HTMLElement).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "14",
    );
  });

  it("RF-DEVOL-04 — a barra mostra os dias decorridos sobre o prazo, no calendário de São Paulo", () => {
    render(
      <BarraPrazo
        agora={new Date("2026-11-17T15:00:00Z")}
        devolverAte="2026-11-24"
        emAtraso={false}
        retiradoEm={new Date("2026-11-10T13:00:00Z")}
      />,
    );

    const barra = screen.getByRole("progressbar", { name: "Prazo" });
    expect(barra).toHaveAttribute("aria-valuenow", "7");
    expect(barra).toHaveAttribute("aria-valuemax", "14");
    expect(barra.querySelector("rect")).toHaveAttribute("width", "50%");
    expect(screen.getByText("24/nov")).toBeInTheDocument();
  });

  it("RF-DEVOL-04 — retirada às 23h30 em São Paulo conta no mesmo dia do calendário", () => {
    render(
      <BarraPrazo
        agora={new Date("2026-11-11T02:30:00Z")}
        devolverAte="2026-11-24"
        emAtraso={false}
        retiradoEm={new Date("2026-11-11T02:30:00Z")}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "14");
  });

  it("RF-DEVOL-06/CA-DEVOL-02 — devolver pede confirmação, encerra e recarrega as listas", async () => {
    const meus = vi.fn(() => [NOTEBOOK, MONITOR_ATRASADO]);
    const historico = vi.fn(() => HISTORICO);
    const devolver = vi.fn(() => ({
      id: NOTEBOOK.id,
      devolvidoEm: new Date("2026-11-17T15:00:00Z"),
    }));
    renderizar({
      "emprestimos.meus": meus,
      "emprestimos.historico": historico,
      "emprestimos.devolver": devolver,
    });

    const dialogo = await abrirDevolucao("Notebook 14 polegadas");
    expect(dialogo.getByText("Notebook 14 polegadas · TI-0001")).toBeInTheDocument();
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(
      await screen.findByText("Devolução registrada: Notebook 14 polegadas."),
    ).toBeInTheDocument();
    expect(devolver).toHaveBeenCalledWith({ emprestimoId: NOTEBOOK.id });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(meus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(historico).toHaveBeenCalledTimes(2));
  });

  it("RF-DEVOL-07 — empréstimo já encerrado fica no diálogo e bloqueia nova tentativa", async () => {
    renderizar({
      "emprestimos.devolver": () => {
        throw erroTRPC("CONFLICT", MENSAGEM_JA_ENCERRADO, { motivo: "EMPRESTIMO_JA_ENCERRADO" });
      },
    });

    const dialogo = await abrirDevolucao("Notebook 14 polegadas");
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(await dialogo.findByText(MENSAGEM_JA_ENCERRADO)).toBeInTheDocument();
    expect(dialogo.getByRole("button", { name: "Devolver" })).toBeDisabled();
  });

  it.each([
    ["TOO_MANY_REQUESTS", MENSAGENS_LIMITE.excedido],
    ["SERVICE_UNAVAILABLE", MENSAGENS_LIMITE.indisponivel],
  ] as const)("CA-SEG-17 — devolver com %s mostra a mensagem própria e deixa tentar de novo", async (codigo, mensagem) => {
    renderizar({
      "emprestimos.devolver": () => {
        throw erroTRPC(codigo, "mensagem do servidor");
      },
    });

    const dialogo = await abrirDevolucao("Notebook 14 polegadas");
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(await dialogo.findByText(mensagem)).toBeInTheDocument();
    expect(dialogo.queryByText(MENSAGEM_FALHA_INCERTA)).not.toBeInTheDocument();
    expect(dialogo.getByRole("button", { name: "Devolver" })).toBeEnabled();
  });

  it("RF-DEVOL-06 — falha sem resposta avisa que o resultado é incerto", async () => {
    renderizar({
      "emprestimos.devolver": () => {
        throw new Error("fetch failed");
      },
    });

    const dialogo = await abrirDevolucao("Notebook 14 polegadas");
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(await dialogo.findByText(MENSAGEM_FALHA_INCERTA)).toBeInTheDocument();
    expect(dialogo.getByRole("button", { name: "Devolver" })).toBeEnabled();
  });

  it("CA-DEVOL-06 — o histórico marca no prazo e com atraso", async () => {
    renderizar();

    const tabela = within(await screen.findByRole("table"));
    const linhas = tabela.getAllByRole("row");
    expect(within(linhas[1] as HTMLElement).getByText("No prazo")).toBeInTheDocument();
    expect(within(linhas[1] as HTMLElement).getByText("12/out")).toBeInTheDocument();
    expect(within(linhas[2] as HTMLElement).getByText("Com atraso")).toBeInTheDocument();
  });

  it("CA-DEVOL-01 — sem itens, mostra o vazio e o caminho para o catálogo", async () => {
    renderizar({ "emprestimos.meus": () => [] });

    expect(await screen.findByText(MENSAGEM_SEM_ITENS)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver o catálogo" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
  });

  it("CA-DEVOL-01 — falha ao carregar permite tentar de novo", async () => {
    let chamadas = 0;
    renderizar({
      "emprestimos.meus": () => {
        chamadas += 1;
        if (chamadas === 1) throw erroTRPC("INTERNAL_SERVER_ERROR", "falha");
        return [NOTEBOOK];
      },
    });

    expect(await screen.findByText(MENSAGEM_FALHA_MEUS)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Notebook 14 polegadas")).toBeInTheDocument();
  });
});
