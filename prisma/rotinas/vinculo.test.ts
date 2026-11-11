// @vitest-environment node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "./carga";
import { ErroIdentidadeRecusada } from "./identidade";
import { ErroVinculo, vincularProfessor, vincularUsuario, type DadosVinculo } from "./vinculo";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;
const TEMPO_DO_COMANDO_MS = 120_000;

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ROTINA = fileURLToPath(new URL("../vincular-professor.ts", import.meta.url));

const PASSADO = "2000-01-01T00:00:00Z";
const FUTURO = "2999-01-01T00:00:00Z";
const OUTRO_TENANT = "00000000-0000-4000-8000-00000000000b";

let banco: BancoReal;

type Contexto = { prisma: PrismaClient; cliente: Client; url: string };

async function comBanco<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao({ prisma, cliente, url });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

/** Banco com o tenant inicial e um `auth.users` mínimo, só no ambiente isolado. */
function comAmbiente<T>(acao: (contexto: Contexto) => Promise<T>) {
  return comBanco(async (contexto) => {
    await contexto.cliente.query("INSERT INTO tenants (slug) VALUES ('suporte_ti')");
    await criarAuthUsers(contexto.cliente);
    return acao(contexto);
  });
}

async function criarAuthUsers(cliente: Client) {
  await cliente.query("CREATE SCHEMA auth");
  await cliente.query(
    `CREATE TABLE auth.users (
       id UUID PRIMARY KEY,
       email_confirmed_at TIMESTAMPTZ,
       banned_until TIMESTAMPTZ,
       deleted_at TIMESTAMPTZ
     )`,
  );
}

async function criarIdentidade(
  cliente: Client,
  dados: { confirmado?: string | null; banido?: string; excluido?: string } = {},
) {
  const id = randomUUID();
  await cliente.query(
    "INSERT INTO auth.users (id, email_confirmed_at, banned_until, deleted_at) VALUES ($1, $2, $3, $4)",
    [id, dados.confirmado === undefined ? PASSADO : dados.confirmado, dados.banido, dados.excluido],
  );
  return id;
}

async function retrato(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ linha: string }>(
    `SELECT t::text AS linha FROM ${tabela} t ORDER BY 1`,
  );
  return rows.map((item) => item.linha);
}

async function inserirMembership(
  cliente: Client,
  userId: string,
  role: string,
  slug = "suporte_ti",
) {
  await cliente.query(
    `INSERT INTO memberships (user_id, tenant_id, role)
     SELECT $1, id, $2::papel_membership FROM tenants WHERE slug = $3`,
    [userId, role, slug],
  );
}

function rodar(argumentos: string[], env: Record<string, string>) {
  return spawnSync(process.execPath, [ROTINA, ...argumentos], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { PATH: process.env.PATH, NODE_ENV: "test", ...env },
    timeout: TEMPO_DO_COMANDO_MS - 10_000,
  });
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("vínculo válido", () => {
  it("CA-DADOS-C1 — cria o membership colaborador em suporte_ti", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await criarIdentidade(cliente);

      expect(await vincularProfessor(prisma, id)).toBe("criado");

      const { rows } = await cliente.query(
        `SELECT m.user_id, m.role, t.slug FROM memberships m
           JOIN tenants t ON t.id = m.tenant_id`,
      );
      expect(rows).toEqual([{ user_id: id, role: "colaborador", slug: "suporte_ti" }]);
    });
  });

  it("CA-DADOS-C1 — repetir não muda nada", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await criarIdentidade(cliente);
      await vincularProfessor(prisma, id);
      const antes = await retrato(cliente, "memberships");

      expect(await vincularProfessor(prisma, id)).toBe("ja_existente");
      expect(await vincularProfessor(prisma, id)).toBe("ja_existente");

      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it("CA-DADOS-C1 — identidades diferentes têm vínculos separados", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await vincularProfessor(prisma, await criarIdentidade(cliente));
      await vincularProfessor(prisma, await criarIdentidade(cliente));

      expect(await retrato(cliente, "memberships")).toHaveLength(2);
    });
  });
});

