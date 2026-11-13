// @vitest-environment node
//
// Spec 009 (T-SEG-10): limite das cinco mutações com Postgres real (Testcontainers) e relógio fixo.
// `mutacao_usuario` (30/60 s) e `mutacao_ip` (120/60 s) são consumidos juntos, depois da sessão, do
// papel e da validação de entrada. Recusa por regra de negócio também conta (RN-SEG-06). As
// tentativas usam ids inexistentes, recusados pela regra, e cadastros válidos.
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { routerAplicacao } from "@/server/api/raiz";
import type { ContextoTRPC } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  IP_INDISPONIVEL,
  identificador,
  type EscopoLimite,
} from "@/server/services/identificadores-limite";
import { criarLimitador } from "@/server/services/limites";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

// 12:07:30 UTC: janela de 60 s em 12:07:00–12:08:00.
const AGORA = new Date("2026-11-12T12:07:30Z");
const TENANT = "00000000-0000-4000-8000-00000000000a";
const COLABORADOR = "00000000-0000-4000-8000-000000000001";
const OPERACOES = "00000000-0000-4000-8000-000000000002";
const OUTRO_COLABORADOR = "00000000-0000-4000-8000-000000000003";
const IP = "203.0.113.7";

type Contexto = { prisma: PrismaClient; cliente: Client };
type Caller = ReturnType<typeof routerAplicacao.createCaller>;

let banco: BancoReal;

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function comBanco<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  // Pool maior que as rajadas (12) e aberto antes delas: o que se prova é o limite, não a abertura
  // de conexões, que numa máquina carregada passa do `maxWait` do Prisma e falha fechada.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 20 }) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'suporte_ti')", [TENANT]);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $4, 'operacoes'), ($3, $4, 'colaborador')`,
      [COLABORADOR, OPERACOES, OUTRO_COLABORADOR, TENANT],
    );
    await Promise.all(
      Array.from({ length: 12 }, () => prisma.$queryRaw`SELECT 1 AS ok FROM pg_sleep(0.05)`),
    );
    return await acao({ prisma, cliente });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

function como(prisma: PrismaClient, usuarioId: string | null, ip: string | null = IP): Caller {
  const supabase = {
    auth: {
      getUser: async () =>
        usuarioId
          ? { data: { user: { id: usuarioId } }, error: null }
          : { data: { user: null }, error: { status: 401, message: "sem sessão" } },
      signOut: async () => ({ error: null }),
    },
  } as unknown as ClienteSupabaseAutenticacao;
  const contexto: ContextoTRPC = {
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
    obterLimitador: () => criarLimitador(() => prisma, () => AGORA),
    ipConfiavel: ip,
  };
  return routerAplicacao.createCaller(contexto);
}

let patrimonio = 0;
const proximoPatrimonio = () => `TI-${String((patrimonio += 1) % 10_000).padStart(4, "0")}`;

/** As cinco mutações cobertas, cada uma com uma entrada válida. */
const MUTACOES: Record<string, (caller: Caller) => Promise<unknown>> = {
  solicitar: (c) => c.emprestimos.solicitar({ equipamentoId: randomUUID() }),
  devolver: (c) => c.emprestimos.devolver({ emprestimoId: randomUUID() }),
  registrarDevolucao: (c) => c.operacoes.registrarDevolucao({ emprestimoId: randomUUID() }),
  cadastrar: (c) =>
    c.equipamentos.cadastrar({
      nome: "Monitor LG 27",
      categoria: "monitor",
      patrimonio: proximoPatrimonio(),
      situacao: "ativo",
    }),
  alterarSituacao: (c) =>
    c.equipamentos.alterarSituacao({ equipamentoId: randomUUID(), situacao: "em_manutencao" }),
};

/** Código do erro, ou `OK`. Recusa por regra de negócio (NOT_FOUND etc.) é uma tentativa contada. */
async function codigo(promessa: Promise<unknown>) {
  try {
    await promessa;
    return "OK";
  } catch (erro) {
    return (erro as { code?: string }).code ?? "SEM_CODIGO";
  }
}

const idUsuario = (usuarioId: string) =>
  identificador("mutacao_usuario", `${TENANT}:${usuarioId}`);
const idIp = (ip: string) => identificador("mutacao_ip", ip);

