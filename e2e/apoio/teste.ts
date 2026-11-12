import { expect, test as base } from "@playwright/test";

// `test` dos E2E com a fixture automática de CSP (Spec 009, CA-SEG-03 e CA-SEG-06): todo teste
// falha se a página registrar uma violação de Content-Security-Policy, em qualquer navegação.
// Vale no servidor de desenvolvimento e no build de produção (`test:e2e:producao`).

declare global {
  interface Window {
    __registrarViolacaoCsp?: (descricao: string) => void;
  }
}

export const test = base.extend<{ violacoesCsp: string[] }>({
  violacoesCsp: [
    async ({ page }, use) => {
      const violacoes: string[] = [];

      // Função exposta pelo Playwright sobrevive às navegações; o ouvinte é instalado em cada
      // documento antes dos scripts da página.
      await page.exposeFunction("__registrarViolacaoCsp", (descricao: string) => {
        violacoes.push(descricao);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (evento) => {
          window.__registrarViolacaoCsp?.(
            `${evento.effectiveDirective} bloqueou ${evento.blockedURI || "(inline)"} ${evento.sample}`,
          );
        });
      });
      // Segundo canal: o Chromium também registra a recusa no console.
      page.on("console", (mensagem) => {
        if (/Content Security Policy/i.test(mensagem.text())) violacoes.push(mensagem.text());
      });

      await use(violacoes);

      expect(violacoes, "violações de CSP registradas pela página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page } from "@playwright/test";
