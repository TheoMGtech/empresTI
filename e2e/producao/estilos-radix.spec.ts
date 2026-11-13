import { expect, test } from "../apoio/teste";
import { simularTRPC } from "../apoio/trpc";

// Spec 009 (T-SEG-04a/T-SEG-04, CA-SEG-03): no build de produção, os `<style>` que o Radix Dialog
// insere ao abrir levam o nonce da CSP aplicada ao documento. A fixture de `../apoio/teste`
// também falha o teste se houver qualquer violação de CSP. Dados fictícios, tRPC simulado.

const ITEM = {
  id: "22222222-2222-4222-8222-222222222222",
  equipamento: {
    patrimonio: "TI-0005",
    nome: "Monitor 24 polegadas",
    categoria: "monitor",
    imagemUrl: null,
  },
  retiradoEm: new Date("2026-10-20T13:00:00Z"),
  devolverAte: "2026-11-03",
  emAtraso: true,
};

test("CA-SEG-03 — o <style> inserido pelo Radix Dialog leva o nonce da CSP do documento", async ({
  page,
}) => {
  await simularTRPC(page, {
    "autenticacao.sessao": { dados: { autenticado: true } },
    "sessao.atual": { dados: { nomeExibicao: "Marina Alves", papel: "colaborador" } },
    "emprestimos.meus": { dados: [ITEM] },
    "emprestimos.meuResumo": {
      dados: { itensAbertos: 1, limite: 3, emAtraso: 1, prazoDias: 14 },
    },
    "emprestimos.historico": { dados: { itens: [], proximoCursor: null } },
  });

  const resposta = await page.goto("/meus-emprestimos");
  const csp = (await resposta!.allHeaders())["content-security-policy"] ?? "";
  const nonceDoDocumento = /style-src [^;]*'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonceDoDocumento).toBeTruthy();

  const estilosAntes = await page.locator("style").count();
  await page.getByRole("button", { name: "Devolver Monitor 24 polegadas" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar devolução" })).toBeVisible();

  // O navegador esconde o atributo `nonce`; a propriedade `nonce` guarda o valor.
  const noncesDosEstilos = await page
    .locator("style")
    .evaluateAll((estilos) => estilos.map((estilo) => (estilo as HTMLStyleElement).nonce));
  expect(noncesDosEstilos.length).toBeGreaterThan(estilosAntes);
  expect(noncesDosEstilos.every((nonce) => nonce === nonceDoDocumento)).toBe(true);
});
