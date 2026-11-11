// @vitest-environment node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import {
  type CodigoIdentidade,
  type ConsultaIdentidade,
  criarConsultaSql,
  ErroIdentidadeRecusada,
  verificarIdentidade,
} from "./identidade";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const PASSADO = "2000-01-01T00:00:00Z";
const FUTURO = "2999-01-01T00:00:00Z";
const EMAIL_FICTICIO = "ficticio@exemplo.invalid";

type Identidade = {
  id?: string;
  confirmado?: string | null;
  banido?: string | null;
  excluido?: string | null;
};

let banco: BancoReal;

async function codigoDe(acao: Promise<unknown>): Promise<CodigoIdentidade> {
  const erro = await acao.then(
    () => {
      throw new Error("A verificação deveria ter recusado.");
    },
    (falha: unknown) => falha,
  );
  if (erro instanceof ErroIdentidadeRecusada) return erro.codigo;
  throw erro;
}

async function comBanco<T>(acao: (prisma: PrismaClient, cliente: Client) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao(prisma, cliente);
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

/** `auth.users` mínimo, só em banco isolado. O e-mail existe para provar que não é lido. */
async function criarAuthUsers(cliente: Client) {
  await cliente.query("CREATE SCHEMA auth");
  await cliente.query(
    `CREATE TABLE auth.users (
       id UUID PRIMARY KEY,
       email TEXT,
       email_confirmed_at TIMESTAMPTZ,
       banned_until TIMESTAMPTZ,
       deleted_at TIMESTAMPTZ
     )`,
  );
}

async function criarIdentidade(cliente: Client, dados: Identidade = {}) {
  const id = dados.id ?? randomUUID();
  await cliente.query(
    `INSERT INTO auth.users (id, email, email_confirmed_at, banned_until, deleted_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      EMAIL_FICTICIO,
      dados.confirmado === undefined ? PASSADO : dados.confirmado,
      dados.banido ?? null,
      dados.excluido ?? null,
    ],
  );
  return id;
}

async function comIdentidades<T>(acao: (prisma: PrismaClient, cliente: Client) => Promise<T>) {
  return comBanco(async (prisma, cliente) => {
    await criarAuthUsers(cliente);
    return acao(prisma, cliente);
  });
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("regras da verificação", () => {
  const ID = randomUUID();
  const portaCom = (situacao: Awaited<ReturnType<ConsultaIdentidade>>) =>
    vi.fn<ConsultaIdentidade>(async () => situacao);

  it.each([
    ["vazio", ""],
    ["texto", "nao-e-uuid"],
    ["curto", "00000000-0000-4000-8000"],
    ["com sufixo", `${ID}-extra`],
    ["com espaço", ` ${ID}`],
    ["com SQL", `${ID}'; DROP TABLE auth.users; --`],
  ])("CA-DADOS-C1 — recusa UUID malformado sem consultar: %s", async (_nome, valor) => {
    const porta = portaCom({ existe: true, confirmado: true, banido: false });

    expect(await codigoDe(verificarIdentidade(porta, valor))).toBe("UUID_INVALIDO");
    expect(porta).not.toHaveBeenCalled();
  });

  it("CA-DADOS-C1 — aceita identidade existente, confirmada e não banida", async () => {
    const porta = portaCom({ existe: true, confirmado: true, banido: false });

    await expect(verificarIdentidade(porta, ID)).resolves.toBeUndefined();
    expect(porta).toHaveBeenCalledExactlyOnceWith(ID);
  });

  it.each<[string, Awaited<ReturnType<ConsultaIdentidade>>, CodigoIdentidade]>([
    ["inexistente", { existe: false }, "IDENTIDADE_INEXISTENTE"],
    ["sem e-mail confirmado", { existe: true, confirmado: false, banido: false }, "EMAIL_NAO_CONFIRMADO"],
    ["banida", { existe: true, confirmado: true, banido: true }, "IDENTIDADE_BANIDA"],
  ])("CA-DADOS-C1 — recusa identidade %s", async (_nome, situacao, codigo) => {
    expect(await codigoDe(verificarIdentidade(portaCom(situacao), ID))).toBe(codigo);
  });

  it("CA-DADOS-C1 — falha da consulta recusa, sem repassar o erro original", async () => {
    const porta = vi.fn<ConsultaIdentidade>(async () => {
      throw new Error("detalhe interno da conexão");
    });

    const erro = await verificarIdentidade(porta, ID).catch((falha: Error) => falha);

    expect(erro).toBeInstanceOf(ErroIdentidadeRecusada);
    expect((erro as ErroIdentidadeRecusada).codigo).toBe("IDENTIDADE_INDETERMINADA");
    expect((erro as Error).message).not.toContain("detalhe interno");
  });

  it.each<[string, Awaited<ReturnType<ConsultaIdentidade>>]>([
    ["inexistente", { existe: false }],
    ["não confirmada", { existe: true, confirmado: false, banido: false }],
    ["banida", { existe: true, confirmado: true, banido: true }],
  ])("CA-DADOS-C1 — a mensagem não repete o UUID: %s", async (_nome, situacao) => {
    const erro = await verificarIdentidade(portaCom(situacao), ID).catch((falha: Error) => falha);

    expect((erro as Error).message).not.toContain(ID);
  });
});

