import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MENSAGEM_FALHA_OPERACOES,
  MENSAGEM_FILTRO_SEM_EMPRESTIMOS,
  MENSAGEM_SEM_EMPRESTIMOS,
  TelaEmprestimosAbertos,
} from "@/components/operacoes/tela-emprestimos-abertos";
import { MENSAGEM_JA_ENCERRADO } from "@/components/emprestimos/devolucao";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import type { SaidasRouter } from "@/trpc/tipos";

type Emprestimo = SaidasRouter["operacoes"]["emprestimosEmAberto"]["itens"][number];

// Dados fictícios, com datas fixas.
function emprestimo(indice: number, extras: Partial<Emprestimo> = {}): Emprestimo {
  const numero = String(indice).padStart(4, "0");
  return {
    id: `00000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
    equipamento: {
      patrimonio: `TI-${numero}`,
      nome: `Equipamento ${indice}`,
      categoria: indice % 2 === 0 ? "notebook" : "monitor",
      imagemUrl: null,
    },
    pessoa: { nomeExibicao: `Pessoa ${indice}` },
    retiradoEm: new Date("2026-11-03T13:00:00Z"),
    devolverAte: "2026-11-17",
    emAtraso: false,
    ...extras,
  };
}

const ATRASADO = emprestimo(1, {
  pessoa: { nomeExibicao: null },
  devolverAte: "2026-11-05",
  emAtraso: true,
});
const TODOS = [ATRASADO, ...Array.from({ length: 11 }, (_, i) => emprestimo(i + 2))];
const RESUMO = { emAberto: 12, vencendoEm3Dias: 2, emAtraso: 1, emManutencao: 2 };

type Entrada = { filtro?: string; categoria?: string; cursor?: string; limite?: number };

function listar(entrada: unknown) {
  const { filtro, categoria, cursor, limite = 10 } = entrada as Entrada;
  const filtrados = TODOS.filter(
    (item) =>
      (filtro !== "em_atraso" || item.emAtraso) &&
      (!categoria || item.equipamento.categoria === categoria),
  );
  const inicio = cursor ? filtrados.findIndex((item) => item.id === cursor) + 1 : 0;
  const pagina = filtrados.slice(inicio, inicio + limite);
  const temMais = inicio + limite < filtrados.length;
  return { itens: pagina, proximoCursor: temMais ? (pagina.at(-1)?.id ?? null) : null };
}

function renderizar(manipuladores: ManipuladoresTRPC = {}) {
  return renderizarComTRPC(<TelaEmprestimosAbertos />, {
    "operacoes.resumo": () => RESUMO,
    "operacoes.emprestimosEmAberto": listar,
    ...manipuladores,
  });
}

async function linhas() {
  const lista = await screen.findByRole("list", { name: "Empréstimos em aberto" });
  return within(lista).getAllByRole("listitem");
}

afterEach(() => {
  cleanup();
});

describe("T-OPER-06 — painel de empréstimos em aberto", () => {
  it("CA-OPER-01 — lista os empréstimos do tenant com a pessoa", async () => {
    renderizar();

    expect(await linhas()).toHaveLength(10);
    expect(screen.getByText("Pessoa 2")).toBeInTheDocument();
    expect(screen.getByText("Sem nome cadastrado")).toBeInTheDocument();
  });

  it("CA-OPER-02 — os cards mostram os números do resumo", async () => {
    renderizar();

    const resumo = within(await screen.findByLabelText("Resumo"));
    await waitFor(() => expect(resumo.getByText("Em aberto").nextSibling).toHaveTextContent("12"));
    expect(resumo.getByText("Vencem em 3 dias").nextSibling).toHaveTextContent("2");
    expect(resumo.getByText("Em atraso").nextSibling).toHaveTextContent("1");
    expect(resumo.getByText("Em manutenção").nextSibling).toHaveTextContent("2");
  });

  it("RF-OPER-03 — linha em atraso fica destacada", async () => {
    renderizar();

    await linhas();
    const linha = document.querySelector('[data-emprestimo="TI-0001"]') as HTMLElement;
    expect(linha).toHaveClass("bg-[rgba(224,91,98,0.05)]");
    expect(within(linha).getByText("Em atraso")).toBeInTheDocument();
  });

  it.each([
    ["Em atraso", { filtro: "em_atraso" }, 1],
    ["Vencem esta semana", { filtro: "vencem_7_dias" }, 10],
    ["Notebooks", { filtro: "todos", categoria: "notebook" }, 6],
  ])("RF-OPER-03 — o chip %s filtra a lista", async (rotulo, entradaEsperada, quantidade) => {
    const listarEspiao = vi.fn(listar);
    renderizar({ "operacoes.emprestimosEmAberto": listarEspiao });
    await linhas();

    fireEvent.click(
      within(screen.getByRole("group", { name: "Filtro" })).getByRole("button", { name: rotulo }),
    );

    await waitFor(() =>
      expect(listarEspiao).toHaveBeenLastCalledWith(expect.objectContaining(entradaEsperada)),
    );
    await waitFor(async () => expect(await linhas()).toHaveLength(quantidade));
  });

  it("CA-OPER-03 — registrar devolução de outra pessoa pede confirmação e recarrega", async () => {
    const resumo = vi.fn(() => RESUMO);
    const listarEspiao = vi.fn(listar);
    const registrar = vi.fn(() => ({
      id: ATRASADO.id,
      devolvidoEm: new Date("2026-11-17T15:00:00Z"),
    }));
    renderizar({
      "operacoes.resumo": resumo,
      "operacoes.emprestimosEmAberto": listarEspiao,
      "operacoes.registrarDevolucao": registrar,
    });
    await linhas();

    fireEvent.click(
      screen.getByRole("button", { name: "Devolver Equipamento 1 de Sem nome cadastrado" }),
    );
    const dialogo = within(await screen.findByRole("dialog", { name: "Confirmar devolução" }));
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(await screen.findByText("Devolução registrada: Equipamento 1.")).toBeInTheDocument();
    expect(registrar).toHaveBeenCalledWith({ emprestimoId: ATRASADO.id });
    await waitFor(() => expect(resumo).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(listarEspiao).toHaveBeenCalledTimes(2));
  });

  it("RF-OPER-04 — devolução já registrada fica no diálogo", async () => {
    renderizar({
      "operacoes.registrarDevolucao": () => {
        throw erroTRPC("CONFLICT", MENSAGEM_JA_ENCERRADO, { motivo: "EMPRESTIMO_JA_ENCERRADO" });
      },
    });
    await linhas();

    fireEvent.click(screen.getByRole("button", { name: "Devolver Equipamento 2 de Pessoa 2" }));
    const dialogo = within(await screen.findByRole("dialog"));
    fireEvent.click(dialogo.getByRole("button", { name: "Devolver" }));

    expect(await dialogo.findByText(MENSAGEM_JA_ENCERRADO)).toBeInTheDocument();
    expect(dialogo.getByRole("button", { name: "Devolver" })).toBeDisabled();
  });

  it("RF-OPER-01 — pagina por cursor com Anterior e Próximo", async () => {
    const listarEspiao = vi.fn(listar);
    renderizar({ "operacoes.emprestimosEmAberto": listarEspiao });

    expect(await linhas()).toHaveLength(10);
    const paginacao = within(screen.getByRole("navigation", { name: "Paginação" }));
    await waitFor(() => expect(paginacao.getByText("1–10 de 12 empréstimos")).toBeInTheDocument());
    expect(paginacao.getByRole("button", { name: "Anterior" })).toBeDisabled();

    fireEvent.click(paginacao.getByRole("button", { name: "Próximo" }));

    await waitFor(async () => expect(await linhas()).toHaveLength(2));
    expect(listarEspiao).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: TODOS[9]?.id }),
    );
    expect(screen.getByText("11–12 de 12 empréstimos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();

    const chamadas = listarEspiao.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await waitFor(async () => expect(await linhas()).toHaveLength(10));
    expect(listarEspiao.mock.calls.length).toBe(chamadas);
  });

  it("RF-OPER-01 — sem empréstimos e filtro vazio têm mensagens próprias", async () => {
    renderizar({
      "operacoes.emprestimosEmAberto": (entrada) =>
        (entrada as Entrada).filtro === "em_atraso"
          ? { itens: [], proximoCursor: null }
          : { itens: [], proximoCursor: null },
    });

    expect(await screen.findByText(MENSAGEM_SEM_EMPRESTIMOS)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Em atraso" }));
    expect(await screen.findByText(MENSAGEM_FILTRO_SEM_EMPRESTIMOS)).toBeInTheDocument();
  });

  it("RF-OPER-01 — falha ao carregar permite tentar de novo", async () => {
    let chamadas = 0;
    renderizar({
      "operacoes.emprestimosEmAberto": (entrada) => {
        chamadas += 1;
        if (chamadas === 1) throw erroTRPC("INTERNAL_SERVER_ERROR", "falha");
        return listar(entrada);
      },
    });

    expect(await screen.findByText(MENSAGEM_FALHA_OPERACOES)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await linhas()).toHaveLength(10);
  });
});
