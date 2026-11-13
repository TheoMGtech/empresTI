// Spec 009: mensagens do limite de requisições, usadas pelo servidor (T-SEG-08) e pela interface
// (T-SEG-11). Não dizem qual contador bloqueou nem se o e-mail existe (RN-SEG-08).
export const MENSAGENS_LIMITE = {
  /** RF-SEG-11 (Q4): limite excedido, HTTP 429. */
  excedido: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  /** RN-SEG-12 (P1): contador indisponível, HTTP 503. */
  indisponivel: "Serviço indisponível no momento. Tente novamente em instantes.",
} as const;
