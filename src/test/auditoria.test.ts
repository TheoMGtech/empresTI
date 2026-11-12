// @vitest-environment node
//
// CA-DADOS-20 e CA-DADOS-21: estrutura da auditoria e bloqueio append-only.
//
// O append-only vem de triggers, não da RLS: o papel dono, usado pelo Prisma, ignora a RLS, mas
// não os triggers. Os testes de bloqueio rodam como esse papel, que não é superusuário.
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, PAPEL_DONO, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const VIOLACAO_FK = "23503";
const VIOLACAO_NOT_NULL = "23502";
const VIOLACAO_CHECK = "23514";
const EXCECAO_DO_TRIGGER = "P0001";
const SEM_PRIVILEGIO = "42501";
const MENSAGEM_APPEND_ONLY = /append-only/;

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const TENANT_INEXISTENTE = "00000000-0000-4000-8000-00000000000f";

const PAPEIS = ["anon", "authenticated"] as const;
type Papel = (typeof PAPEIS)[number];

const INSERIR = `INSERT INTO auditoria (tenant_id, ator, acao, recurso)
                 VALUES ('${TENANT_A}', 'ator-novo', 'acao-nova', 'recurso-novo')`;
const ALTERAR = "UPDATE auditoria SET acao = 'adulterada'";
const EXCLUIR = "DELETE FROM auditoria";
const TRUNCAR = "TRUNCATE auditoria";

let banco: BancoReal;

async function comDados<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    await cliente.query(
      `INSERT INTO tenants (id, slug) VALUES ('${TENANT_A}', 'tenant_a'), ('${TENANT_B}', 'tenant_b')`,
    );
    await cliente.query(
      `INSERT INTO auditoria (tenant_id, ator, acao, recurso)
       VALUES ('${TENANT_A}', 'ator-a', 'criou', 'equipamento:TI-9001'),
              ('${TENANT_B}', 'ator-b', 'alterou', 'equipamento:TI-9002')`,
    );
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

async function comoPapel<T>(cliente: Client, papel: Papel, acao: () => Promise<T>) {
  await cliente.query(`SET ROLE ${papel}`);
  try {
    return await acao();
  } finally {
    await cliente.query("RESET ROLE");
  }
}

async function retrato(cliente: Client) {
  const { rows } = await cliente.query<{ linha: string }>(
    "SELECT a::text AS linha FROM auditoria a ORDER BY 1",
  );
  return rows.map((item) => item.linha);
}

const falhaDe = (cliente: Client, sql: string, parametros: unknown[] = []) =>
  cliente.query(sql, parametros).catch((falha: unknown) => falha);

