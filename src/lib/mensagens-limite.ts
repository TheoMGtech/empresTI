// Spec 009: mensagens do limite de requisições, usadas pelo servidor (T-SEG-08) e pela interface
// (T-SEG-11). Não dizem qual contador bloqueou nem se o e-mail existe (RN-SEG-08).
export const MENSAGENS_LIMITE = {
  /** RF-SEG-11 (Q4): limite excedido, HTTP 429. */
  excedido: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  /** RN-SEG-12 (P1): contador indisponível, HTTP 503. */
  indisponivel: "Serviço indisponível no momento. Tente novamente em instantes.",
} as const;

/**
 * RF-SEG-13 (T-SEG-11): a mensagem para um erro do tRPC com `TOO_MANY_REQUESTS` ou
 * `SERVICE_UNAVAILABLE`, ou `null` para qualquer outro erro, que segue o tratamento de cada tela.
 * Lê só `error.data.code`, como as telas já fazem com `motivo` (CA-SESSAO-11).
 */
export function mensagemDeLimite(erro: unknown): string | null {
  if (typeof erro !== "object" || erro === null || !("data" in erro)) return null;
  const dados = (erro as { data?: unknown }).data;
  const codigo = typeof dados === "object" && dados !== null ? (dados as { code?: unknown }).code : null;

  if (codigo === "TOO_MANY_REQUESTS") return MENSAGENS_LIMITE.excedido;
  if (codigo === "SERVICE_UNAVAILABLE") return MENSAGENS_LIMITE.indisponivel;
  return null;
}
