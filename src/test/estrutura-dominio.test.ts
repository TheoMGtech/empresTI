// @vitest-environment node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const VIOLACAO_FK = "23503";
const VIOLACAO_UNICIDADE = "23505";
const VIOLACAO_CHECK = "23514";
const VALOR_DE_ENUM_INVALIDO = "22P02";

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const TENANT_INEXISTENTE = "00000000-0000-4000-8000-00000000000f";
const USUARIO = "00000000-0000-4000-8000-000000000001";
const SHA_VALIDO = "a".repeat(64);

type Equipamento = {
  tenantId?: string;
  patrimonio?: string;
  nome?: string;
  categoria?: string;
  situacao?: string;
  caminho?: string | null;
  sha?: string | null;
};

let banco: BancoReal;

async function comBanco<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

const criarTenant = (cliente: Client, id: string, slug: string) =>
  cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, $2)", [id, slug]);

const criarTenants = async (cliente: Client) => {
  await criarTenant(cliente, TENANT_A, "tenant_a");
  await criarTenant(cliente, TENANT_B, "tenant_b");
};

const criarEquipamento = (cliente: Client, dados: Equipamento = {}) =>
  cliente.query(
    `INSERT INTO equipamentos
       (tenant_id, patrimonio, nome, categoria, situacao, imagem_caminho, imagem_sha256)
     VALUES ($1, $2, $3, $4::categoria_equipamento, $5::situacao_equipamento, $6, $7)`,
    [
      dados.tenantId ?? TENANT_A,
      dados.patrimonio ?? "TI-9001",
      dados.nome ?? "Item de teste",
      dados.categoria ?? "notebook",
      dados.situacao ?? "ativo",
      dados.caminho ?? null,
      dados.sha ?? null,
    ],
  );

const criarMembership = (cliente: Client, tenantId: string, role = "colaborador") =>
  cliente.query(
    "INSERT INTO memberships (user_id, tenant_id, role) VALUES ($1, $2, $3::papel_membership)",
    [USUARIO, tenantId, role],
  );

