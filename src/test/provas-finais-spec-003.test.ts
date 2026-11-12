// Provas finais da Spec 003 (T-SESSAO-10).
//
// RS-SESSAO-01 e o risco "middleware esquecido abre dado entre tenants: exige teste por
// procedimento": todo procedimento do AppRouter, exceto os públicos declarados abaixo, recusa quem
// não tem sessão; todo procedimento de Operações recusa `colaborador`. A lista é lida do próprio
// AppRouter, então um procedimento novo sem middleware faz esta prova falhar.
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";

/** Procedimentos públicos por desenho: login, sessão do login e saúde técnica (Specs 001 e 002). */
const PUBLICOS = [
  "autenticacao.entrar",
  "autenticacao.sair",
  "autenticacao.sessao",
  "tecnico.status",
];

/** Procedimentos só de Operações (RS-OPER-01). */
const DE_OPERACOES = [
  "equipamentos.alterarSituacao",
  "equipamentos.cadastrar",
  "operacoes.emprestimosEmAberto",
  "operacoes.registrarDevolucao",
  "operacoes.resumo",
  "operacoes.ultimosCadastros",
];

const PROCEDIMENTOS = Object.keys(routerAplicacao._def.procedures).sort();
const PROTEGIDOS = PROCEDIMENTOS.filter((nome) => !PUBLICOS.includes(nome));

type Papel = "colaborador" | "operacoes";

/** Chama um procedimento pelo caminho, sem entrada: a autorização roda antes da validação. */
function chamar(nome: string, sessao: { usuario: string | null; papel?: Papel }) {
  const caller = routerAplicacao.createCaller({
    obterClientePrisma: () =>
      ({
        membership: {
          findMany: async () =>
            sessao.usuario ? [{ tenantId: TENANT, role: sessao.papel ?? "colaborador" }] : [],
        },
      }) as unknown as PrismaClient,
    obterClienteSupabase: async () =>
      ({
        auth: {
          getUser: async () => ({
            data: { user: sessao.usuario ? { id: sessao.usuario } : null },
            error: null,
          }),
        },
      }) as unknown as ClienteSupabaseAutenticacao,
  });

  const [grupo, procedimento] = nome.split(".") as [string, string];
  const funcao = (
    caller as unknown as Record<string, Record<string, (e?: unknown) => Promise<unknown>>>
  )[grupo]?.[procedimento];
  if (!funcao) throw new Error(`Procedimento ${nome} não encontrado no caller.`);
  return funcao(undefined);
}

describe("autorização em todo o AppRouter", () => {
  it("RS-SESSAO-01 — a lista de procedimentos públicos é exatamente a declarada", () => {
    expect(PROCEDIMENTOS.filter((nome) => PUBLICOS.includes(nome))).toEqual(PUBLICOS.sort());
    expect(PROTEGIDOS.length).toBeGreaterThan(10);
  });

  it.each(PROTEGIDOS)("CA-SESSAO-01 — %s recusa quem não tem sessão", async (nome) => {
    await expect(chamar(nome, { usuario: null })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: MENSAGENS_AUTORIZACAO.semSessao,
    });
  });

  it.each(PROTEGIDOS)("CA-SESSAO-02 — %s recusa sessão sem membership", async (nome) => {
    const semVinculo = routerAplicacao.createCaller({
      obterClientePrisma: () =>
        ({ membership: { findMany: async () => [] } }) as unknown as PrismaClient,
      obterClienteSupabase: async () =>
        ({
          auth: { getUser: async () => ({ data: { user: { id: USUARIO } }, error: null }) },
        }) as unknown as ClienteSupabaseAutenticacao,
    });
    const [grupo, procedimento] = nome.split(".") as [string, string];
    const funcao = (
      semVinculo as unknown as Record<string, Record<string, (e?: unknown) => Promise<unknown>>>
    )[grupo]?.[procedimento] as (e?: unknown) => Promise<unknown>;

    await expect(funcao(undefined)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.semAcesso,
    });
  });

  it("RS-OPER-01 — os procedimentos de Operações são exatamente os declarados", () => {
    expect(PROCEDIMENTOS.filter((nome) => nome.startsWith("operacoes."))).toEqual(
      DE_OPERACOES.filter((nome) => nome.startsWith("operacoes.")),
    );
    for (const nome of DE_OPERACOES) expect(PROCEDIMENTOS).toContain(nome);
  });

  it.each(DE_OPERACOES)("CA-SESSAO-03 — %s recusa colaborador", async (nome) => {
    await expect(chamar(nome, { usuario: USUARIO, papel: "colaborador" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
    });
  });
});
