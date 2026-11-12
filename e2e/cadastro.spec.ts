import { expect, test, type Page } from "@playwright/test";

import { simularTRPC } from "./apoio/trpc";

// Dados fictícios. tRPC simulado no navegador, sem Supabase nem banco (DF-14).
async function abrirCadastro(page: Page) {
  const cadastrados: { patrimonio: string; nome: string; criadoEm: Date }[] = [];
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Rafael Lima", papel: "operacoes" } },
    "operacoes.ultimosCadastros": () => ({ dados: cadastrados.slice(-3).reverse() }),
    "equipamentos.cadastrar": (entrada) => {
      const { patrimonio, nome } = entrada as { patrimonio: string; nome: string };
      if (patrimonio === "TI-0001") {
        return { erro: "CONFLICT", mensagem: "duplicado", motivo: "PATRIMONIO_DUPLICADO" };
      }
      cadastrados.push({ patrimonio, nome, criadoEm: new Date("2026-11-11T15:00:00Z") });
      return { dados: { id: "55555555-5555-4555-8555-555555555555", patrimonio } };
    },
    "equipamentos.listar": {
      dados: { itens: [], proximoCursor: null, resumo: { total: 0, disponiveis: 0 } },
    },
    "operacoes.resumo": {
      dados: { emAberto: 0, vencendoEm3Dias: 0, emAtraso: 0, emManutencao: 0 },
    },
  });
  await page.goto("/operacoes/equipamentos/novo");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cadastrar equipamento" }),
  ).toBeVisible();
}

test("CA-OPER-06 — patrimônio repetido fica no campo, e o cadastro segue depois de corrigido", async ({
  page,
}) => {
  await abrirCadastro(page);

  await page.getByLabel("Nome", { exact: true }).fill("Monitor 19 polegadas");
  await page.getByLabel("Categoria").selectOption("monitor");
  await page.getByLabel("Patrimônio").fill("TI-0001");
  await page.getByRole("button", { name: "Cadastrar e adicionar outro" }).click();

  await expect(page.getByText("Já existe equipamento com este patrimônio.")).toBeVisible();

  await page.getByLabel("Patrimônio").fill("TI-0013");
  await page.getByRole("button", { name: "Cadastrar e adicionar outro" }).click();

  await expect(page.getByRole("status")).toHaveText("Equipamento TI-0013 cadastrado.");
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("region", { name: "Últimos cadastros" }).getByText(/Monitor 19 polegadas/),
  ).toBeVisible();
});

test("RF-OPER-05 — formato de patrimônio inválido é barrado no navegador", async ({ page }) => {
  await abrirCadastro(page);

  await page.getByLabel("Nome", { exact: true }).fill("Cabo HDMI 3 m");
  await page.getByLabel("Categoria").selectOption("cabo");
  await page.getByLabel("Patrimônio").fill("PAT-0001");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();

  await expect(page.getByText("Use o formato TI-0000.")).toBeVisible();
  await expect(page).toHaveURL(/\/operacoes\/equipamentos\/novo$/);
});

test("CA-SESSAO-13 — cadastro em 375px sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrirCadastro(page);

  const excedente = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(excedente).toBeLessThanOrEqual(0);
});
