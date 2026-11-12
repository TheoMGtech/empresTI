// CSP com nonce por requisição (Spec 009, RF-SEG-01 a RF-SEG-03, RS-SEG-06; ADR-001 §10).
// Montada e aplicada em `src/proxy.ts`; os cabeçalhos fixos ficam em `cabecalhos.ts` (decisão Q1).

/** Cabeçalho pelo qual o nonce segue para a renderização, para quem precisar lê-lo. */
export const CABECALHO_NONCE = "x-nonce";
export const CABECALHO_CSP = "Content-Security-Policy";

const BYTES_NONCE = 16; // 128 bits

/** Nonce novo de `crypto.getRandomValues`, em base64 (RS-SEG-06). */
export function gerarNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(BYTES_NONCE));
  return btoa(String.fromCharCode(...bytes));
}

type OpcoesCsp = {
  nonce: string;
  /** `NODE_ENV === "development"`: libera só o que o hot reload exige (RF-SEG-03). */
  desenvolvimento: boolean;
  /** `NEXT_PUBLIC_SUPABASE_URL`; a origem dela serve as fotografias do Storage. */
  urlSupabase: string;
};

export function montarCsp({ nonce, desenvolvimento, urlSupabase }: OpcoesCsp): string {
  const origemStorage = new URL(urlSupabase).origin;

  const diretivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, ...(desenvolvimento ? ["'unsafe-eval'"] : [])],
    // Com nonce na lista, o navegador ignora `'unsafe-inline'`; por isso, no desenvolvimento, a
    // diretiva de estilo troca o nonce pelo `'unsafe-inline'` que o hot reload usa.
    "style-src": desenvolvimento ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    "img-src": ["'self'", origemStorage],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(diretivas)
    .map(([nome, valores]) => `${nome} ${valores.join(" ")}`)
    .join("; ");
}
