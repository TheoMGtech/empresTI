import { expect, test } from "./apoio/teste";

import { simularTRPC } from "./apoio/trpc";

test("CA-LOGIN-05 — sessão válida ao abrir / vai para /catalogo", async ({ page }) => {
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Marina Alves", papel: "colaborador" } },
    "emprestimos.meuResumo": { dados: { itensAbertos: 0, limite: 3, emAtraso: 0, prazoDias: 14 } },
    "equipamentos.listar": {
      dados: { itens: [], proximoCursor: null, resumo: { total: 0, disponiveis: 0 } },
    },
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/catalogo$/);
});

test("CA-LOGIN-01 — sem sessão, / continua no formulário", async ({ page }) => {
  await simularTRPC(page, { "autenticacao.sessao": { dados: { autenticado: false } } });

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Entrar" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
