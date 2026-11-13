import { expect, test, type Page } from "./apoio/teste";

import { simularTRPC } from "./apoio/trpc";

// Dados fictícios. tRPC simulado no navegador, sem Supabase nem banco (DF-14).
const NOTEBOOK = {
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

const MONITOR = {
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

async function abrirMeus(page: Page) {
  let devolvidos: string[] = [];
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Marina Alves", papel: "colaborador" } },
    "emprestimos.meus": () => ({
      dados: [NOTEBOOK, MONITOR].filter((item) => !devolvidos.includes(item.id)),
    }),
    "emprestimos.meuResumo": () => ({
      dados: {
        itensAbertos: 2 - devolvidos.length,
        limite: 3,
        emAtraso: devolvidos.includes(MONITOR.id) ? 0 : 1,
        prazoDias: 14,
      },
    }),
    "emprestimos.historico": { dados: { itens: [], proximoCursor: null } },
    "emprestimos.devolver": (entrada) => {
      const { emprestimoId } = entrada as { emprestimoId: string };
      devolvidos = [...devolvidos, emprestimoId];
      return { dados: { id: emprestimoId, devolvidoEm: new Date("2026-11-17T15:00:00Z") } };
    },
  });
  await page.goto("/meus-emprestimos");
  await expect(page.getByRole("heading", { level: 1, name: "Comigo agora" })).toBeVisible();
}

test("CA-DEVOL-01/02 — devolver o item atrasado remove a linha e atualiza o resumo", async ({
  page,
}) => {
  await abrirMeus(page);

  const lista = page.getByRole("list", { name: "Itens com você" });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("2 de 3 itens · 1 em atraso")).toBeVisible();

  await page.getByRole("button", { name: "Devolver Monitor 24 polegadas" }).click();
  const dialogo = page.getByRole("dialog", { name: "Confirmar devolução" });
  await dialogo.getByRole("button", { name: "Devolver" }).click();

  await expect(dialogo).toBeHidden();
  await expect(page.getByText("Devolução registrada: Monitor 24 polegadas.")).toBeVisible();
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("1 de 3 itens · nenhum em atraso")).toBeVisible();
});

test("CA-SESSAO-13 — Meus empréstimos em 375px sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrirMeus(page);

  const excedente = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(excedente).toBeLessThanOrEqual(0);
});