async function contador(cliente: Client, escopo: EscopoLimite, id: string) {
  const { rows } = await cliente.query<{ total: number }>(
    `SELECT coalesce(sum(contador), 0)::int AS total FROM limites_requisicao
      WHERE escopo = $1 AND identificador = $2`,
    [escopo, id],
  );
  return rows[0]?.total;
}

async function preencher(cliente: Client, escopo: EscopoLimite, id: string, quantidade: number) {
  await cliente.query(
    `INSERT INTO limites_requisicao VALUES ($1, $2, '2026-11-12T12:07:00Z', '2026-11-12T12:08:00Z', $3)`,
    [escopo, id, quantidade],
  );
}

async function totalEquipamentos(cliente: Client) {
  const { rows } = await cliente.query<{ total: number }>("SELECT count(*)::int AS total FROM equipamentos");
  return rows[0]?.total;
}

describe("limite por usuário", () => {
  it(
    "CA-SEG-10 — operacoes: somadas as cinco mutações, a 31ª em 60 s responde 429",
    async () => {
      await comBanco(async ({ prisma, cliente }) => {
        const caller = como(prisma, OPERACOES);
        const codigos: string[] = [];
        for (let rodada = 0; rodada < 6; rodada += 1) {
          for (const mutacao of Object.values(MUTACOES)) codigos.push(await codigo(mutacao(caller)));
        }

        expect(codigos).toHaveLength(30);
        expect(codigos).not.toContain("TOO_MANY_REQUESTS");
        expect(codigos).not.toContain("SERVICE_UNAVAILABLE");
        for (const mutacao of Object.values(MUTACOES)) {
          await expect(mutacao(caller)).rejects.toMatchObject({
            code: "TOO_MANY_REQUESTS",
            message: MENSAGENS_LIMITE.excedido,
          });
        }
        // Recusa por limite não consome vaga (RN-SEG-07).
        expect(await contador(cliente, "mutacao_usuario", idUsuario(OPERACOES))).toBe(30);
        expect(await contador(cliente, "mutacao_ip", idIp(IP))).toBe(30);
        expect(await totalEquipamentos(cliente)).toBe(6);
      });
    },
    120_000,
  );

  it(
    "CA-SEG-10 — colaborador: o mesmo limite de 30, e recusa por regra também conta",
    async () => {
      await comBanco(async ({ prisma, cliente }) => {
        const caller = como(prisma, COLABORADOR);
        const codigos: string[] = [];
        for (let i = 0; i < 15; i += 1) {
          codigos.push(await codigo(MUTACOES.solicitar!(caller)));
          codigos.push(await codigo(MUTACOES.devolver!(caller)));
        }

        expect(codigos).not.toContain("OK");
        expect(codigos).not.toContain("TOO_MANY_REQUESTS");
        await expect(MUTACOES.devolver!(caller)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
        expect(await contador(cliente, "mutacao_usuario", idUsuario(COLABORADOR))).toBe(30);
      });
    },
    120_000,
  );

  it("CA-SEG-10 — o limite de uma pessoa não bloqueia outra", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_usuario", idUsuario(COLABORADOR), 30);

      await expect(MUTACOES.devolver!(como(prisma, COLABORADOR))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      await expect(MUTACOES.devolver!(como(prisma, OUTRO_COLABORADOR))).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});

describe("limite por IP", () => {
  it("CA-SEG-10 — a 121ª do mesmo IP, entre usuários diferentes, responde 429", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_ip", idIp(IP), 119);

      expect(await codigo(MUTACOES.devolver!(como(prisma, COLABORADOR)))).not.toBe("TOO_MANY_REQUESTS");
      await expect(MUTACOES.cadastrar!(como(prisma, OPERACOES))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      expect(await contador(cliente, "mutacao_ip", idIp(IP))).toBe(120);
      expect(await contador(cliente, "mutacao_usuario", idUsuario(OPERACOES))).toBe(0);
      expect(await totalEquipamentos(cliente)).toBe(0);
    });
  });

  it("CA-SEG-16 — pessoas sem IP confiável dividem o mesmo limite por IP", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_ip", idIp(IP_INDISPONIVEL), 120);

      await expect(MUTACOES.devolver!(como(prisma, COLABORADOR, null))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      await expect(MUTACOES.devolver!(como(prisma, OUTRO_COLABORADOR, null))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      await expect(MUTACOES.devolver!(como(prisma, OUTRO_COLABORADOR, IP))).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});

describe("concorrência e reserva conjunta", () => {
  it("CA-SEG-10 — tentativas simultâneas não ultrapassam o limite", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_usuario", idUsuario(OPERACOES), 25);
      const caller = como(prisma, OPERACOES);

      const codigos = await Promise.all(
        Array.from({ length: 12 }, () => codigo(MUTACOES.registrarDevolucao!(caller))),
      );

      expect(codigos.filter((c) => c === "TOO_MANY_REQUESTS")).toHaveLength(7);
      expect(codigos.filter((c) => c === "NOT_FOUND")).toHaveLength(5);
      expect(await contador(cliente, "mutacao_usuario", idUsuario(OPERACOES))).toBe(30);
      expect(await contador(cliente, "mutacao_ip", idIp(IP))).toBe(5);
    });
  });

  it("RN-SEG-06 — IP no limite não consome a vaga do usuário", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_ip", idIp(IP), 120);

      await expect(MUTACOES.devolver!(como(prisma, COLABORADOR))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      expect(await contador(cliente, "mutacao_usuario", idUsuario(COLABORADOR))).toBe(0);
    });
  });

  it("RN-SEG-06 — usuário no limite não consome a vaga do IP", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_usuario", idUsuario(COLABORADOR), 30);

      await expect(MUTACOES.devolver!(como(prisma, COLABORADOR))).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      expect(await contador(cliente, "mutacao_ip", idIp(IP))).toBe(0);
    });
  });
});

