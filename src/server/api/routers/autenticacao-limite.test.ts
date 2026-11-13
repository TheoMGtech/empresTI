// @vitest-environment node
//
// Spec 009 (T-SEG-09): limite do login com Postgres real (Testcontainers), relógio fixo e Supabase
// Auth simulado na fronteira. Ajuste obrigatório 1: `login_ip` e `login_email` reservados numa única
// transação; se um bloquear, nenhum é consumido; depois, o IP fica consumido e a vaga do e-mail volta
// no sucesso e na falha que não é de credencial.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Client } from "pg";
import superjson from "superjson";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { routerAplicacao } from "@/server/api/raiz";
import { metaRespostaLimite, type ContextoTRPC } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  IP_INDISPONIVEL,
  identificador,
  normalizarEmail,
  type EscopoLimite,
} from "@/server/services/identificadores-limite";
import { criarLimitador } from "@/server/services/limites";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

// 12:07:30 UTC: janela de 15 min em 12:00–12:15, com 450 s restantes.
const AGORA = new Date("2026-11-12T12:07:30Z");
const SENHA = "senha-de-teste-correta";
const ERRADA = "senha-de-teste-incorreta";
const EMAIL = "pessoa@empresa.com";
const IP = "203.0.113.7";

type Contexto = { prisma: PrismaClient; cliente: Client };
type ErroSupabase = { code?: string; status: number; message: string };

let banco: BancoReal;

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

afterEach(() => {
  vi.restoreAllMocks();
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
    await Promise.all(
      Array.from({ length: 12 }, () => prisma.$queryRaw`SELECT 1 AS ok FROM pg_sleep(0.05)`),
    );
    return await acao({ prisma, cliente });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

/** Supabase Auth simulado: `SENHA` entra; outra senha é falha de credencial; `falha` simula outro erro. */
function supabase(falha: ErroSupabase | null = null) {
  const signInWithPassword = vi.fn(async ({ password }: { email: string; password: string }) => {
    if (falha) return { data: { user: null, session: null }, error: falha };
    if (password !== SENHA) {
      return {
        data: { user: null, session: null },
        error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
      };
    }
    return { data: { user: { id: "usuario-1" }, session: null }, error: null };
  });
  const cliente = {
    auth: { signInWithPassword, getUser: vi.fn(), signOut: vi.fn() },
  } as unknown as ClienteSupabaseAutenticacao;
  return { cliente, signInWithPassword };
}

function contexto(
  prisma: PrismaClient,
  cliente: ClienteSupabaseAutenticacao,
  ip: string | null,
): ContextoTRPC {
  return {
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => cliente,
    obterLimitador: () => criarLimitador(() => prisma, () => AGORA),
    ipConfiavel: ip,
  };
}

function entrar(
  prisma: PrismaClient,
  cliente: ClienteSupabaseAutenticacao,
  dados: { email?: string; senha?: string; ip?: string | null } = {},
) {
  return routerAplicacao
    .createCaller(contexto(prisma, cliente, dados.ip === undefined ? IP : dados.ip))
    .autenticacao.entrar({ email: dados.email ?? EMAIL, senha: dados.senha ?? SENHA });
}

const idEmail = (email: string) => identificador("login_email", normalizarEmail(email));
const idIp = (ip: string) => identificador("login_ip", ip);

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
    `INSERT INTO limites_requisicao VALUES ($1, $2, '2026-11-12T12:00:00Z', '2026-11-12T12:15:00Z', $3)`,
    [escopo, id, quantidade],
  );
}

async function codigos(promessas: Promise<unknown>[]) {
  const todos = await Promise.allSettled(promessas);
  return todos.map((r) =>
    r.status === "fulfilled" ? "OK" : (r.reason as { code?: string }).code ?? "SEM_CODIGO",
  );
}

const contar = (lista: string[], valor: string) => lista.filter((item) => item === valor).length;

