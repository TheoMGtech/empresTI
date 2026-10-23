import { expect, test } from "@playwright/test";

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
