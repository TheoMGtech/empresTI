// @vitest-environment node
// Spec 009 (T-SEG-10): prova pelo AppRouter. Exatamente as cinco mutações cobertas (RF-SEG-10) usam
// `limitarMutacao`, sempre depois da autenticação, da autorização e da validação de entrada
// (RN-SEG-06). Leituras e `autenticacao.sair` não usam (CA-SEG-11). Um procedimento novo sem o
// limite, ou com ele fora do lugar, faz esta prova falhar.
import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import { adminProcedure, limitarMutacao, tenantProcedure } from "@/server/api/trpc";

type Middleware = ((...args: never[]) => unknown) & { _type?: string };
type Definicao = { type: string; middlewares: Middleware[] };

const COBERTAS = [
  "emprestimos.devolver",
  "emprestimos.solicitar",
  "equipamentos.alterarSituacao",
  "equipamentos.cadastrar",
  "operacoes.registrarDevolucao",
];

const procedimentos = routerAplicacao._def.procedures as unknown as Record<
  string,
  { _def: Definicao }
>;
const [MIDDLEWARE_LIMITE] = (limitarMutacao as unknown as { _middlewares: Middleware[] })
  ._middlewares;
const BASE_TENANT = (tenantProcedure as unknown as { _def: Definicao })._def.middlewares;
const BASE_ADMIN = (adminProcedure as unknown as { _def: Definicao })._def.middlewares;

const usaLimite = (nome: string) =>
  procedimentos[nome]?._def.middlewares.includes(MIDDLEWARE_LIMITE as Middleware) ?? false;

describe("T-SEG-10 — limite das mutações no AppRouter", () => {
  it("RF-SEG-10 — exatamente as cinco mutações cobertas usam o limite", () => {
    const comLimite = Object.keys(procedimentos).filter(usaLimite).sort();

    expect(comLimite).toEqual(COBERTAS);
  });

  it("CA-SEG-11 — as demais mutações são só as do login, que têm limite próprio (T-SEG-09)", () => {
    const outrasMutacoes = Object.entries(procedimentos)
      .filter(([nome, { _def }]) => _def.type === "mutation" && !COBERTAS.includes(nome))
      .map(([nome]) => nome)
      .sort();

    expect(outrasMutacoes).toEqual(["autenticacao.entrar", "autenticacao.sair"]);
  });

  it("CA-SEG-11 — nenhuma consulta usa o limite", () => {
    const consultasComLimite = Object.entries(procedimentos)
      .filter(([nome, { _def }]) => _def.type === "query" && usaLimite(nome))
      .map(([nome]) => nome);

    expect(consultasComLimite).toEqual([]);
  });

  it.each(COBERTAS)(
    "RN-SEG-06 — %s: o limite roda depois da sessão, do papel e da validação de entrada",
    (nome) => {
      const { middlewares } = (procedimentos[nome] as { _def: Definicao })._def;
      const base = middlewares.length && BASE_ADMIN.every((m, i) => middlewares[i] === m)
        ? BASE_ADMIN
        : BASE_TENANT;
      const posicaoLimite = middlewares.indexOf(MIDDLEWARE_LIMITE as Middleware);
      const posicaoEntrada = middlewares.findIndex((m) => m._type === "input");

      expect(base.every((m, i) => middlewares[i] === m)).toBe(true);
      expect(posicaoEntrada).toBeGreaterThanOrEqual(base.length);
      expect(posicaoLimite).toBe(posicaoEntrada + 1);
      expect(middlewares.filter((m) => m === MIDDLEWARE_LIMITE)).toHaveLength(1);
    },
  );
});
