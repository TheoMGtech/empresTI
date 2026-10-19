import { expect, test } from "@playwright/test";

test("AZ-02/AZ-05 — exibe a prova executável", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A base está de pé.");
  await expect(page.getByText("API técnica")).toBeVisible();
});