describe("limite por IP", () => {
  it(
    "CA-SEG-07 — a 101ª tentativa do mesmo IP em 15 minutos responde 429 sem chamar o Supabase Auth",
    async () => {
      await comBanco(async ({ prisma, cliente }) => {
        const { cliente: auth, signInWithPassword } = supabase();

        for (let i = 0; i < 100; i += 1) {
          await entrar(prisma, auth, { email: `pessoa${i}@empresa.com` });
        }
        await expect(entrar(prisma, auth, { email: "outra@empresa.com" })).rejects.toMatchObject({
          code: "TOO_MANY_REQUESTS",
          message: MENSAGENS_LIMITE.excedido,
        });

        expect(signInWithPassword).toHaveBeenCalledTimes(100);
        expect(await contador(cliente, "login_ip", idIp(IP))).toBe(100);
      });
    },
    120_000,
  );

  it("CA-SEG-07 — pela rota: 429, Retry-After em segundos e corpo sem detalhe", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      await preencher(cliente, "login_ip", idIp(IP), 100);

      const resposta = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: new Request("http://localhost/api/trpc/autenticacao.entrar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(superjson.serialize({ email: EMAIL, senha: SENHA })),
        }),
        router: routerAplicacao,
        createContext: () => contexto(prisma, auth, IP),
        responseMeta: metaRespostaLimite,
      });
      const corpo = await resposta.text();

      expect(resposta.status).toBe(429);
      expect(resposta.headers.get("Retry-After")).toBe("450");
      expect(corpo).toContain(MENSAGENS_LIMITE.excedido);
      expect(corpo).not.toContain(EMAIL);
      expect(corpo).not.toContain(IP);
      expect(corpo).not.toContain("stack");
      expect(signInWithPassword).not.toHaveBeenCalled();
    });
  });

  it("RN-SEG-03 — entrada inválida não conta", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth } = supabase();

      await expect(entrar(prisma, auth, { email: "sem-arroba", senha: "" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(0);
    });
  });

  it.each([" pessoa@empresa.com", "pessoa@empresa.com ", "  Pessoa@Empresa.com  "])(
    "CA-SEG-08 — e-mail com espaços nas pontas (%j) é recusado na validação, antes do limite e sem consumir vaga",
    async (email) => {
      await comBanco(async ({ prisma, cliente }) => {
        const { cliente: auth, signInWithPassword } = supabase();

        await expect(entrar(prisma, auth, { email, senha: SENHA })).rejects.toMatchObject({
          code: "BAD_REQUEST",
        });

        expect(signInWithPassword).not.toHaveBeenCalled();
        const { rows } = await cliente.query("SELECT 1 FROM limites_requisicao");
        expect(rows).toEqual([]);
      });
    },
  );
});

describe("limite por e-mail", () => {
  it("CA-SEG-08 — depois de 5 falhas de credencial, a 6ª responde 429 mesmo com a senha certa", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      const variacoes = [EMAIL, "Pessoa@Empresa.com", "PESSOA@EMPRESA.COM", "pessoa@EMPRESA.com", "PeSsOa@empresa.com"];

      for (const email of variacoes) {
        await expect(entrar(prisma, auth, { email, senha: ERRADA })).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
      }
      await expect(entrar(prisma, auth, { email: "Pessoa@empresa.COM" })).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: MENSAGENS_LIMITE.excedido,
      });

      expect(signInWithPassword).toHaveBeenCalledTimes(5);
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(5);
    });
  });

  it("CA-SEG-08/RN-SEG-08 — a resposta do bloqueio é igual para e-mail cadastrado ou não", async () => {
    await comBanco(async ({ prisma }) => {
      // O Supabase responde `invalid_credentials` para os dois; só o primeiro tem senha certa.
      const { cliente: auth } = supabase();
      const bloqueio = async (email: string, senha: string) => {
        for (let i = 0; i < 5; i += 1) {
          await entrar(prisma, auth, { email, senha: ERRADA, ip: null }).catch(() => undefined);
        }
        const erro = (await entrar(prisma, auth, { email, senha, ip: null }).catch((e: unknown) => e)) as {
          code: string;
          message: string;
        };
        return { code: erro.code, message: erro.message };
      };

      const cadastrado = await bloqueio("cadastrado@empresa.com", SENHA);
      const inexistente = await bloqueio("inexistente@empresa.com", ERRADA);

      expect(cadastrado).toEqual({ code: "TOO_MANY_REQUESTS", message: MENSAGENS_LIMITE.excedido });
      expect(inexistente).toEqual(cadastrado);
    });
  });

  it("CA-SEG-08 — login bem-sucedido não consome a vaga do e-mail; o IP conta", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();

      for (let i = 0; i < 8; i += 1) await entrar(prisma, auth);

      expect(signInWithPassword).toHaveBeenCalledTimes(8);
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(0);
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(8);
    });
  });

  it("CA-SEG-08 — falha que não é de credencial não consome a vaga do e-mail; o IP conta", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase({ status: 503, message: "detalhe interno" });

      for (let i = 0; i < 8; i += 1) {
        await expect(entrar(prisma, auth)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
      }

      expect(signInWithPassword).toHaveBeenCalledTimes(8);
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(0);
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(8);
    });
  });
});

