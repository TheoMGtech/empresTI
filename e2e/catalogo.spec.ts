import { expect, test, type Page } from "./apoio/teste";

import { simularTRPC } from "./apoio/trpc";

// Dados fictícios no formato da carga inicial da Spec 002. As fotos usam a origem do Storage que a
// CSP libera (Spec 009, RF-SEG-02), como em produção, mas toda requisição a ela é abortada abaixo:
// prova o fallback sem tocar no Storage real.
const HOST_FOTOS = "https://wdudlqacomnasnrxgbni.supabase.co";

const ITENS = [
  ["TI-0001", "Notebook 14 polegadas", "notebook", "disponivel"],
  ["TI-0002", "Notebook 15 polegadas", "notebook", "disponivel"],
  ["TI-0003", "Notebook 13 polegadas", "notebook", "disponivel"],
  ["TI-0004", "Notebook 15 polegadas", "notebook", "manutencao"],
  ["TI-0005", "Monitor 24 polegadas", "monitor", "disponivel"],
  ["TI-0006", "Monitor 27 polegadas", "monitor", "disponivel"],
  ["TI-0007", "Monitor 22 polegadas", "monitor", "manutencao"],
  ["TI-0008", "Cabo HDMI 2 m", "cabo", "disponivel"],
  ["TI-0009", "Cabo USB-C 1 m", "cabo", "disponivel"],
  ["TI-0010", "Cabo de rede 3 m", "cabo", "disponivel"],
  ["TI-0011", "Webcam Full HD", "camera", "disponivel"],
  ["TI-0012", "Câmera compacta", "camera", "disponivel"],
].map(([patrimonio, nome, categoria, estado]) => ({
  patrimonio,
  nome,
  categoria,
  imagemUrl: `${HOST_FOTOS}/storage/v1/object/public/equipamentos/${patrimonio}.jpg`,
  disponibilidade: { estado },
}));

async function abrirCatalogo(page: Page, papel: "colaborador" | "operacoes" = "colaborador") {
  await page.route(`${HOST_FOTOS}/**`, (rota) => rota.abort());
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Marina Alves", papel } },
    "emprestimos.meuResumo": { dados: { itensAbertos: 2, limite: 3, emAtraso: 0, prazoDias: 14 } },
    "equipamentos.listar": (entrada) => {
      const { categoria, somenteDisponiveis } = (entrada ?? {}) as {
        categoria?: string;
        somenteDisponiveis?: boolean;
      };
      const itens = ITENS.filter(
        (item) =>
          (!categoria || item.categoria === categoria) &&
          (!somenteDisponiveis || item.disponibilidade.estado === "disponivel"),
      );
      return { dados: { itens, proximoCursor: null, resumo: { total: 12, disponiveis: 10 } } };
    },
  });
  await page.goto("/catalogo");
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
}

async function larguraExcedente(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test("CA-CATALOGO-01/04/06 — mostra os 12 itens, manutenção sem ação e ícone quando a foto falha", async ({
  page,
}) => {
  await abrirCatalogo(page);

  await expect(page.getByRole("article")).toHaveCount(12);
  await expect(page.getByText("12 equipamentos · 10 disponíveis agora")).toBeVisible();

  for (const patrimonio of ["TI-0004", "TI-0007"]) {
    const card = page.locator(`[data-patrimonio="${patrimonio}"]`);
    await expect(card.getByText("Manutenção", { exact: true })).toBeVisible();
    await expect(card.getByRole("link")).toHaveCount(0);
  }

  await expect(page.locator('[data-patrimonio="TI-0001"] [data-miniatura]')).toHaveAttribute(
    "data-miniatura",
    "icone",
  );
});

test("CA-SESSAO-13 — em 375px não há rolagem horizontal e a barra superior substitui a sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await abrirCatalogo(page, "operacoes");

  expect(await larguraExcedente(page)).toBeLessThanOrEqual(0);
  await expect(page.getByRole("banner", { name: "Barra superior" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Barra lateral" })).toBeHidden();
  await expect(
    page.getByRole("banner", { name: "Barra superior" }).getByRole("link", {
      name: "Cadastrar equipamento",
    }),
  ).toBeVisible();
});

test("CA-SESSAO-13 — a partir de 1024px a sidebar fica fixa", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await abrirCatalogo(page);

  const lateral = page.getByRole("complementary", { name: "Barra lateral" });
  await expect(lateral).toBeVisible();
  await expect(page.getByRole("banner", { name: "Barra superior" })).toBeHidden();
  expect(await larguraExcedente(page)).toBeLessThanOrEqual(0);

  await page.mouse.wheel(0, 2000);
  await expect(lateral).toBeInViewport();
  expect(await lateral.evaluate((elemento) => getComputedStyle(elemento).position)).toBe("sticky");
});

test("CA-CATALOGO-07 — chips e Só disponíveis filtram a grade", async ({ page }) => {
  await abrirCatalogo(page);
  await expect(page.getByRole("article")).toHaveCount(12);

  await page
    .getByRole("group", { name: "Categoria" })
    .getByRole("button", { name: "Notebooks" })
    .click();
  await expect(page.getByRole("article")).toHaveCount(4);

  await page.getByRole("button", { name: "Só disponíveis" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.locator('[data-patrimonio="TI-0004"]')).toHaveCount(0);

  await page
    .getByRole("group", { name: "Categoria" })
    .getByRole("button", { name: "Todos" })
    .click();
  await expect(page.getByRole("article")).toHaveCount(10);
});

test("CA-SESSAO-06 — colaborador não vê o grupo Operações no navegador", async ({ page }) => {
  await abrirCatalogo(page);

  const lateral = page.getByRole("complementary", { name: "Barra lateral" });
  await expect(lateral.getByRole("link", { name: "Catálogo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(lateral.getByRole("link", { name: "Empréstimos em aberto" })).toHaveCount(0);
});
