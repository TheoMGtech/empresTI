import type { Page } from "@playwright/test";
import superjson from "superjson";

// Simulação de tRPC no navegador para E2E de desenvolvimento (DF-14). Não substitui a validação
// integrada real antes da entrega e não toca em Supabase nem banco.

const CODIGOS_JSON_RPC = {
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  INTERNAL_SERVER_ERROR: -32603,
} as const;

export type RespostaSimulada =
  | { dados: unknown }
  | { erro: keyof typeof CODIGOS_JSON_RPC; mensagem: string; motivo?: string };

export type RespostasSimuladas = Record<
  string,
  RespostaSimulada | ((entrada: unknown) => RespostaSimulada)
>;

function entradas(url: URL) {
  const bruto = url.searchParams.get("input");
  if (!bruto) return {};
  const lote = JSON.parse(bruto) as Record<string, Parameters<typeof superjson.deserialize>[0]>;
  return Object.fromEntries(
    Object.entries(lote).map(([indice, valor]) => [indice, superjson.deserialize(valor)]),
  );
}

/** Responde cada procedimento do lote do `httpBatchLink` com dados ou erro no formato tRPC. */
export async function simularTRPC(page: Page, respostas: RespostasSimuladas) {
  await page.route("**/api/trpc/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminhos = decodeURIComponent(url.pathname.replace(/^\/api\/trpc\//, "")).split(",");
    const lote = entradas(url);

    const corpo = caminhos.map((caminho, indice) => {
      const definida = respostas[caminho];
      const resposta = typeof definida === "function" ? definida(lote[indice]) : definida;

      if (!resposta) {
        throw new Error(`Procedimento sem simulação no E2E: ${caminho}`);
      }

      if ("dados" in resposta) {
        return { result: { data: superjson.serialize(resposta.dados) } };
      }

      return {
        error: superjson.serialize({
          code: CODIGOS_JSON_RPC[resposta.erro],
          message: resposta.mensagem,
          data: {
            code: resposta.erro,
            httpStatus: 0,
            path: caminho,
            motivo: resposta.motivo ?? null,
            campos: null,
          },
        }),
      };
    });

    await rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(corpo),
    });
  });
}