async function colunas(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY column_name`,
    [tabela],
  );
  return rows.map((linha) => linha.column_name);
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("migrations", () => {
  // As provas de escopo valem para o estado da spec 002; specs posteriores acrescentam
  // migrations e colunas. Triggers e bloqueios seguem provados nos testes abaixo.
  it("CA-DADOS-01 — existe a migration gerada da auditoria, depois da estrutura", async () => {
    const pasta = fileURLToPath(new URL("../../prisma/migrations", import.meta.url));
    const entradas = await readdir(pasta, { withFileTypes: true });
    const nomes = entradas
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();

    expect(nomes.slice(0, 4).map((nome) => nome.replace(/^\d+_/, ""))).toEqual([
      "criar_saude_sistema",
      "criar_estrutura_dominio",
      "criar_auditoria",
      "reforcar_bloqueio_truncate",
    ]);
  });

  it("CA-DADOS-01 — não altera as demais tabelas", async () => {
    await comDados(async (cliente) => {
      // Triggers nas tabelas da spec 002; tabelas de specs posteriores têm os próprios
      // (T-SOLIC-01). `saude_sistema` continua sem trigger.
      const { rows: triggers } = await cliente.query<{ tabela: string }>(
        `SELECT DISTINCT tgrelid::regclass::text AS tabela FROM pg_trigger
          WHERE NOT tgisinternal
            AND tgrelid::regclass::text IN
                ('auditoria', 'equipamentos', 'memberships', 'saude_sistema', 'tenants')
          ORDER BY 1`,
      );

      expect(triggers).toEqual([
        { tabela: "auditoria" },
        { tabela: "equipamentos" },
        { tabela: "memberships" },
        { tabela: "tenants" },
      ]);
      expect(await colunas(cliente, "tenants")).toEqual(["criado_em", "id", "slug"]);
      expect(await colunas(cliente, "memberships")).toEqual(
        expect.arrayContaining(["criado_em", "role", "tenant_id", "user_id"]),
      );
      expect(await colunas(cliente, "saude_sistema")).toEqual([
        "componente",
        "id",
        "tenant_id",
        "verificado_em",
      ]);
    });
  });
});

describe("estrutura da auditoria", () => {
  it("CA-DADOS-20 — tem tenant, ator, ação, recurso e data, todos obrigatórios", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'auditoria'
          ORDER BY ordinal_position`,
      );
      const obrigatoria = { is_nullable: "NO", column_default: null };

      expect(rows).toEqual([
        {
          column_name: "id",
          data_type: "uuid",
          is_nullable: "NO",
          column_default: "gen_random_uuid()",
        },
        { ...obrigatoria, column_name: "tenant_id", data_type: "uuid" },
        { ...obrigatoria, column_name: "ator", data_type: "text" },
        { ...obrigatoria, column_name: "acao", data_type: "text" },
        { ...obrigatoria, column_name: "recurso", data_type: "text" },
        {
          column_name: "ocorrido_em",
          data_type: "timestamp with time zone",
          is_nullable: "NO",
          column_default: "CURRENT_TIMESTAMP",
        },
      ]);
    });
  });

  it("CA-DADOS-20 — tem chave primária, FK restritiva e índice por tenant e data", async () => {
    await comDados(async (cliente) => {
      const { rows: restricoes } = await cliente.query(
        `SELECT conname, contype, confrelid::regclass::text AS destino, confdeltype, confupdtype
           FROM pg_constraint
          WHERE conrelid = 'auditoria'::regclass AND contype IN ('p', 'f')
          ORDER BY conname`,
      );
      const { rows: indices } = await cliente.query<{ indexdef: string }>(
        "SELECT indexdef FROM pg_indexes WHERE indexname = 'auditoria_tenant_ocorrido_idx'",
      );

      expect(restricoes).toEqual([
        {
          conname: "auditoria_pkey",
          contype: "p",
          destino: "-",
          confdeltype: " ",
          confupdtype: " ",
        },
        {
          conname: "auditoria_tenant_id_fkey",
          contype: "f",
          destino: "tenants",
          confdeltype: "r",
          confupdtype: "r",
        },
      ]);
      expect(indices[0]?.indexdef).toContain("(tenant_id, ocorrido_em)");
    });
  });

  it("CA-DADOS-20 — preenche identificador e data automaticamente", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query<{ id: string; ocorrido_em: Date }>(
        `INSERT INTO auditoria (tenant_id, ator, acao, recurso)
         VALUES ('${TENANT_A}', 'ator', 'acao', 'recurso') RETURNING id, ocorrido_em`,
      );

      expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(rows[0]?.ocorrido_em).toBeInstanceOf(Date);
    });
  });

  it.each(["tenant_id", "ator", "acao", "recurso"])(
    "CA-DADOS-20 — rejeita %s ausente",
    async (coluna) => {
      await comDados(async (cliente) => {
        const valores: Record<string, string | null> = {
          tenant_id: TENANT_A,
          ator: "ator",
          acao: "acao",
          recurso: "recurso",
          [coluna]: null,
        };

        expect(
          await falhaDe(
            cliente,
            "INSERT INTO auditoria (tenant_id, ator, acao, recurso) VALUES ($1, $2, $3, $4)",
            [valores.tenant_id, valores.ator, valores.acao, valores.recurso],
          ),
        ).toMatchObject({ code: VIOLACAO_NOT_NULL });
      });
    },
  );

  it.each(["ator", "acao", "recurso"])("CA-DADOS-20 — rejeita %s vazio", async (coluna) => {
    await comDados(async (cliente) => {
      const valores: Record<string, string> = {
        ator: "ator",
        acao: "acao",
        recurso: "recurso",
        [coluna]: "   ",
      };

      expect(
        await falhaDe(
          cliente,
          "INSERT INTO auditoria (tenant_id, ator, acao, recurso) VALUES ($1, $2, $3, $4)",
          [TENANT_A, valores.ator, valores.acao, valores.recurso],
        ),
      ).toMatchObject({ code: VIOLACAO_CHECK });
    });
  });

  it("CA-DADOS-03 — auditoria não referencia tenant inexistente", async () => {
    await comDados(async (cliente) => {
      expect(
        await falhaDe(
          cliente,
          "INSERT INTO auditoria (tenant_id, ator, acao, recurso) VALUES ($1, 'a', 'b', 'c')",
          [TENANT_INEXISTENTE],
        ),
      ).toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-DADOS-03 — tenant com auditoria não pode ser excluído", async () => {
    await comDados(async (cliente) => {
      expect(await falhaDe(cliente, "DELETE FROM tenants WHERE id = $1", [TENANT_A])).toMatchObject(
        {
          code: VIOLACAO_FK,
        },
      );
    });
  });
});

