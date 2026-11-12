import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const RAIZ = path.resolve(__dirname, "..");

/** Arquivos de código (sem testes) sob `src/`. */
function arquivosDeCodigo(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name) ? [caminho] : [];
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("T-SEG-04a — Zod sem eval", () => {
  it("CA-SEG-03 — construir e usar os esquemas não chama new Function", async () => {
    const chamadas: unknown[][] = [];
    const FunctionOriginal = Function;
    vi.stubGlobal(
      "Function",
      new Proxy(FunctionOriginal, {
        construct(alvo, argumentos) {
          chamadas.push(argumentos);
          return Reflect.construct(alvo, argumentos);
        },
      }),
    );

    vi.resetModules();
    const { esquemaEntrada } = await import("@/lib/esquemas/autenticacao");
    const { esquemaCadastroEquipamento } = await import("@/lib/esquemas/equipamentos");
    esquemaEntrada.safeParse({ email: "pessoa@empresa.com", senha: "segredo-de-teste" });
    esquemaCadastroEquipamento.safeParse({});

    expect(chamadas).toEqual([]);
  });

  it("CA-SEG-03 — o Zod do projeto fica em jitless", async () => {
    const { z } = await import("./zod");

    expect(z.config().jitless).toBe(true);
  });

  it("CA-SEG-03 — nenhum código de src importa \"zod\" fora de src/lib/zod.ts e do servidor", () => {
    const permitidos = new Set([
      path.join(RAIZ, "lib", "zod.ts"),
      path.join(RAIZ, "server", "api", "trpc.ts"),
      path.join(RAIZ, "test", "sonda-typescript.ts"),
    ]);
    const diretos = arquivosDeCodigo(RAIZ).filter(
      (arquivo) =>
        !permitidos.has(arquivo) && /from\s+["']zod["']/.test(readFileSync(arquivo, "utf8")),
    );

    expect(diretos.map((arquivo) => path.relative(RAIZ, arquivo))).toEqual([]);
  });
});
