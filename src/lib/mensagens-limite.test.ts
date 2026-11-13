import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";

import { MENSAGENS_LIMITE, mensagemDeLimite } from "@/lib/mensagens-limite";
import { erroTRPC } from "@/test/trpc";

describe("mensagemDeLimite (RF-SEG-13)", () => {
  it("CA-SEG-17 — 429 e 503 do tRPC têm as mensagens aprovadas, sem usar a do servidor", () => {
    expect(mensagemDeLimite(erroTRPC("TOO_MANY_REQUESTS", "outra coisa"))).toBe(
      MENSAGENS_LIMITE.excedido,
    );
    expect(mensagemDeLimite(erroTRPC("SERVICE_UNAVAILABLE", "outra coisa"))).toBe(
      MENSAGENS_LIMITE.indisponivel,
    );
  });

  it.each([
    ["UNAUTHORIZED", erroTRPC("UNAUTHORIZED", "x")],
    ["INTERNAL_SERVER_ERROR", erroTRPC("INTERNAL_SERVER_ERROR", "x")],
    ["CONFLICT com motivo", erroTRPC("CONFLICT", "x", { motivo: "EMPRESTIMO_JA_ENCERRADO" })],
    ["erro de rede", TRPCClientError.from(new Error("fetch failed"))],
    ["Error comum", new Error("TOO_MANY_REQUESTS")],
    ["objeto sem data", { code: "TOO_MANY_REQUESTS" }],
    ["data nula", { data: null }],
    ["nulo", null],
    ["texto", "TOO_MANY_REQUESTS"],
  ])("%s segue o tratamento da tela (null)", (_caso, erro) => {
    expect(mensagemDeLimite(erro)).toBeNull();
  });
});