describe("append-only para o papel dono", () => {
  it("CA-DADOS-21 — os testes rodam como dono da tabela, sem superusuário", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT current_user::text AS papel,
                (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superusuario,
                pg_get_userbyid(relowner) AS dono
           FROM pg_class WHERE oid = 'auditoria'::regclass`,
      );

      expect(rows).toEqual([{ papel: PAPEL_DONO, superusuario: false, dono: PAPEL_DONO }]);
    });
  });

  it("CA-DADOS-21 — INSERT funciona e soma uma linha", async () => {
    await comDados(async (cliente) => {
      await expect(cliente.query(INSERIR)).resolves.toMatchObject({ rowCount: 1 });
      expect(await retrato(cliente)).toHaveLength(3);
    });
  });

  it.each([
    ["UPDATE", ALTERAR],
    ["DELETE", EXCLUIR],
    ["TRUNCATE", TRUNCAR],
    ["TRUNCATE com CASCADE", "TRUNCATE auditoria CASCADE"],
  ])("CA-DADOS-21 — %s é bloqueado e os registros ficam intactos", async (_nome, comando) => {
    await comDados(async (cliente) => {
      const antes = await retrato(cliente);

      expect(await falhaDe(cliente, comando)).toMatchObject({
        code: EXCECAO_DO_TRIGGER,
        message: expect.stringMatching(MENSAGEM_APPEND_ONLY),
      });
      expect(antes).toHaveLength(2);
      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it("CA-DADOS-21 — TRUNCATE em cascata a partir de tenants não apaga a auditoria", async () => {
    await comDados(async (cliente) => {
      const antes = await retrato(cliente);

      expect(await falhaDe(cliente, "TRUNCATE tenants CASCADE")).toMatchObject({
        code: EXCECAO_DO_TRIGGER,
      });
      expect(antes).toHaveLength(2);
      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it("CA-DADOS-21 — os triggers disparam sempre, em qualquer modo de replicação", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query<{
        tgname: string;
        tgenabled: string;
        definicao: string;
      }>(
        `SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS definicao
           FROM pg_trigger
          WHERE tgrelid = 'auditoria'::regclass AND NOT tgisinternal
          ORDER BY tgname`,
      );

      expect(rows.map(({ tgname, tgenabled }) => ({ tgname, tgenabled }))).toEqual([
        { tgname: "auditoria_sem_alteracao", tgenabled: "A" },
        { tgname: "auditoria_sem_truncate", tgenabled: "A" },
      ]);
      expect(rows[0]?.definicao).toContain("BEFORE DELETE OR UPDATE");
      expect(rows[1]?.definicao).toContain("BEFORE TRUNCATE");
    });
  });

  it("CA-DADOS-21 — a função do trigger não eleva privilégios nem é executável por anon", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT prosecdef,
                proconfig,
                has_function_privilege('anon', oid, 'EXECUTE') AS anon,
                has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated
           FROM pg_proc WHERE proname = 'auditoria_bloquear_mutacao'`,
      );

      expect(rows).toEqual([
        { prosecdef: false, proconfig: ['search_path=""'], anon: false, authenticated: false },
      ]);
    });
  });
});

