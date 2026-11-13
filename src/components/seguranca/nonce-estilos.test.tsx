import { cleanup, render } from "@testing-library/react";
import { getNonce, setNonce } from "get-nonce";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { stylesheetSingleton } from "react-style-singleton";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configurarNonceDoDocumento, NonceEstilos } from "./nonce-estilos";

const require = createRequire(import.meta.url);

beforeEach(() => {
  // O estado de `get-nonce` é global do módulo e sobrevive entre testes.
  setNonce(undefined as unknown as string);
  document.head.querySelectorAll("style").forEach((estilo) => estilo.remove());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("T-SEG-04a — nonce dos estilos do Radix", () => {
  it("CA-SEG-03 — no navegador, entrega ao get-nonce o nonce recebido do layout", () => {
    render(<NonceEstilos nonce="bm9uY2UtZG8tZG9jdW1lbnRv" />);

    expect(getNonce()).toBe("bm9uY2UtZG8tZG9jdW1lbnRv");
  });

  it("CA-SEG-03 — mantém o nonce do documento quando o layout traz outro depois", () => {
    const { rerender } = render(<NonceEstilos nonce="primeiro-nonce-do-documento" />);
    rerender(<NonceEstilos nonce="nonce-de-um-payload-posterior" />);

    expect(getNonce()).toBe("primeiro-nonce-do-documento");
  });

  it("CA-SEG-03 — nonce vazio não é configurado", () => {
    configurarNonceDoDocumento("");

    expect(getNonce()).toBeUndefined();
  });

  it("CA-SEG-03 — no servidor, não altera o estado global de get-nonce", () => {
    vi.stubGlobal("window", undefined);

    configurarNonceDoDocumento("nonce-de-uma-requisicao-no-servidor");

    expect(getNonce()).toBeUndefined();
  });

  it("CA-SEG-03 — o projeto e o react-style-singleton usam a mesma instância de get-nonce", () => {
    const doProjeto = require.resolve("get-nonce");
    const pastaSingleton = path.dirname(require.resolve("react-style-singleton"));
    const doSingleton = require.resolve("get-nonce", { paths: [pastaSingleton] });

    expect(doSingleton).toBe(doProjeto);
    expect(
      existsSync(path.join(require.resolve("react-style-singleton/package.json"), "..", "node_modules", "get-nonce")),
    ).toBe(false);
  });

  it("CA-SEG-03 — o <style> do react-style-singleton, usado pelo Radix Dialog, leva o nonce", () => {
    render(<NonceEstilos nonce="bm9uY2UtZG8tcmFkaXg=" />);
    const folha = stylesheetSingleton();

    folha.add(".bloqueio-de-rolagem { overflow: hidden; }");

    const estilos = [...document.head.querySelectorAll("style")];
    expect(estilos).toHaveLength(1);
    expect(estilos[0]!.getAttribute("nonce")).toBe("bm9uY2UtZG8tcmFkaXg=");
    folha.remove();
  });
});
