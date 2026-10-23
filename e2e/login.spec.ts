import { expect, test, type Page } from "@playwright/test";

async function abrirLoginHidratado(page: Page, caminho = "/") {
  // A consulta de sessão só parte depois da hidratação; antes dela o formulário
  // ainda não tem a validação do cliente.
  const hidratado = page.waitForRequest((requisicao) =>
    requisicao.url().includes("/api/trpc/autenticacao.sessao"),
  );
  await page.goto(caminho);
  await hidratado;
}

test("CA-LOGIN-01 — exibe o login na tela inicial", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "Entrar" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("CA-LOGIN-09 — redireciona /login para /", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 2, name: "Entrar" })).toBeVisible();
});

test("CA-LOGIN-02 — bloqueia entradas inválidas sem chamar a autenticação", async ({ page }) => {
  const chamadasDeEntrada: string[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.url().includes("autenticacao.entrar")) chamadasDeEntrada.push(requisicao.url());
  });

  await abrirLoginHidratado(page);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Informe a senha.")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeFocused();

  await page.getByLabel("E-mail").fill("sem-arroba");
  await page.getByLabel("Senha").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expect(page.getByText("Informe a senha.")).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  expect(chamadasDeEntrada).toEqual([]);
});