describe("ordem: sessão, papel e entrada antes do limite", () => {
  it("CA-SEG-11 — recusa por autorização continua FORBIDDEN e não consome vaga", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const caller = como(prisma, COLABORADOR);

      for (const nome of ["cadastrar", "alterarSituacao", "registrarDevolucao"]) {
        await expect(MUTACOES[nome]!(caller)).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(await contador(cliente, "mutacao_usuario", idUsuario(COLABORADOR))).toBe(0);
      expect(await contador(cliente, "mutacao_ip", idIp(IP))).toBe(0);
    });
  });

  it("RN-SEG-06 — sem sessão ou com entrada inválida, nada é consumido", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await expect(MUTACOES.devolver!(como(prisma, null))).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      await expect(
        como(prisma, COLABORADOR).emprestimos.devolver({ emprestimoId: "nao-e-uuid" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const { rows } = await cliente.query("SELECT 1 FROM limites_requisicao");
      expect(rows).toEqual([]);
    });
  });
});

describe("leituras e falha fechada", () => {
  it("CA-SEG-11 — com os dois limites cheios, consultas e `sair` continuam respondendo", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await preencher(cliente, "mutacao_usuario", idUsuario(OPERACOES), 30);
      await preencher(cliente, "mutacao_ip", idIp(IP), 120);
      const caller = como(prisma, OPERACOES);

      await expect(caller.equipamentos.listar({})).resolves.toBeDefined();
      await expect(caller.emprestimos.meus()).resolves.toBeDefined();
      await expect(caller.emprestimos.meuResumo()).resolves.toBeDefined();
      await expect(caller.operacoes.resumo()).resolves.toBeDefined();
      await expect(caller.operacoes.ultimosCadastros()).resolves.toBeDefined();
      await expect(caller.autenticacao.sair()).resolves.toEqual({ autenticado: false });
    });
  });

  it("CA-SEG-12 — contador indisponível: 503 sem gravar, e as consultas continuam respondendo", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await cliente.query("DROP TABLE limites_requisicao");
      const caller = como(prisma, OPERACOES);

      for (const mutacao of Object.values(MUTACOES)) {
        await expect(mutacao(caller)).rejects.toMatchObject({
          code: "SERVICE_UNAVAILABLE",
          message: MENSAGENS_LIMITE.indisponivel,
        });
      }
      expect(await totalEquipamentos(cliente)).toBe(0);
      const { rows } = await cliente.query("SELECT 1 FROM auditoria");
      expect(rows).toEqual([]);
      await expect(caller.equipamentos.listar({})).resolves.toBeDefined();
    });
  });

  it("CA-SEG-12 — sem CHAVE_HMAC_LIMITES: 503 sem gravar", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      vi.stubEnv("CHAVE_HMAC_LIMITES", "");

      await expect(MUTACOES.cadastrar!(como(prisma, OPERACOES))).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: MENSAGENS_LIMITE.indisponivel,
      });
      expect(await totalEquipamentos(cliente)).toBe(0);
      const { rows } = await cliente.query("SELECT 1 FROM limites_requisicao");
      expect(rows).toEqual([]);
    });
  });
});