describe("consulta real em auth.users", () => {
  it("CA-DADOS-C1 — aceita identidade válida", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente);

      await expect(verificarIdentidade(criarConsultaSql(prisma), id)).resolves.toBeUndefined();
    });
  });

  it("CA-DADOS-C1 — recusa identidade inexistente", async () => {
    await comIdentidades(async (prisma) => {
      expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), randomUUID()))).toBe(
        "IDENTIDADE_INEXISTENTE",
      );
    });
  });

  it("CA-DADOS-C1 — identidade excluída logicamente conta como inexistente", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente, { excluido: PASSADO });

      expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), id))).toBe(
        "IDENTIDADE_INEXISTENTE",
      );
    });
  });

  it("CA-DADOS-C1 — recusa e-mail não confirmado", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente, { confirmado: null });

      expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), id))).toBe(
        "EMAIL_NAO_CONFIRMADO",
      );
    });
  });

  it.each([
    ["com data futura", FUTURO],
    ["por tempo indeterminado", "infinity"],
  ])("CA-DADOS-C1 — recusa identidade banida %s", async (_nome, banido) => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente, { banido });

      expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), id))).toBe(
        "IDENTIDADE_BANIDA",
      );
    });
  });

  it("CA-DADOS-C1 — aceita banimento já vencido", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente, { banido: PASSADO });

      await expect(verificarIdentidade(criarConsultaSql(prisma), id)).resolves.toBeUndefined();
    });
  });

  it("CA-DADOS-C1 — distingue identidades diferentes", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const valida = await criarIdentidade(cliente);
      const banida = await criarIdentidade(cliente, { banido: FUTURO });
      const consulta = criarConsultaSql(prisma);

      await expect(verificarIdentidade(consulta, valida)).resolves.toBeUndefined();
      expect(await codigoDe(verificarIdentidade(consulta, banida))).toBe("IDENTIDADE_BANIDA");
    });
  });
});

describe("falha fechada", () => {
  it("CA-DADOS-C1 — sem o schema auth, a verificação fica indeterminada", async () => {
    await comBanco(async (prisma) => {
      expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), randomUUID()))).toBe(
        "IDENTIDADE_INDETERMINADA",
      );
    });
  });

  it.each(["email_confirmed_at", "banned_until", "deleted_at", "id"])(
    "CA-DADOS-C1 — sem a coluna %s, a verificação fica indeterminada",
    async (coluna) => {
      await comIdentidades(async (prisma, cliente) => {
        const id = await criarIdentidade(cliente);
        await cliente.query(`ALTER TABLE auth.users DROP COLUMN ${coluna}`);

        expect(await codigoDe(verificarIdentidade(criarConsultaSql(prisma), id))).toBe(
          "IDENTIDADE_INDETERMINADA",
        );
      });
    },
  );

  it("CA-DADOS-C1 — sem permissão de leitura, a verificação fica indeterminada", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente);

      const codigo = await prisma.$transaction(async (transacao) => {
        await transacao.$executeRaw`SET LOCAL ROLE anon`;
        return codigoDe(verificarIdentidade(criarConsultaSql(transacao), id));
      });

      expect(codigo).toBe("IDENTIDADE_INDETERMINADA");
    });
  });
});

describe("somente leitura", () => {
  it("CA-DADOS-19 — a verificação funciona em transação somente leitura", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente);

      await prisma.$transaction(async (transacao) => {
        await transacao.$executeRaw`SET TRANSACTION READ ONLY`;
        await expect(
          verificarIdentidade(criarConsultaSql(transacao), id),
        ).resolves.toBeUndefined();
      });
    });
  });

  it("CA-DADOS-19 — a verificação não altera auth.users nem cria vínculo", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente);
      const retrato = () => cliente.query("SELECT u::text FROM auth.users u");
      const antes = await retrato();

      await verificarIdentidade(criarConsultaSql(prisma), id);

      expect((await retrato()).rows).toEqual(antes.rows);
      const { rows } = await cliente.query<{ total: number }>(
        "SELECT count(*)::int AS total FROM memberships",
      );
      expect(rows).toEqual([{ total: 0 }]);
    });
  });

  it("CA-DADOS-C1 — a consulta devolve só o necessário, sem e-mail", async () => {
    await comIdentidades(async (prisma, cliente) => {
      const id = await criarIdentidade(cliente);

      const situacao = await criarConsultaSql(prisma)(id);

      expect(situacao).toEqual({ existe: true, confirmado: true, banido: false });
      expect(JSON.stringify(situacao)).not.toContain(EMAIL_FICTICIO);
    });
  });

  const arquivo = fileURLToPath(new URL("./identidade.ts", import.meta.url));

  it("CA-DADOS-C1 — o código não seleciona e-mail nem coluna de credencial", () => {
    const fonte = readFileSync(arquivo, "utf8");

    expect(fonte).not.toMatch(/\bemail\b|encrypted_password|raw_user_meta|phone/);
  });

  it("CA-DADOS-19 — o código não escreve nem chama cadastro de usuário", () => {
    const fonte = readFileSync(arquivo, "utf8");

    expect(fonte).not.toMatch(/\b(INSERT|UPDATE|DELETE|\$executeRaw)\b|createUser|inviteUser|signUp/);
  });

  it("CA-DADOS-C1 — o módulo roda com node, sem transpilador", () => {
    const { status } = spawnSync(process.execPath, [arquivo], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      timeout: 15_000,
    });

    expect(status).toBe(0);
  });
});