describe("vínculo recusado sem gravar", () => {
  it.each<[string, (cliente: Client) => Promise<string>, string]>([
    ["UUID malformado", async () => "nao-e-uuid", "UUID_INVALIDO"],
    ["identidade inexistente", async () => randomUUID(), "IDENTIDADE_INEXISTENTE"],
    [
      "identidade excluída",
      (cliente) => criarIdentidade(cliente, { excluido: PASSADO }),
      "IDENTIDADE_INEXISTENTE",
    ],
    [
      "e-mail não confirmado",
      (cliente) => criarIdentidade(cliente, { confirmado: null }),
      "EMAIL_NAO_CONFIRMADO",
    ],
    [
      "usuário banido",
      (cliente) => criarIdentidade(cliente, { banido: FUTURO }),
      "IDENTIDADE_BANIDA",
    ],
  ])("CA-DADOS-C1 — recusa %s", async (_nome, preparar, codigo) => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await preparar(cliente);
      const usuariosAntes = await retrato(cliente, "auth.users");

      const erro = await vincularProfessor(prisma, id).catch((falha: unknown) => falha);

      expect(erro).toBeInstanceOf(ErroIdentidadeRecusada);
      expect(erro).toMatchObject({ codigo });
      expect(await retrato(cliente, "memberships")).toEqual([]);
      expect(await retrato(cliente, "auth.users")).toEqual(usuariosAntes);
    });
  });

  it("CA-DADOS-C1 — sem auth.users, a verificação fica indeterminada e nada é gravado", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await cliente.query("INSERT INTO tenants (slug) VALUES ('suporte_ti')");

      await expect(vincularProfessor(prisma, randomUUID())).rejects.toMatchObject({
        codigo: "IDENTIDADE_INDETERMINADA",
      });
      expect(await retrato(cliente, "memberships")).toEqual([]);
    });
  });

  it("CA-DADOS-C1 — papel diferente aborta sem alterar", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await criarIdentidade(cliente);
      await inserirMembership(cliente, id, "operacoes");
      const antes = await retrato(cliente, "memberships");

      const erro = await vincularProfessor(prisma, id).catch((falha: unknown) => falha);

      expect(erro).toBeInstanceOf(ErroVinculo);
      expect(erro).toMatchObject({ codigo: "PAPEL_DIVERGENTE" });
      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it("CA-DADOS-C1 — vínculo em outro tenant aborta, mantendo um único membership", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'outro_tenant')", [
        OUTRO_TENANT,
      ]);
      const id = await criarIdentidade(cliente);
      await inserirMembership(cliente, id, "colaborador", "outro_tenant");
      const antes = await retrato(cliente, "memberships");

      await expect(vincularProfessor(prisma, id)).rejects.toMatchObject({
        codigo: "VINCULO_EM_OUTRO_TENANT",
      });
      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it("CA-DADOS-C1 — sem o tenant inicial, nada é gravado", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await criarAuthUsers(cliente);
      const id = await criarIdentidade(cliente);

      await expect(vincularProfessor(prisma, id)).rejects.toMatchObject({
        codigo: "TENANT_INEXISTENTE",
      });
      expect(await retrato(cliente, "memberships")).toEqual([]);
    });
  });

  it("CA-DADOS-C1 — falha depois da escrita desfaz o vínculo", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await criarIdentidade(cliente);
      const falha = new Error("falha simulada depois da escrita");
      const clienteComFalha = {
        $transaction: ((acao: (transacao: never) => Promise<unknown>) =>
          prisma.$transaction(async (transacao) => {
            await acao(transacao as never);
            throw falha;
          })) as unknown as PrismaClient["$transaction"],
      };

      await expect(vincularProfessor(clienteComFalha, id)).rejects.toBe(falha);

      expect(await retrato(cliente, "memberships")).toEqual([]);
    });
  });
});

describe("o que o vínculo não faz", () => {
  // A tabela de empréstimos passa a existir na Spec 005 (T-SOLIC-01): a prova vale para o que o
  // vínculo grava, não para a estrutura.
  it("CA-DADOS-18 — não cria empréstimos", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await vincularProfessor(prisma, await criarIdentidade(cliente));

      const { rows } = await cliente.query<{ emprestimos: string | null }>(
        "SELECT to_regclass('public.emprestimos')::text AS emprestimos",
      );
      if (rows[0]?.emprestimos) expect(await retrato(cliente, "emprestimos")).toEqual([]);
    });
  });

  it("CA-DADOS-22 — não grava eventos de auditoria", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await vincularProfessor(prisma, await criarIdentidade(cliente));

      expect(await retrato(cliente, "auditoria")).toEqual([]);
    });
  });

  it("CA-DADOS-19 — não altera auth.users", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const id = await criarIdentidade(cliente);
      const antes = await retrato(cliente, "auth.users");

      await vincularProfessor(prisma, id);

      expect(await retrato(cliente, "auth.users")).toEqual(antes);
    });
  });

  it("CA-DADOS-C1 — não altera tenant nem equipamentos da carga", async () => {
    await comBanco(async ({ prisma, cliente }) => {
      await executarCargaDoManifesto(prisma);
      await criarAuthUsers(cliente);
      const antes = [await retrato(cliente, "tenants"), await retrato(cliente, "equipamentos")];

      await vincularProfessor(prisma, await criarIdentidade(cliente));

      expect([await retrato(cliente, "tenants"), await retrato(cliente, "equipamentos")]).toEqual(
        antes,
      );
    });
  });

  // O papel por argumento passou a ser aceito pela CA-SESSAO-12 (Spec 003); a prova de que o
  // código não cadastra usuário continua valendo.
  it("CA-DADOS-19 — o código não cadastra usuário", () => {
    const fontes = [new URL("./vinculo.ts", import.meta.url), ROTINA].map((arquivo) =>
      readFileSync(arquivo, "utf8"),
    );

    for (const fonte of fontes) {
      expect(fonte).not.toMatch(/createUser|inviteUser|signUp|\$executeRaw|"role":/);
    }
  });
});

