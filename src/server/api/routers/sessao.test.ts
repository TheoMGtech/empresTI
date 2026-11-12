// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { PapelMembership, PrismaClient } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import { PAPEIS, esquemaSessaoAtual, type SessaoAtual } from "@/lib/esquemas/sessao";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COM_NOME = "00000000-0000-4000-8000-000000000001";
const SEM_NOME = "00000000-0000-4000-8000-000000000002";
const NOME_EM_BRANCO = "00000000-0000-4000-8000-000000000003";
const OUTRO_TENANT = "00000000-0000-4000-8000-000000000004";
const SEM_VINCULO = "00000000-0000-4000-8000-000000000005";

let banco: BancoReal;
let prisma: PrismaClient;

function como(usuarioId: string | null) {
  const cliente = {
    auth: {
      getUser: async () => ({
        data: {
          user: usuarioId
            ? { id: usuarioId, email: "pessoa@empresa.com", user_metadata: { nome: "Outro" } }
            : null,
        },
        error: null,
      }),
    },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => cliente,
  });
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
  const url = await banco.criarBanco();
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(
      "INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_a'), ($2, 'tenant_b')",
      [TENANT_A, TENANT_B],
    );
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role, nome_exibicao) VALUES
         ($1, $5, 'colaborador', 'Ana Souza'),
         ($2, $5, 'operacoes', NULL),
         ($3, $5, 'colaborador', E'\\t'),
         ($4, $6, 'operacoes', 'Bruno Lima')`,
      [COM_NOME, SEM_NOME, NOME_EM_BRANCO, OUTRO_TENANT, TENANT_A, TENANT_B],
    );
  } finally {
    await cliente.end();
  }
  prisma = new PrismaClient({ adapter: new PrismaPg(url) });
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await prisma?.$disconnect();
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("contrato de sessao.atual", () => {
  it("CA-SESSAO-05 — aceita só nomeExibicao e papel", () => {
    expect(esquemaSessaoAtual.parse({ nomeExibicao: "Ana", papel: "colaborador" })).toEqual({
      nomeExibicao: "Ana",
      papel: "colaborador",
    });
    expect(esquemaSessaoAtual.parse({ nomeExibicao: null, papel: "operacoes" })).toEqual({
      nomeExibicao: null,
      papel: "operacoes",
    });
  });

  it.each([
    ["tenantId", { tenantId: "tenant-1" }],
    ["email", { email: "ana@empresa.com" }],
    ["usuarioId", { usuarioId: "usuario-1" }],
  ])("CA-SESSAO-05 — recusa o campo extra %s", (_campo, extra) => {
    expect(
      esquemaSessaoAtual.safeParse({ nomeExibicao: "Ana", papel: "colaborador", ...extra }).success,
    ).toBe(false);
  });

  it.each([
    ["papel desconhecido", { nomeExibicao: "Ana", papel: "admin" }],
    ["nome vazio", { nomeExibicao: "   ", papel: "colaborador" }],
    ["sem papel", { nomeExibicao: "Ana" }],
    ["sem nomeExibicao", { papel: "colaborador" }],
  ])("CA-SESSAO-05 — recusa %s", (_caso, valor) => {
    expect(esquemaSessaoAtual.safeParse(valor).success).toBe(false);
  });

  it("RN-SESSAO-01 — os papéis do contrato são os do enum PapelMembership", () => {
    expect([...PAPEIS].sort()).toEqual(Object.values(PapelMembership).sort());
  });

  it("CA-SESSAO-05 — o AppRouter expõe sessao.atual com o tipo do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toContain("sessao.atual");
    expectTypeOf<
      inferRouterOutputs<RouterAplicacao>["sessao"]["atual"]
    >().toEqualTypeOf<SessaoAtual>();
  });
});

describe("sessao.atual", () => {
  it("CA-SESSAO-05 — devolve só nomeExibicao e papel", async () => {
    const sessao = await como(COM_NOME).sessao.atual();

    expect(sessao).toEqual({ nomeExibicao: "Ana Souza", papel: "colaborador" });
    expect(Object.keys(sessao).sort()).toEqual(["nomeExibicao", "papel"]);
  });

  it("CA-SESSAO-05 — devolve null sem nome de exibição", async () => {
    await expect(como(SEM_NOME).sessao.atual()).resolves.toEqual({
      nomeExibicao: null,
      papel: "operacoes",
    });
  });

  it("CA-SESSAO-05 — nome só com espaço em branco conta como ausente", async () => {
    await expect(como(NOME_EM_BRANCO).sessao.atual()).resolves.toEqual({
      nomeExibicao: null,
      papel: "colaborador",
    });
  });

  it("RS-SESSAO-01 — cada usuário recebe os dados do próprio membership", async () => {
    await expect(como(OUTRO_TENANT).sessao.atual()).resolves.toEqual({
      nomeExibicao: "Bruno Lima",
      papel: "operacoes",
    });
  });

  it("CA-SESSAO-01 — sem sessão responde UNAUTHORIZED", async () => {
    await expect(como(null).sessao.atual()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: MENSAGENS_AUTORIZACAO.semSessao,
    });
  });

  it("CA-SESSAO-02 — sessão sem membership responde FORBIDDEN", async () => {
    await expect(como(SEM_VINCULO).sessao.atual()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.semAcesso,
    });
  });
});
