"use client";

import { getNonce, setNonce } from "get-nonce";

// Spec 009 (T-SEG-04a, CA-SEG-03): o Radix Dialog insere um `<style>` (react-remove-scroll →
// react-style-singleton) com o nonce que estiver em `get-nonce`. Sem ele, a CSP de produção
// bloqueia o estilo. Este componente entrega ao `get-nonce` o nonce que o proxy gerou para o
// documento, lido pelo layout raiz em `x-nonce`; nenhum nonce é gerado no cliente.

/**
 * Configura o nonce só no navegador e só uma vez. No servidor, o estado de `get-nonce` é global do
 * módulo e vazaria entre requisições. No navegador, vale o primeiro nonce, o da CSP aplicada ao
 * documento: um payload posterior do layout (navegação ou `router.refresh()`) traz outro nonce,
 * mas a CSP do documento continua a mesma.
 */
export function configurarNonceDoDocumento(nonce: string) {
  if (typeof window === "undefined" || !nonce || getNonce()) return;
  setNonce(nonce);
}

/** Roda na renderização, antes de qualquer diálogo montar e inserir estilos. */
export function NonceEstilos({ nonce }: { nonce: string }) {
  configurarNonceDoDocumento(nonce);
  return null;
}
