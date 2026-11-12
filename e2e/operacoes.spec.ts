import { expect, test, type Page } from "@playwright/test";

import { simularTRPC } from "./apoio/trpc";

// Dados fictícios. tRPC simulado no navegador, sem Supabase nem banco (DF-14).
function emprestimo(indice: number, emAtraso = false) {
  return {
    id: `00000000-0000-4000-8000-${String(indice).padStart(12, "0")}`,
    equipamento: {
      patrimonio: `TI-${String(indice).padStart(4, "0")}`,
      nome: `Equipamento ${indice}`,
      categoria: "notebook",
      imagemUrl: null,
    },
    pessoa: { nomeExibicao: `Pessoa ${indice}` },
    retiradoEm: new Date("2026-11-03T13:00:00Z"),
    devolverAte: emAtraso ? "2026-11-05" : "2026-11-17",
    emAtraso,
  };
}

async function abrirPainel(page: Page, papel: "operacoes" | "colaborador" = "operacoes") {
  let itens = [emprestimo(1, true), emprestimo(2), emprestimo(3)];
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Rafael Lima", papel } },
    "operacoes.resumo": () => ({
      dados: {
        emAberto: itens.length,
        vencendoEm3Dias: 1,
        emAtraso: itens.filter((item) => item.emAtraso).length,
        emManutencao: 2,
      },
    }),
    "operacoes.emprestimosEmAberto": (entrada) => {
      const { filtro } = (entrada ?? {}) as { filtro?: string };
      return {
        dados: {
          itens: filtro === "em_atraso" ? itens.filter((item) => item.emAtraso) : itens,
          proximoCursor: null,
        },
      };
    },
    "operacoes.registrarDevolucao": (entrada) => {
      const { emprestimoId } = entrada as { emprestimoId: string };
      itens = itens.filter((item) => item.id !== emprestimoId);
      return { dados: { id: emprestimoId, devolvidoEm: new Date("2026-11-17T15:00:00Z") } };
    },
    "emprestimos.meus": { dados: [] },
    "emprestimos.historico": { dados: { itens: [], proximoCursor: null } },
    "emprestimos.meuResumo": { dados: { itensAbertos: 0, limite: 3, emAtraso: 0, prazoDias: 14 } },
    "equipamentos.listar": {
      dados: { itens: [], proximoCursor: null, resumo: { total: 0, disponiveis: 0 } },
    },
  });
  await page.goto("/operacoes/emprestimos");
}

test("CA-OPER-01/03 — Operações filtra atrasados e registra a devolução no balcão", async ({
  page,
}) => {
  await abrirPainel(page);

  const lista = page.getByRole("list", { name: "Empréstimos em aberto" });
  await expect(lista.getByRole("listitem")).toHaveCount(3);

  await page
    .getByRole("group", { name: "Filtro" })
    .getByRole("button", { name: "Em atraso" })
    .click();
  await expect(lista.getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "Devolver Equipamento 1 de Pessoa 1" }).click();
  await page
    .getByRole("dialog", { name: "Confirmar devolução" })
    .getByRole("button", { name: "Devolver" })
    .click();

  await expect(page.getByText("Devolução registrada: Equipamento 1.")).toBeVisible();
  await expect(page.getByText("Nenhum empréstimo para este filtro.")).toBeVisible();
});

test("CA-SESSAO-10 — colaborador em /operacoes/emprestimos vê acesso restrito", async ({
  page,
}) => {
  await abrirPainel(page, "colaborador");

  await expect(page.getByRole("heading", { name: "Acesso restrito a Operações." })).toBeVisible();
  await expect(page.getByRole("list", { name: "Empréstimos em aberto" })).toHaveCount(0);
});

test("CA-SESSAO-13 — painel em 375px sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrirPainel(page);
  await expect(page.getByRole("list", { name: "Empréstimos em aberto" })).toBeVisible();

  const excedente = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(excedente).toBeLessThanOrEqual(0);
});
