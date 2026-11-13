// Cabeçalhos HTTP fixos (Spec 009, RF-SEG-04 e RF-SEG-05; ADR-001 §10). A CSP não fica aqui:
// ela leva um nonce por requisição e é aplicada em `src/proxy.ts` (decisão Q1).

export type CabecalhoHttp = { key: string; value: string };

/** Valem para todas as rotas, em qualquer ambiente. */
export const CABECALHOS_FIXOS: readonly CabecalhoHttp[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Complemento de `frame-ancestors 'none'` para navegadores que não leem a CSP.
  { key: "X-Frame-Options", value: "DENY" },
];

/** Um ano, sem `preload` e sem `includeSubDomains` (Q15, P4). */
export const HSTS: CabecalhoHttp = {
  key: "Strict-Transport-Security",
  value: "max-age=31536000",
};

/**
 * Lista aplicada pelo `next.config.ts`. O HSTS só entra no deploy de produção da Vercel
 * (`VERCEL_ENV=production`), que é servido só por HTTPS.
 */
export function cabecalhosFixos(ambienteVercel: string | undefined): CabecalhoHttp[] {
  return ambienteVercel === "production" ? [...CABECALHOS_FIXOS, HSTS] : [...CABECALHOS_FIXOS];
}
