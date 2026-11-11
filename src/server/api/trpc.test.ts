// @vitest-environment node
// T-SESSAO-04: contexto e middlewares com banco real e identidade do Supabase simulada na fronteira.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ErroComMotivo,
  MENSAGENS_AUTORIZACAO,
  adminProcedure,
  criarRouterTRPC,
  protectedProcedure,
  tenantProcedure,
} from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR_A = "00000000-0000-4000-8000-000000000001";
const OPERACOES_A = "00000000-0000-4000-8000-000000000002";
const COLABORADOR_B = "00000000-0000-4000-8000-000000000003";
const SEM_VINCULO = "00000000-0000-4000-8000-000000000004";
const DOIS_VINCULOS = "00000000-0000-4000-8000-000000000005";

const routerTeste = criarRouterTRPC({
  protegido: protectedProcedure.query(({ ctx }) => ({ usuarioId: ctx.usuarioId })),
  doTenant: tenantProcedure
    .input(z.object({ filtro: z.string() }))
    .query(({ ctx, input }) => ({ tenantId: ctx.tenantId, papel: ctx.papel, input })),
  administrativo: adminProcedure.query(({ ctx }) => ({ tenantId: ctx.tenantId, papel: ctx.papel })),
});

type ErroAuth = { status?: number; message: string; name?: string };
type Identidade = { id: string; app_metadata?: object; user_metadata?: object } | null;

let banco: BancoReal;
let prisma: PrismaClient;

function clienteSupabase(usuario: Identidade, erro: ErroAuth | null = null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: erro ? null : usuario }, error: erro }),
    },
  } as unknown as ClienteSupabaseAutenticacao;
}

function caller(usuario: Identidade, erro: ErroAuth | null = null) {
  return routerTeste.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => clienteSupabase(usuario, erro),
  });
}

const como = (id: string, extras: Partial<NonNullable<Identidade>> = {}) =>
  caller({ id, ...extras });

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
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $5, 'colaborador'), ($2, $5, 'operacoes'), ($3, $6, 'colaborador'),
         ($4, $5, 'colaborador'), ($4, $6, 'operacoes')`,
      [COLABORADOR_A, OPERACOES_A, COLABORADOR_B, DOIS_VINCULOS, TENANT_A, TENANT_B],
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

describe("protectedProcedure", () => {
  it.each([
    ["sem usuário", null, null],
    [
      "sem sessão no cookie",
      null,
      { status: 400, message: "Auth session missing!", name: "AuthSessionMissingError" },
    ],
    ["token inválido ou expirado", null, { status: 403, message: "invalid JWT" }],
  ])("CA-SESSAO-01 — %s responde UNAUTHORIZED", async (_caso, usuario, erro) => {
    const chamada = caller(usuario, erro);

    for (const procedimento of [
      () => chamada.protegido(),
      () => chamada.doTenant({ filtro: "x" }),
      () => chamada.administrativo(),
    ]) {
      await expect(procedimento()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: MENSAGENS_AUTORIZACAO.semSessao,
      });
    }
  });

  it.each([
    ["Auth indisponível", { status: 503, message: "detalhe interno" }],
    ["falha de rede", { status: 0, message: "fetch failed" }],
  ])("RF-SESSAO-01 — %s não vira sessão encerrada", async (_caso, erro) => {
    await expect(caller(null, erro).protegido()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: MENSAGENS_AUTORIZACAO.indisponivel,
    });
  });

  it("RF-SESSAO-01 — sessão válida passa e injeta só o id do usuário", async () => {
    await expect(como(SEM_VINCULO).protegido()).resolves.toEqual({ usuarioId: SEM_VINCULO });
  });
});

describe("tenantProcedure", () => {
  it("CA-SESSAO-02 — sessão sem membership responde FORBIDDEN sem motivo", async () => {
    const recusa = como(SEM_VINCULO).doTenant({ filtro: "x" });

    await expect(recusa).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.semAcesso,
    });
    await expect(recusa).rejects.not.toHaveProperty("cause.motivo");
  });

  it("CA-SESSAO-08 — mais de um membership é recusado com MULTIPLOS_MEMBERSHIPS", async () => {
    const recusa = como(DOIS_VINCULOS).doTenant({ filtro: "x" });

    await expect(recusa).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(recusa).rejects.toHaveProperty("cause", expect.any(ErroComMotivo));
    await expect(recusa).rejects.toHaveProperty("cause.motivo", "MULTIPLOS_MEMBERSHIPS");
  });

  it("CA-SESSAO-08 — múltiplos memberships também são recusados em adminProcedure", async () => {
    await expect(como(DOIS_VINCULOS).administrativo()).rejects.toHaveProperty(
      "cause.motivo",
      "MULTIPLOS_MEMBERSHIPS",
    );
  });

  it("RF-SESSAO-04 — injeta tenant e papel do membership", async () => {
    await expect(como(COLABORADOR_A).doTenant({ filtro: "x" })).resolves.toEqual({
      tenantId: TENANT_A,
      papel: "colaborador",
      input: { filtro: "x" },
    });
  });

  it("CA-SESSAO-04 — um tenantId enviado no input é ignorado", async () => {
    const entrada = { filtro: "x", tenantId: TENANT_B } as { filtro: string };

    await expect(como(COLABORADOR_A).doTenant(entrada)).resolves.toEqual({
      tenantId: TENANT_A,
      papel: "colaborador",
      input: { filtro: "x" },
    });
  });

  it("RS-SESSAO-03 — claims editáveis pelo usuário não mudam tenant nem papel", async () => {
    const claims = {
      tenant_id: TENANT_B,
      tenantId: TENANT_B,
      role: "operacoes",
      papel: "operacoes",
    };
    const chamada = como(COLABORADOR_A, { user_metadata: claims, app_metadata: claims });

    await expect(chamada.doTenant({ filtro: "x" })).resolves.toMatchObject({
      tenantId: TENANT_A,
      papel: "colaborador",
    });
    await expect(chamada.administrativo()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("RS-SESSAO-01 — cada usuário recebe só o próprio tenant", async () => {
    await expect(como(COLABORADOR_A).doTenant({ filtro: "x" })).resolves.toMatchObject({
      tenantId: TENANT_A,
    });
    await expect(como(COLABORADOR_B).doTenant({ filtro: "x" })).resolves.toMatchObject({
      tenantId: TENANT_B,
    });
  });
});

describe("adminProcedure", () => {
  it("CA-SESSAO-03 — colaborador recebe FORBIDDEN", async () => {
    await expect(como(COLABORADOR_A).administrativo()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
    });
  });

  it("CA-SESSAO-03 — operacoes passa", async () => {
    await expect(como(OPERACOES_A).administrativo()).resolves.toEqual({
      tenantId: TENANT_A,
      papel: "operacoes",
    });
  });

  it("CA-SESSAO-02 — sessão sem membership recebe FORBIDDEN", async () => {
    await expect(como(SEM_VINCULO).administrativo()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.semAcesso,
    });
  });
});