describe("concorrência", () => {
  it("CA-SEG-09 — tentativas simultâneas: no máximo 5 do mesmo e-mail chegam ao Supabase Auth", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();

      const resultado = await codigos(
        Array.from({ length: 12 }, () => entrar(prisma, auth, { senha: ERRADA })),
      );

      expect(contar(resultado, "UNAUTHORIZED")).toBe(5);
      expect(contar(resultado, "TOO_MANY_REQUESTS")).toBe(7);
      expect(signInWithPassword).toHaveBeenCalledTimes(5);
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(5);
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(5);
    });
  });

  it("CA-SEG-09 — tentativas simultâneas: no máximo 100 do mesmo IP chegam ao Supabase Auth", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      await preencher(cliente, "login_ip", idIp(IP), 95);

      const resultado = await codigos(
        Array.from({ length: 12 }, (_, i) => entrar(prisma, auth, { email: `pessoa${i}@empresa.com` })),
      );

      expect(contar(resultado, "OK")).toBe(5);
      expect(contar(resultado, "TOO_MANY_REQUESTS")).toBe(7);
      expect(signInWithPassword).toHaveBeenCalledTimes(5);
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(100);
    });
  });
});

describe("reserva atômica (ajuste obrigatório 1)", () => {
  it("IP no limite não consome a vaga do e-mail", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      await preencher(cliente, "login_ip", idIp(IP), 100);

      await expect(entrar(prisma, auth, { senha: ERRADA })).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      expect(signInWithPassword).not.toHaveBeenCalled();
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(0);
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(100);
    });
  });

  it("e-mail no limite não consome a vaga do IP", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      await preencher(cliente, "login_email", idEmail(EMAIL), 5);

      await expect(entrar(prisma, auth)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

      expect(signInWithPassword).not.toHaveBeenCalled();
      expect(await contador(cliente, "login_ip", idIp(IP))).toBe(0);
      expect(await contador(cliente, "login_email", idEmail(EMAIL))).toBe(5);
    });
  });
});

describe("falha fechada", () => {
  it("CA-SEG-12 — contador indisponível: 503 sem chamar o Supabase Auth", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      await cliente.query("DROP TABLE limites_requisicao");

      await expect(entrar(prisma, auth)).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: MENSAGENS_LIMITE.indisponivel,
      });
      expect(signInWithPassword).not.toHaveBeenCalled();
    });
  });

  it("CA-SEG-12 — sem CHAVE_HMAC_LIMITES: 503 sem chamar o Supabase Auth e sem gravar", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth, signInWithPassword } = supabase();
      vi.stubEnv("CHAVE_HMAC_LIMITES", "");

      await expect(entrar(prisma, auth)).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: MENSAGENS_LIMITE.indisponivel,
      });
      expect(signInWithPassword).not.toHaveBeenCalled();
      const { rows } = await cliente.query("SELECT 1 FROM limites_requisicao");
      expect(rows).toEqual([]);
    });
  });
});

describe("IP confiável e privacidade", () => {
  it("CA-SEG-16 — pessoas diferentes sem IP confiável dividem o mesmo limite por IP", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const { cliente: auth } = supabase();
      await preencher(cliente, "login_ip", idIp(IP_INDISPONIVEL), 99);

      await expect(entrar(prisma, auth, { email: "a@empresa.com", ip: null })).resolves.toEqual({
        autenticado: true,
      });
      await expect(entrar(prisma, auth, { email: "b@empresa.com", ip: null })).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      // Quem tem IP confiável não divide esse limite.
      await expect(entrar(prisma, auth, { email: "c@empresa.com" })).resolves.toEqual({
        autenticado: true,
      });
    });
  });

  it("CA-SEG-13 — a tabela guarda só HMAC em hex, e nada do fluxo vai para log", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      const espioes = (["log", "info", "warn", "error", "debug"] as const).map((nivel) =>
        vi.spyOn(console, nivel).mockImplementation(() => undefined),
      );
      const { cliente: auth } = supabase();

      await entrar(prisma, auth, { senha: ERRADA }).catch(() => undefined);
      await entrar(prisma, auth);
      await preencher(cliente, "login_email", idEmail("bloqueado@empresa.com"), 5);
      await entrar(prisma, auth, { email: "bloqueado@empresa.com" }).catch(() => undefined);

      const { rows } = await cliente.query<{ identificador: string }>(
        "SELECT identificador FROM limites_requisicao",
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const { identificador: id } of rows) expect(id).toMatch(/^[0-9a-f]{64}$/);
      for (const espiao of espioes) expect(espiao).not.toHaveBeenCalled();
    });
  });
});