async function listar<T extends string>(cliente: Client, sql: string, coluna: T) {
  const { rows } = await cliente.query<Record<T, string>>(sql);
  return rows.map((linha) => linha[coluna]);
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("migrations do zero", () => {
  it("CA-DADOS-01 — existe a migration gerada da estrutura do domínio", async () => {
    const pasta = fileURLToPath(new URL("../../prisma/migrations", import.meta.url));
    const entradas = await readdir(pasta, { withFileTypes: true });
    const nomes = entradas.filter((item) => item.isDirectory()).map((item) => item.name);

    expect(nomes.some((nome) => nome.endsWith("_criar_saude_sistema"))).toBe(true);
    expect(nomes.some((nome) => nome.endsWith("_criar_estrutura_dominio"))).toBe(true);
  });

  // A lista de tabelas vale para o estado da spec 002; specs posteriores acrescentam tabelas
  // (Spec 005, T-SOLIC-01).
  it("CA-DADOS-01 — todas as migrations aplicam em banco isolado", async () => {
    await comBanco(async (cliente) => {
      const tabelas = await listar(
        cliente,
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
        "tablename",
      );

      expect(tabelas).toEqual(
        expect.arrayContaining([
          "auditoria",
          "equipamentos",
          "memberships",
          "saude_sistema",
          "tenants",
        ]),
      );
    });
  });

  it("CA-DADOS-01 — preserva a estrutura de saude_sistema", async () => {
    await comBanco(async (cliente) => {
      const { rows: colunas } = await cliente.query<{
        column_name: string;
        data_type: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, column_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'saude_sistema'
          ORDER BY ordinal_position`,
      );
      const restricoes = await listar(
        cliente,
        `SELECT conname FROM pg_constraint
          WHERE conrelid = 'saude_sistema'::regclass ORDER BY conname`,
        "conname",
      );
      const politicas = await listar(
        cliente,
        "SELECT policyname FROM pg_policies WHERE tablename = 'saude_sistema' ORDER BY policyname",
        "policyname",
      );

      expect(colunas).toEqual([
        { column_name: "id", data_type: "uuid", column_default: "gen_random_uuid()" },
        { column_name: "tenant_id", data_type: "uuid", column_default: null },
        { column_name: "componente", data_type: "text", column_default: null },
        {
          column_name: "verificado_em",
          data_type: "timestamp with time zone",
          column_default: "CURRENT_TIMESTAMP",
        },
      ]);
      expect(restricoes).toEqual(["saude_sistema_componente_nao_vazio", "saude_sistema_pkey"]);
      expect(politicas).toEqual(["saude_sistema_negar_anon", "saude_sistema_negar_authenticated"]);
    });
  });
});

describe("relacionamentos com tenants", () => {
  it("CA-DADOS-03 — equipamento não referencia tenant inexistente", async () => {
    await comBanco(async (cliente) => {
      await expect(
        criarEquipamento(cliente, { tenantId: TENANT_INEXISTENTE }),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-DADOS-03 — membership não referencia tenant inexistente", async () => {
    await comBanco(async (cliente) => {
      await expect(criarMembership(cliente, TENANT_INEXISTENTE)).rejects.toMatchObject({
        code: VIOLACAO_FK,
      });
    });
  });

  it("CA-DADOS-03 — tenant com equipamento não pode ser excluído", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarEquipamento(cliente);

      await expect(
        cliente.query("DELETE FROM tenants WHERE id = $1", [TENANT_A]),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-DADOS-03 — tenant com membership não pode ser excluído", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarMembership(cliente, TENANT_A);

      await expect(
        cliente.query("DELETE FROM tenants WHERE id = $1", [TENANT_A]),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-DADOS-03 — slug de tenant é único", async () => {
    await comBanco(async (cliente) => {
      await criarTenant(cliente, TENANT_A, "tenant_a");

      await expect(criarTenant(cliente, TENANT_B, "tenant_a")).rejects.toMatchObject({
        code: VIOLACAO_UNICIDADE,
      });
    });
  });
});

describe("isolamento entre tenants", () => {
  it("CA-DADOS-04 — patrimônio repetido no mesmo tenant é rejeitado", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarEquipamento(cliente);

      await expect(criarEquipamento(cliente)).rejects.toMatchObject({
        code: VIOLACAO_UNICIDADE,
      });
    });
  });

  it("CA-DADOS-04 — o mesmo patrimônio é aceito em outro tenant", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarEquipamento(cliente, { tenantId: TENANT_A });
      await criarEquipamento(cliente, { tenantId: TENANT_B });

      const { rows } = await cliente.query<{ total: string }>(
        "SELECT count(*) AS total FROM equipamentos WHERE patrimonio = 'TI-9001'",
      );
      expect(rows[0]?.total).toBe("2");
    });
  });

  it("CA-DADOS-04 — nome repetido no mesmo tenant é aceito", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarEquipamento(cliente, { patrimonio: "TI-9001", nome: "Mesmo nome" });
      await criarEquipamento(cliente, { patrimonio: "TI-9002", nome: "Mesmo nome" });

      const { rows } = await cliente.query<{ total: string }>(
        "SELECT count(*) AS total FROM equipamentos WHERE nome = 'Mesmo nome'",
      );
      expect(rows[0]?.total).toBe("2");
    });
  });

  it("CA-DADOS-04 — consulta filtrada pelo tenant A não devolve dado do tenant B", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarEquipamento(cliente, { tenantId: TENANT_A, nome: "Do tenant A" });
      await criarEquipamento(cliente, { tenantId: TENANT_B, nome: "Do tenant B" });

      const { rows } = await cliente.query<{ nome: string }>(
        "SELECT nome FROM equipamentos WHERE tenant_id = $1",
        [TENANT_A],
      );
      expect(rows).toEqual([{ nome: "Do tenant A" }]);
    });
  });

  it("CA-DADOS-04 — um usuário tem um único vínculo por tenant", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarMembership(cliente, TENANT_A);

      await expect(criarMembership(cliente, TENANT_A, "operacoes")).rejects.toMatchObject({
        code: VIOLACAO_UNICIDADE,
      });
    });
  });

  it("CA-DADOS-04 — o mesmo usuário pode ter vínculo em outro tenant", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await criarMembership(cliente, TENANT_A);
      await criarMembership(cliente, TENANT_B);

      const { rows } = await cliente.query<{ total: string }>(
        "SELECT count(*) AS total FROM memberships WHERE user_id = $1",
        [USUARIO],
      );
      expect(rows[0]?.total).toBe("2");
    });
  });
});

describe("valores definidos", () => {
  it.each(["ativo", "em_manutencao", "fora_de_uso"])(
    "CA-DADOS-05 — aceita a situação %s",
    async (situacao) => {
      await comBanco(async (cliente) => {
        await criarTenants(cliente);
        await expect(criarEquipamento(cliente, { situacao })).resolves.toMatchObject({
          rowCount: 1,
        });
      });
    },
  );

  it.each(["colaborador", "operacoes"])("CA-DADOS-05 — aceita o papel %s", async (papel) => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await expect(criarMembership(cliente, TENANT_A, papel)).resolves.toMatchObject({
        rowCount: 1,
      });
    });
  });

  it.each(["disponivel", "emprestado", "ATIVO", ""])(
    "CA-DADOS-05 — rejeita a situação inválida '%s'",
    async (situacao) => {
      await comBanco(async (cliente) => {
        await criarTenants(cliente);
        await expect(criarEquipamento(cliente, { situacao })).rejects.toMatchObject({
          code: VALOR_DE_ENUM_INVALIDO,
        });
      });
    },
  );

  it.each(["admin", "professor", "COLABORADOR", ""])(
    "CA-DADOS-05 — rejeita o papel inválido '%s'",
    async (papel) => {
      await comBanco(async (cliente) => {
        await criarTenants(cliente);
        await expect(criarMembership(cliente, TENANT_A, papel)).rejects.toMatchObject({
          code: VALOR_DE_ENUM_INVALIDO,
        });
      });
    },
  );

  it("CA-DADOS-05 — os enums têm exatamente os valores definidos", async () => {
    await comBanco(async (cliente) => {
      const valores = (tipo: string) =>
        listar(cliente, `SELECT unnest(enum_range(NULL::${tipo}))::text AS valor`, "valor");

      expect(await valores("situacao_equipamento")).toEqual([
        "ativo",
        "em_manutencao",
        "fora_de_uso",
      ]);
      expect(await valores("papel_membership")).toEqual(["colaborador", "operacoes"]);
      expect(await valores("categoria_equipamento")).toEqual([
        "notebook",
        "monitor",
        "cabo",
        "camera",
      ]);
    });
  });

  it("CA-DADOS-05 — a situação padrão é ativo", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      const { rows } = await cliente.query<{ situacao: string }>(
        `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria)
         VALUES ($1, 'TI-9001', 'Item', 'cabo') RETURNING situacao`,
        [TENANT_A],
      );

      expect(rows).toEqual([{ situacao: "ativo" }]);
    });
  });
});

describe("fotografia e campos obrigatórios", () => {
  it("CA-DADOS-05 — aceita equipamento sem fotografia", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await expect(criarEquipamento(cliente)).resolves.toMatchObject({ rowCount: 1 });
    });
  });

  it("CA-DADOS-05 — aceita caminho e SHA-256 juntos", async () => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await expect(
        criarEquipamento(cliente, { caminho: "equipamentos/foto.jpg", sha: SHA_VALIDO }),
      ).resolves.toMatchObject({ rowCount: 1 });
    });
  });

  it.each<[string, Equipamento]>([
    ["caminho sem SHA-256", { caminho: "equipamentos/foto.jpg" }],
    ["SHA-256 sem caminho", { sha: SHA_VALIDO }],
    ["SHA-256 curto", { caminho: "equipamentos/foto.jpg", sha: "a".repeat(63) }],
    ["SHA-256 em maiúsculas", { caminho: "equipamentos/foto.jpg", sha: "A".repeat(64) }],
    ["SHA-256 com caractere inválido", { caminho: "equipamentos/foto.jpg", sha: "g".repeat(64) }],
    ["patrimônio vazio", { patrimonio: "   " }],
    ["nome vazio", { nome: "   " }],
  ])("CA-DADOS-05 — rejeita %s", async (_nome, dados) => {
    await comBanco(async (cliente) => {
      await criarTenants(cliente);
      await expect(criarEquipamento(cliente, dados)).rejects.toMatchObject({
        code: VIOLACAO_CHECK,
      });
    });
  });

  it("CA-DADOS-05 — rejeita slug vazio", async () => {
    await comBanco(async (cliente) => {
      await expect(criarTenant(cliente, TENANT_A, "   ")).rejects.toMatchObject({
        code: VIOLACAO_CHECK,
      });
    });
  });
});

describe("limites da estrutura", () => {
  // As colunas valem para o estado da spec 002; a Spec 005 acrescenta colunas opcionais
  // (T-SOLIC-01). As migrations da spec 002 seguem sem colunas além destas.
  it("CA-DADOS-06 — equipamento tem os campos definidos na spec 002", async () => {
    await comBanco(async (cliente) => {
      const colunas = await listar(
        cliente,
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'equipamentos'
          ORDER BY column_name`,
        "column_name",
      );

      expect(colunas).toEqual(
        expect.arrayContaining([
          "atualizado_em",
          "categoria",
          "criado_em",
          "id",
          "imagem_caminho",
          "imagem_sha256",
          "nome",
          "patrimonio",
          "situacao",
          "tenant_id",
        ]),
      );
    });
  });

  it("CA-DADOS-06 — as migrations da spec 002 não criam número de série, local nem observações", async () => {
    const pasta = fileURLToPath(new URL("../../prisma/migrations", import.meta.url));
    const nomes = (await readdir(pasta, { withFileTypes: true }))
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort()
      .slice(0, 4);
    const conteudo = (
      await Promise.all(
        nomes.map((nome) => readFile(path.join(pasta, nome, "migration.sql"), "utf8")),
      )
    ).join("\n");

    expect(nomes.map((nome) => nome.replace(/^\d+_/, ""))).toEqual([
      "criar_saude_sistema",
      "criar_estrutura_dominio",
      "criar_auditoria",
      "reforcar_bloqueio_truncate",
    ]);
    expect(conteudo).not.toMatch(/numero_serie|"local"|observacoes/);
  });

  it("CA-DADOS-07 — memberships só tem FK para tenants", async () => {
    await comBanco(async (cliente) => {
      const destinos = await listar(
        cliente,
        `SELECT confrelid::regclass::text AS destino FROM pg_constraint
          WHERE conrelid = 'memberships'::regclass AND contype = 'f'`,
        "destino",
      );

      expect(destinos).toEqual(["tenants"]);
    });
  });
});
