import type { Page } from "@playwright/test";
import superjson from "superjson";

// Simulação de tRPC no navegador para E2E de desenvolvimento (DF-14). Não substitui a validação
// integrada real antes da entrega e não toca em Supabase nem banco.

const CODIGOS_JSON_RPC = {
  UNAUTHORIZED: [-32001, 401],
  FORBIDDEN: [-32003, 403],
  NOT_FOUND: [-32004, 404],
  CONFLICT: [-32009, 409],
  PRECONDITION_FAILED: [-32012, 412],
  INTERNAL_SERVER_ERROR: [-32603, 500],
} as const;

export type RespostaSimulada =
  | { dados: unknown }
  | { erro: keyof typeof CODIGOS_JSON_RPC; mensagem: string; motivo?: string };

export type RespostasSimuladas = Record<
  string,
  RespostaSimulada | ((entrada: unknown) => RespostaSimulada)
>;

type LoteSerializado = Record<string, Parameters<typeof superjson.deserialize>[0]>;

// Consultas levam a entrada na URL; mutations, no corpo do POST.
function entradas(url: URL, corpo: string | null) {
  const bruto = url.searchParams.get("input") ?? corpo;
  if (!bruto) return {};
  const lote = JSON.parse(bruto) as LoteSerializado;
  return Object.fromEntries(
    Object.entries(lote).map(([indice, valor]) => [indice, superjson.deserialize(valor)]),
  );
}

/** Responde cada procedimento do lote do `httpBatchLink` com dados ou erro no formato tRPC. */
export async function simularTRPC(page: Page, respostas: RespostasSimuladas) {
  await page.route("**/api/trpc/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminhos = decodeURIComponent(url.pathname.replace(/^\/api\/trpc\//, "")).split(",");
    const lote = entradas(url, rota.request().postData());

    const corpo = caminhos.map((caminho, indice) => {
      const definida = respostas[caminho];
      const resposta = typeof definida === "function" ? definida(lote[indice]) : definida;

      if (!resposta) {
        throw new Error(`Procedimento sem simulação no E2E: ${caminho}`);
      }

      if ("dados" in resposta) {
        return { result: { data: superjson.serialize(resposta.dados) } };
      }

      const [codigoJson, status] = CODIGOS_JSON_RPC[resposta.erro];
      return {
        error: superjson.serialize({
          code: codigoJson,
          message: resposta.mensagem,
          data: {
            code: resposta.erro,
            httpStatus: status,
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
