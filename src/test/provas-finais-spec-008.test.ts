// Provas finais da Spec 008 (T-OPER-08).
//
// CA-OPER-04 em todo o AppRouter: o conjunto de procedimentos que recusa `colaborador` com
// "Acesso restrito a Operações." é exatamente o de Operações, e `operacoes` passa da autorização
// em cada um deles. A lista é lida do próprio AppRouter: um procedimento de Operações sem
// `adminProcedure`, ou um procedimento comum restrito por engano, faz esta prova falhar. As provas
// com banco real de cada procedimento ficam em `operacoes-painel`, `operacoes-devolucao`,
// `equipamentos-cadastrar` e `equipamentos-situacao`.
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";

/** Procedimentos públicos por desenho (Specs 001 e 002), fora da autorização por papel. */
const PUBLICOS = [
  "autenticacao.entrar",
  "autenticacao.sair",
  "autenticacao.sessao",
  "tecnico.status",
];

/** Os seis procedimentos de Operações da Spec 008 (contrato da T-OPER-01). */
const DE_OPERACOES = [
  "equipamentos.alterarSituacao",
  "equipamentos.cadastrar",
  "operacoes.emprestimosEmAberto",
  "operacoes.registrarDevolucao",
  "operacoes.resumo",
  "operacoes.ultimosCadastros",
];

const PROTEGIDOS = Object.keys(routerAplicacao._def.procedures)
  .filter((nome) => !PUBLICOS.includes(nome))
  .sort();

type Papel = "colaborador" | "operacoes";

/**
 * Chama o procedimento sem entrada, com sessão válida e um único membership no papel dado. A
 * autorização roda antes da validação e do acesso a dados: o que vem depois dela pode falhar por
 * outro motivo, e só o erro de autorização interessa aqui.
 */
async function erroAoChamar(nome: string, papel: Papel): Promise<unknown> {
  const caller = routerAplicacao.createCaller({
    obterClientePrisma: () =>
      ({
        membership: { findMany: async () => [{ tenantId: TENANT, role: papel }] },
      }) as unknown as PrismaClient,
    obterClienteSupabase: async () =>
      ({
        auth: { getUser: async () => ({ data: { user: { id: USUARIO } }, error: null }) },
      }) as unknown as ClienteSupabaseAutenticacao,
  });

  const [grupo, procedimento] = nome.split(".") as [string, string];
  const funcao = (
    caller as unknown as Record<string, Record<string, (e?: unknown) => Promise<unknown>>>
  )[grupo]?.[procedimento];
  if (!funcao) throw new Error(`Procedimento ${nome} não encontrado no caller.`);

  try {
    await funcao(undefined);
    return null;
  } catch (erro) {
    return erro;
  }
}

function restritoAOperacoes(erro: unknown) {
  const { code, message } = (erro ?? {}) as { code?: string; message?: string };
  return code === "FORBIDDEN" && message === MENSAGENS_AUTORIZACAO.restritoOperacoes;
}

describe("T-OPER-08 — autorização de Operações em todo o AppRouter", () => {
  it("CA-OPER-04 — os seis procedimentos de Operações existem no AppRouter", () => {
    for (const nome of DE_OPERACOES) expect(PROTEGIDOS).toContain(nome);
  });

  it.each(DE_OPERACOES)("CA-OPER-04 — %s recusa colaborador", async (nome) => {
    expect(await erroAoChamar(nome, "colaborador")).toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
    });
  });

  it.each(DE_OPERACOES)("CA-OPER-04 — %s passa da autorização para operacoes", async (nome) => {
    expect(restritoAOperacoes(await erroAoChamar(nome, "operacoes"))).toBe(false);
  });

  it("CA-OPER-04 — só os procedimentos de Operações recusam colaborador", async () => {
    const restritos: string[] = [];
    for (const nome of PROTEGIDOS) {
      if (restritoAOperacoes(await erroAoChamar(nome, "colaborador"))) restritos.push(nome);
    }

    expect(restritos).toEqual(DE_OPERACOES);
  });
});
