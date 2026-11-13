import { simularTRPC } from "./apoio/trpc";
import { expect, test, type Page } from "./apoio/teste";

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

test("CA-SEG-17 — login com 429 mostra a mensagem de limite e não sai da tela", async ({ page }) => {
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: false } },
    "autenticacao.entrar": {
      erro: "TOO_MANY_REQUESTS",
      mensagem: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      retryAfter: 450,
    },
  });
  const resposta = page.waitForResponse((r) => r.url().includes("autenticacao.entrar"));

  await abrirLoginHidratado(page);
  await page.getByLabel("E-mail").fill("colaborador@empresa.com");
  await page.getByLabel("Senha").fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  expect((await resposta).status()).toBe(429);
  await expect(
    page.getByText("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."),
  ).toBeVisible();
  await expect(page.getByText("Não foi possível concluir o acesso. Tente novamente.")).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  // O servidor responde 429 com Retry-After; a tela não depende dele, mas a simulação o reproduz.
  expect((await resposta).headers()["retry-after"]).toBe("450");
});