describe("RLS da auditoria", () => {
  it("CA-DADOS-02 — RLS habilitada e policies de negação", async () => {
    await comDados(async (cliente) => {
      const { rows: tabela } = await cliente.query(
        "SELECT relrowsecurity FROM pg_class WHERE oid = 'auditoria'::regclass",
      );
      const { rows: politicas } = await cliente.query(
        `SELECT policyname, permissive, roles::text[] AS roles, cmd, qual, with_check
           FROM pg_policies WHERE tablename = 'auditoria' ORDER BY policyname`,
      );
      const negacao = { permissive: "PERMISSIVE", cmd: "ALL", qual: "false", with_check: "false" };

      expect(tabela).toEqual([{ relrowsecurity: true }]);
      expect(politicas).toEqual([
        { ...negacao, policyname: "auditoria_negar_anon", roles: ["anon"] },
        { ...negacao, policyname: "auditoria_negar_authenticated", roles: ["authenticated"] },
      ]);
    });
  });

  it.each(PAPEIS)("CA-DADOS-02 — %s tem os privilégios SQL na auditoria", async (papel) => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        "SELECT has_table_privilege($1, 'auditoria', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS tem",
        [papel],
      );

      expect(rows).toEqual([{ tem: true }]);
    });
  });

  it.each(PAPEIS)("CA-DADOS-02 — SELECT como %s devolve zero linhas", async (papel) => {
    await comDados(async (cliente) => {
      expect(await retrato(cliente)).toHaveLength(2);

      const { rows } = await comoPapel(cliente, papel, () =>
        cliente.query("SELECT * FROM auditoria"),
      );

      expect(rows).toEqual([]);
    });
  });

  it.each(PAPEIS)("CA-DADOS-02 — INSERT como %s é rejeitado pela policy", async (papel) => {
    await comDados(async (cliente) => {
      const antes = await retrato(cliente);

      await comoPapel(cliente, papel, async () => {
        expect(await falhaDe(cliente, INSERIR)).toMatchObject({
          code: SEM_PRIVILEGIO,
          message: expect.stringMatching(/row-level security policy/),
        });
      });

      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it.each(
    PAPEIS.flatMap((papel) => [
      ["UPDATE", papel, ALTERAR],
      ["DELETE", papel, EXCLUIR],
    ]) as [string, Papel, string][],
  )("CA-DADOS-02 — %s como %s afeta zero linhas", async (_nome, papel, comando) => {
    await comDados(async (cliente) => {
      const antes = await retrato(cliente);

      const { rowCount } = await comoPapel(cliente, papel, () => cliente.query(comando));

      expect(rowCount).toBe(0);
      expect(await retrato(cliente)).toEqual(antes);
    });
  });
});

describe("controles: RLS e trigger são barreiras independentes", () => {
  it.each(PAPEIS)(
    "CA-DADOS-21 — com policy permissiva, %s lê e insere, mas o trigger barra as mutações",
    async (papel) => {
      await comDados(async (cliente) => {
        await cliente.query(
          `CREATE POLICY "controle_permitir" ON auditoria
             FOR ALL TO ${papel} USING (true) WITH CHECK (true)`,
        );
        const antes = await retrato(cliente);

        await comoPapel(cliente, papel, async () => {
          const { rows } = await cliente.query("SELECT * FROM auditoria");
          expect(rows).toHaveLength(2);

          for (const comando of [ALTERAR, EXCLUIR]) {
            expect(await falhaDe(cliente, comando)).toMatchObject({
              code: EXCECAO_DO_TRIGGER,
              message: expect.stringMatching(MENSAGEM_APPEND_ONLY),
            });
          }
          await expect(cliente.query(INSERIR)).resolves.toMatchObject({ rowCount: 1 });
        });

        const depois = await retrato(cliente);
        expect(depois).toHaveLength(antes.length + 1);
        expect(depois).toEqual(expect.arrayContaining(antes));
      });
    },
  );

  it.each(PAPEIS)(
    "CA-DADOS-21 — TRUNCATE como %s, que a RLS não cobre, é barrado pelo trigger",
    async (papel) => {
      await comDados(async (cliente) => {
        const antes = await retrato(cliente);

        await comoPapel(cliente, papel, async () => {
          expect(await falhaDe(cliente, TRUNCAR)).toMatchObject({
            code: EXCECAO_DO_TRIGGER,
            message: expect.stringMatching(MENSAGEM_APPEND_ONLY),
          });
        });

        expect(await retrato(cliente)).toEqual(antes);
      });
    },
  );

  it.each(PAPEIS)("CA-DADOS-02 — sem GRANT, %s recebe outro erro", async (papel) => {
    await comDados(async (cliente) => {
      await cliente.query(`REVOKE ALL ON auditoria FROM ${papel}`);

      await comoPapel(cliente, papel, async () => {
        for (const comando of ["SELECT * FROM auditoria", INSERIR, ALTERAR, EXCLUIR, TRUNCAR]) {
          expect(await falhaDe(cliente, comando)).toMatchObject({
            code: SEM_PRIVILEGIO,
            message: expect.stringMatching(/permission denied for table/),
          });
        }
      });
    });
  });
});
