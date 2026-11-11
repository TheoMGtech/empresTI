import { expect, test, type Page } from "@playwright/test";

import { simularTRPC, type RespostaSimulada } from "./apoio/trpc";

// Dados fictícios. O E2E simula o tRPC no navegador e não toca em Supabase nem banco (DF-14).
const DETALHE = {
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

async function abrirDetalhe(page: Page, solicitar: () => RespostaSimulada) {
  let emprestado = false;
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Marina Alves", papel: "colaborador" } },
    "equipamentos.detalhar": () => ({
      dados: emprestado
        ? { ...DETALHE, disponibilidade: { estado: "emprestado", devolverAte: "2026-11-25" } }
        : DETALHE,
    }),
    "equipamentos.listar": {
      dados: { itens: [], proximoCursor: null, resumo: { total: 0, disponiveis: 0 } },
    },
    "emprestimos.solicitar": () => {
      const resposta = solicitar();
      if ("dados" in resposta) emprestado = true;
      return resposta;
    },
  });
  await page.goto("/catalogo/TI-0001");
  await expect(
    page.getByRole("heading", { level: 1, name: "Notebook 14 polegadas" }),
  ).toBeVisible();
}

test("CA-SOLIC-10/RF-SOLIC-04 — confirma no diálogo e o item passa a emprestado", async ({
  page,
}) => {
  await abrirDetalhe(page, () => ({
    dados: { id: "0b1c2d3e-4f50-4a61-8b72-c3d4e5f60718", devolverAte: "2026-11-25" },
  }));

  await page.getByRole("button", { name: "Solicitar empréstimo" }).click();
  const dialogo = page.getByRole("dialog", { name: "Confirmar empréstimo" });
  await expect(
    dialogo.getByText("Devolver até 25/nov. A retirada é registrada agora."),
  ).toBeVisible();

  await dialogo.getByRole("button", { name: "Confirmar" }).click();

  await expect(dialogo).toBeHidden();
  await expect(page.getByRole("status")).toHaveText("Empréstimo registrado. Devolva até 25/nov.");
  await expect(page.getByText("Emprestado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solicitar empréstimo" })).toBeDisabled();
});

test("RF-SOLIC-06 — disputa pelo mesmo item fica no diálogo e bloqueia nova confirmação", async ({
  page,
}) => {
  await abrirDetalhe(page, () => ({
    erro: "CONFLICT",
    mensagem: "Equipamento indisponível.",
    motivo: "EQUIPAMENTO_INDISPONIVEL",
  }));

  await page.getByRole("button", { name: "Solicitar empréstimo" }).click();
  const dialogo = page.getByRole("dialog", { name: "Confirmar empréstimo" });
  await dialogo.getByRole("button", { name: "Confirmar" }).click();

  await expect(dialogo.getByText("Este equipamento acabou de ser emprestado.")).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Confirmar" })).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
});

test("CA-SESSAO-13 — detalhe em 375px sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrirDetalhe(page, () => ({ dados: { id: DETALHE.id, devolverAte: "2026-11-25" } }));

  const excedente = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(excedente).toBeLessThanOrEqual(0);
});
