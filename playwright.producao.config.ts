import { defineConfig, devices } from "@playwright/test";

// E2E no build de produção (Spec 009, T-SEG-04): `next build` e `next start`, com a CSP de
// produção. Roda toda a suíte de `e2e/` (as telas, com a fixture de violação de CSP) e os testes
// de cabeçalho e nonce de `e2e/producao/`. tRPC simulado; sem Supabase nem banco (DF-14).
const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "html",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "on-first-retry" },
  webServer: {
    command: `npm run build && npm run start -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    // Sempre um build novo do código atual: servidor antigo na porta testaria outra versão.
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
