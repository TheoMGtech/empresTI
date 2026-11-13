import { expect, test } from "../apoio/teste";

// Spec 009 (T-SEG-04): cabeçalhos e CSP no build de produção. Só roda com
// `npm run test:e2e:producao`; o servidor de desenvolvimento usa outra política (RF-SEG-03).

const TELAS = [
  "/",
  "/catalogo",
  "/catalogo/TI-0001",
  "/meus-emprestimos",
  "/operacoes/emprestimos",
  "/operacoes/equipamentos/novo",
];

const FIXOS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "DENY",
};

function diretivas(csp: string) {
  return Object.fromEntries(
    csp.split(";").map((trecho) => {
      const [nome, ...valores] = trecho.trim().split(/\s+/);
      return [nome!, valores];
    }),
  );
}

function nonceDaCsp(csp: string) {
  const nonce = /script-src [^;]*'nonce-([^']+)'/.exec(csp)?.[1];
  if (!nonce) throw new Error("CSP sem nonce em script-src");
  return nonce;
}

/** Nonce de cada `<script>` do HTML; `null` quando o script não tem nonce. */
function noncesDosScripts(html: string) {
  return [...html.matchAll(/<script\b[^>]*>/g)].map(
    ([abertura]) => /\snonce="([^"]*)"/.exec(abertura)?.[1] ?? null,
  );
}

for (const tela of TELAS) {
  test(`CA-SEG-01/04 — ${tela} responde com a CSP aplicada e os cabeçalhos fixos`, async ({
    request,
  }) => {
    const resposta = await request.get(tela);
    const cabecalhos = resposta.headers();
    const csp = cabecalhos["content-security-policy"] ?? "";
    const nonce = nonceDaCsp(csp);

    expect(diretivas(csp)).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", `'nonce-${nonce}'`],
      "style-src": ["'self'", `'nonce-${nonce}'`],
      "img-src": ["'self'", "https://wdudlqacomnasnrxgbni.supabase.co"],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
    });
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(cabecalhos["content-security-policy-report-only"]).toBeUndefined();
    expect(cabecalhos).toMatchObject(FIXOS);
    // Fora do deploy de produção da Vercel não há HSTS (RF-SEG-05).
    expect(cabecalhos["strict-transport-security"]).toBeUndefined();
  });
}

test("CA-SEG-02 — duas requisições seguidas recebem nonces diferentes", async ({ request }) => {
  const primeira = await request.get("/catalogo");
  const segunda = await request.get("/catalogo");

  expect(nonceDaCsp(primeira.headers()["content-security-policy"] ?? "")).not.toBe(
    nonceDaCsp(segunda.headers()["content-security-policy"] ?? ""),
  );
});

for (const tela of TELAS) {
  test(`CA-SEG-02 — em ${tela}, todo script do HTML carrega o nonce da própria resposta`, async ({
    request,
  }) => {
    const resposta = await request.get(tela);
    const nonce = nonceDaCsp(resposta.headers()["content-security-policy"] ?? "");
    const nonces = noncesDosScripts(await resposta.text());

    expect(nonces.length).toBeGreaterThan(0);
    expect(nonces.every((valor) => valor === nonce)).toBe(true);
  });
}

test("CA-SEG-06 — nenhuma tela traz estilo inline no HTML do servidor", async ({ request }) => {
  for (const tela of TELAS) {
    const html = await (await request.get(tela)).text();
    expect(html, tela).not.toMatch(/<style(?![^>]*\snonce=)[\s>]|\sstyle="/);
  }
});