describe("rotina de linha de comando", () => {
  it(
    "CA-DADOS-23 — cria o vínculo sem repetir UUID nem conexão",
    async () => {
      await comAmbiente(async ({ cliente, url }) => {
        const id = await criarIdentidade(cliente);

        const { status, stdout, stderr } = rodar(["--user-id", id], { DIRECT_URL: url });
        const saida = `${stdout}\n${stderr}`;

        expect({ status, stdout }).toEqual({ status: 0, stdout: "Vínculo criado.\n" });
        expect(saida).not.toContain(id);
        expect(saida).not.toContain(new URL(url).password);
        expect(saida).not.toContain("postgresql://");
        expect(await retrato(cliente, "memberships")).toHaveLength(1);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-C1 — repetir informa que nada mudou",
    async () => {
      await comAmbiente(async ({ prisma, cliente, url }) => {
        const id = await criarIdentidade(cliente);
        await vincularProfessor(prisma, id);

        const { status, stdout } = rodar(["--user-id", id], { DIRECT_URL: url });

        expect({ status, stdout }).toEqual({
          status: 0,
          stdout: "Vínculo já existente: nada mudou.\n",
        });
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-23 — recusa identidade inexistente, com código e sem o UUID",
    async () => {
      await comAmbiente(async ({ cliente, url }) => {
        const id = randomUUID();

        const { status, stdout, stderr } = rodar(["--user-id", id], { DIRECT_URL: url });

        expect(status).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("IDENTIDADE_INEXISTENTE");
        expect(stderr).not.toContain(id);
        expect(await retrato(cliente, "memberships")).toEqual([]);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it.each<[string, string[]]>([
    ["sem --user-id", []],
    ["com a opção inexistente --role", ["--user-id", "valor-secreto", "--role", "operacoes"]],
    ["com argumento desconhecido", ["--valor-secreto"]],
  ])(
    "CA-DADOS-23 — uso inválido %s é recusado sem repetir argumentos",
    async (_nome, argumentos) => {
      await comAmbiente(async ({ cliente, url }) => {
        const { status, stderr } = rodar(argumentos, { DIRECT_URL: url });

        expect(status).toBe(1);
        expect(stderr).toContain("USO_INVALIDO");
        expect(stderr).not.toContain("valor-secreto");
        expect(await retrato(cliente, "memberships")).toEqual([]);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-24 — recusa banco remoto sem confirmação, sem expor a conexão",
    () => {
      const senha = "senha-ficticia-123";
      const { status, stdout, stderr } = rodar(["--user-id", randomUUID()], {
        DIRECT_URL: `postgresql://usuario:${senha}@db.exemplo.invalid:5432/banco`,
      });
      const saida = `${stdout}\n${stderr}`;

      expect(status).toBe(1);
      expect(saida).toContain("REMOTO_SEM_CONFIRMACAO");
      expect(saida).not.toContain(senha);
      expect(saida).not.toContain("db.exemplo.invalid");
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-24 — recusa a falta de URL",
    () => {
      const { status, stderr } = rodar(["--user-id", randomUUID()], {});

      expect(status).toBe(1);
      expect(stderr).toContain("URL_AUSENTE");
    },
    TEMPO_DO_COMANDO_MS,
  );
});

describe("papel e nome no vínculo (Spec 003)", () => {
  async function lerVinculo(cliente: Client) {
    const { rows } = await cliente.query<{ role: string; nome_exibicao: string | null }>(
      "SELECT role, nome_exibicao FROM memberships",
    );
    return rows;
  }

  it("CA-SESSAO-12 — grava papel operacoes e nome de exibição", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);

      expect(
        await vincularUsuario(prisma, { userId, papel: "operacoes", nomeExibicao: "  Ana Souza " }),
      ).toBe("criado");
      expect(await lerVinculo(cliente)).toEqual([
        { role: "operacoes", nome_exibicao: "Ana Souza" },
      ]);
    });
  });

  it("CA-SESSAO-12 — sem papel nem nome, mantém colaborador sem nome", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);

      await vincularUsuario(prisma, { userId });
      expect(await lerVinculo(cliente)).toEqual([{ role: "colaborador", nome_exibicao: null }]);
    });
  });

  it("CA-SESSAO-12 — repetir com o mesmo papel e nome não muda nada", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);
      const dados = { userId, papel: "operacoes", nomeExibicao: "Ana Souza" };
      await vincularUsuario(prisma, dados);
      const antes = await retrato(cliente, "memberships");

      expect(await vincularUsuario(prisma, dados)).toBe("ja_existente");
      expect(await vincularUsuario(prisma, { userId, papel: "operacoes" })).toBe("ja_existente");
      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it.each<[string, Omit<DadosVinculo, "userId">, string]>([
    ["papel desconhecido", { papel: "admin" }, "PAPEL_INVALIDO"],
    ["papel em maiúsculas", { papel: "OPERACOES" }, "PAPEL_INVALIDO"],
    ["papel vazio", { papel: "" }, "PAPEL_INVALIDO"],
    ["nome vazio", { nomeExibicao: "" }, "NOME_INVALIDO"],
    ["nome em branco", { nomeExibicao: " \t\n " }, "NOME_INVALIDO"],
  ])("CA-SESSAO-12 — recusa %s sem gravar", async (_caso, extras, codigo) => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);

      const erro = await vincularUsuario(prisma, { userId, ...extras }).catch(
        (falha: unknown) => falha,
      );

      expect(erro).toBeInstanceOf(ErroVinculo);
      expect(erro).toMatchObject({ codigo });
      expect(await retrato(cliente, "memberships")).toEqual([]);
    });
  });

  it("CA-SESSAO-12 — papel diferente do vínculo existente aborta sem alterar", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);
      await vincularUsuario(prisma, { userId });
      const antes = await retrato(cliente, "memberships");

      await expect(vincularUsuario(prisma, { userId, papel: "operacoes" })).rejects.toMatchObject({
        codigo: "PAPEL_DIVERGENTE",
      });
      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it("CA-SESSAO-12 — nome diferente do vínculo existente aborta sem alterar", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const userId = await criarIdentidade(cliente);
      await vincularUsuario(prisma, { userId });
      const antes = await retrato(cliente, "memberships");

      await expect(
        vincularUsuario(prisma, { userId, nomeExibicao: "Outro Nome" }),
      ).rejects.toMatchObject({ codigo: "NOME_DIVERGENTE" });
      expect(await retrato(cliente, "memberships")).toEqual(antes);
    });
  });

  it.each<[string, (cliente: Client) => Promise<string>, string]>([
    ["identidade inexistente", async () => randomUUID(), "IDENTIDADE_INEXISTENTE"],
    [
      "e-mail não confirmado",
      (cliente) => criarIdentidade(cliente, { confirmado: null }),
      "EMAIL_NAO_CONFIRMADO",
    ],
    [
      "usuário banido",
      (cliente) => criarIdentidade(cliente, { banido: FUTURO }),
      "IDENTIDADE_BANIDA",
    ],
  ])(
    "CA-SESSAO-12 — com papel e nome, mantém a verificação de identidade: %s",
    async (_caso, preparar, codigo) => {
      await comAmbiente(async ({ prisma, cliente }) => {
        const userId = await preparar(cliente);

        const erro = await vincularUsuario(prisma, {
          userId,
          papel: "operacoes",
          nomeExibicao: "Ana Souza",
        }).catch((falha: unknown) => falha);

        expect(erro).toBeInstanceOf(ErroIdentidadeRecusada);
        expect(erro).toMatchObject({ codigo });
        expect(await retrato(cliente, "memberships")).toEqual([]);
      });
    },
  );

  it(
    "CA-SESSAO-12 — a linha de comando aceita --papel e --nome sem repetir o nome",
    async () => {
      await comAmbiente(async ({ cliente, url }) => {
        const userId = await criarIdentidade(cliente);

        const { status, stdout, stderr } = rodar(
          ["--user-id", userId, "--papel", "operacoes", "--nome", "Ana Souza"],
          { DIRECT_URL: url },
        );

        expect({ status, stdout }).toEqual({ status: 0, stdout: "Vínculo criado.\n" });
        expect(`${stdout}\n${stderr}`).not.toContain("Ana Souza");
        expect(await lerVinculo(cliente)).toEqual([
          { role: "operacoes", nome_exibicao: "Ana Souza" },
        ]);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-SESSAO-12 — a linha de comando recusa papel inválido sem repetir o valor",
    async () => {
      await comAmbiente(async ({ cliente, url }) => {
        const userId = await criarIdentidade(cliente);

        const { status, stdout, stderr } = rodar(
          ["--user-id", userId, "--papel", "valor-secreto"],
          { DIRECT_URL: url },
        );

        expect(status).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("PAPEL_INVALIDO");
        expect(stderr).not.toContain("valor-secreto");
        expect(await retrato(cliente, "memberships")).toEqual([]);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );
});
