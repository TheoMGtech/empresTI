import { createHmac } from "node:crypto";

import { lerChaveHmacLimites } from "@/env";

// Spec 009 (RS-SEG-01, RN-SEG-05, RN-SEG-09, P3): a tabela `limites_requisicao` guarda só
// HMAC-SHA-256, em hex, de `<escopo>:<valor>`, com a chave do servidor. Nunca e-mail, IP ou id de
// usuário em claro, e nada daqui vai para log. O escopo entra na mensagem para que o mesmo valor
// gere identificadores diferentes em escopos diferentes.

export type EscopoLimite = "login_ip" | "login_email" | "mutacao_ip" | "mutacao_usuario";

/** Identificador único compartilhado por todas as tentativas sem IP confiável (P3). */
export const IP_INDISPONIVEL = "ip-indisponivel";

/** RN-SEG-05: espaços nas pontas removidos e minúsculas, antes do HMAC. */
export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export function identificador(
  escopo: EscopoLimite,
  valor: string,
  chave: string = lerChaveHmacLimites(),
) {
  return createHmac("sha256", chave).update(`${escopo}:${valor}`).digest("hex");
}

/** Identificadores do login: IP confiável (ou o compartilhado) e e-mail normalizado. */
export function identificadoresLogin({ email, ip }: { email: string; ip: string | null }) {
  const chave = lerChaveHmacLimites();
  return {
    login_ip: identificador("login_ip", ip ?? IP_INDISPONIVEL, chave),
    login_email: identificador("login_email", normalizarEmail(email), chave),
  };
}

/** Identificadores das mutações: IP confiável (ou o compartilhado) e `<tenant_id>:<usuario_id>`. */
export function identificadoresMutacao({
  tenantId,
  usuarioId,
  ip,
}: {
  tenantId: string;
  usuarioId: string;
  ip: string | null;
}) {
  const chave = lerChaveHmacLimites();
  return {
    mutacao_ip: identificador("mutacao_ip", ip ?? IP_INDISPONIVEL, chave),
    mutacao_usuario: identificador("mutacao_usuario", `${tenantId}:${usuarioId}`, chave),
  };
}
