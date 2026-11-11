// @vitest-environment node
//
// CA-DADOS-02: as tabelas de domínio negam acesso a `anon` e `authenticated` por RLS.
//
// A RLS não isola tenants para o servidor: o papel dono, usado pelo Prisma, a ignora. O acesso
// entre tenants precisa ser controlado na camada de servidor, com `tenantProcedure` injetando o
// tenant da sessão nos services (ADR-001 §6 e §7). Os testes de "papel dono" documentam esse limite.
//
// Para provar que o bloqueio vem da RLS e não da falta de GRANT, os papéis têm privilégios
// concedidos no banco de teste, e dois experimentos de controle mudam só uma variável:
// uma policy permissiva libera as operações, e um REVOKE troca o resultado por "permission denied".
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, PAPEL_DONO, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const SEM_PRIVILEGIO = "42501";
const MENSAGEM_RLS = /row-level security policy/;
const MENSAGEM_SEM_GRANT = /permission denied for table/;

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const TENANT_NOVO = "00000000-0000-4000-8000-00000000000c";
const USUARIO = "00000000-0000-4000-8000-000000000001";
const USUARIO_NOVO = "00000000-0000-4000-8000-000000000002";

const PAPEIS = ["anon", "authenticated"] as const;
type Papel = (typeof PAPEIS)[number];

type Tabela = {
  nome: string;
  inserir: string;
  alteracao: string;
  filtroNovo: string;
  /** Linhas criadas pela preparação comum. */
  linhas: number;
};

const TABELAS: Tabela[] = [
  {
    nome: "tenants",
    inserir: `INSERT INTO tenants (id, slug) VALUES ('${TENANT_NOVO}', 'tenant_novo')`,
    alteracao: "slug = slug || '_alterado'",
    filtroNovo: `id = '${TENANT_NOVO}'`,
    linhas: 2,
  },
  {
    nome: "memberships",
    inserir: `INSERT INTO memberships (user_id, tenant_id, role)
              VALUES ('${USUARIO_NOVO}', '${TENANT_A}', 'colaborador')`,
    alteracao: "role = 'operacoes'",
    filtroNovo: `user_id = '${USUARIO_NOVO}'`,
    linhas: 1,
  },
  {
    nome: "equipamentos",
    inserir: `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria)
              VALUES ('${TENANT_A}', 'TI-9999', 'Item novo', 'cabo')`,
    alteracao: "nome = nome || ' alterado'",
    filtroNovo: "patrimonio = 'TI-9999'",
    linhas: 2,
  },
];

const POR_TABELA = TABELAS.map((tabela) => [tabela.nome, tabela] as const);
const POR_TABELA_E_PAPEL = TABELAS.flatMap((tabela) =>
  PAPEIS.map((papel) => [tabela.nome, papel, tabela] as const),
);

let banco: BancoReal;

async function comDados<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    await cliente.query(
      `INSERT INTO tenants (id, slug) VALUES ('${TENANT_A}', 'tenant_a'), ('${TENANT_B}', 'tenant_b')`,
    );
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role)
       VALUES ('${USUARIO}', '${TENANT_A}', 'colaborador')`,
    );
    await cliente.query(
      `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria)
       VALUES ('${TENANT_A}', 'TI-9001', 'Item do tenant A', 'notebook'),
              ('${TENANT_B}', 'TI-9001', 'Item do tenant B', 'monitor')`,
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

async function contar(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM ${tabela}`,
  );
  return rows[0]?.total;
}

/** Texto de todas as linhas, para comparar o conteúdo antes e depois. */
async function retrato(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ linha: string }>(
    `SELECT t::text AS linha FROM ${tabela} t ORDER BY 1`,
  );
  return rows.map((item) => item.linha);
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("catálogo do PostgreSQL", () => {
  it.each(POR_TABELA)("CA-DADOS-02 — %s tem RLS habilitada", async (nome) => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query<{ relrowsecurity: boolean }>(
        "SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass",
        [nome],
      );

      expect(rows).toEqual([{ relrowsecurity: true }]);
    });
  });

  it.each(POR_TABELA)("CA-DADOS-02 — %s tem as policies de negação", async (nome) => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT policyname, permissive, roles::text[] AS roles, cmd, qual, with_check
           FROM pg_policies
          WHERE schemaname = 'public' AND tablename = $1
          ORDER BY policyname`,
        [nome],
      );
      const negacao = { permissive: "PERMISSIVE", cmd: "ALL", qual: "false", with_check: "false" };

      expect(rows).toEqual([
        { ...negacao, policyname: `${nome}_negar_anon`, roles: ["anon"] },
        { ...negacao, policyname: `${nome}_negar_authenticated`, roles: ["authenticated"] },
      ]);
    });
  });

  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: %s tem os privilégios SQL, logo o bloqueio não é falta de GRANT",
    async (nome, papel) => {
      await comDados(async (cliente) => {
        const { rows } = await cliente.query<{ tem: boolean }>(
          "SELECT has_table_privilege($1, $2, 'SELECT, INSERT, UPDATE, DELETE') AS tem",
          [papel, nome],
        );

        expect(rows).toEqual([{ tem: true }]);
      });
    },
  );

  it.each(PAPEIS)("CA-DADOS-02 — %s não ignora RLS", async (papel) => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
        [papel],
      );

      expect(rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);
    });
  });
});

describe("anon e authenticated sob RLS", () => {
  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: SELECT como %s devolve zero linhas, embora existam registros",
    async (nome, papel, tabela) => {
      await comDados(async (cliente) => {
        expect(await contar(cliente, nome)).toBe(tabela.linhas);

        const { rows } = await comoPapel(cliente, papel, () =>
          cliente.query(`SELECT * FROM ${nome}`),
        );

        expect(rows).toEqual([]);
      });
    },
  );

  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: INSERT como %s é rejeitado pela policy",
    async (nome, papel, tabela) => {
      await comDados(async (cliente) => {
        const antes = await retrato(cliente, nome);

        await comoPapel(cliente, papel, async () => {
          const erro = await cliente.query(tabela.inserir).catch((falha: unknown) => falha);

          expect(erro).toMatchObject({
            code: SEM_PRIVILEGIO,
            message: expect.stringMatching(MENSAGEM_RLS),
          });
        });

        expect(await retrato(cliente, nome)).toEqual(antes);
      });
    },
  );

  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: UPDATE como %s afeta zero linhas e nada muda",
    async (nome, papel, tabela) => {
      await comDados(async (cliente) => {
        const antes = await retrato(cliente, nome);

        const { rowCount } = await comoPapel(cliente, papel, () =>
          cliente.query(`UPDATE ${nome} SET ${tabela.alteracao}`),
        );

        expect(rowCount).toBe(0);
        expect(await retrato(cliente, nome)).toEqual(antes);
      });
    },
  );

  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: DELETE como %s afeta zero linhas e nada some",
    async (nome, papel) => {
      await comDados(async (cliente) => {
        const antes = await retrato(cliente, nome);

        const { rowCount } = await comoPapel(cliente, papel, () =>
          cliente.query(`DELETE FROM ${nome}`),
        );

        expect(rowCount).toBe(0);
        expect(await retrato(cliente, nome)).toEqual(antes);
      });
    },
  );
});

describe("controles: a causa do bloqueio é a RLS", () => {
  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: com policy permissiva temporária, %s consegue operar",
    async (nome, papel, tabela) => {
      await comDados(async (cliente) => {
        await cliente.query(
          `CREATE POLICY "controle_permitir" ON ${nome}
             FOR ALL TO ${papel} USING (true) WITH CHECK (true)`,
        );

        await comoPapel(cliente, papel, async () => {
          expect(await contar(cliente, nome)).toBe(tabela.linhas);
          await expect(cliente.query(tabela.inserir)).resolves.toMatchObject({ rowCount: 1 });
          await expect(
            cliente.query(`UPDATE ${nome} SET ${tabela.alteracao} WHERE ${tabela.filtroNovo}`),
          ).resolves.toMatchObject({ rowCount: 1 });
          await expect(
            cliente.query(`DELETE FROM ${nome} WHERE ${tabela.filtroNovo}`),
          ).resolves.toMatchObject({ rowCount: 1 });
        });
      });
    },
  );

  it.each(POR_TABELA_E_PAPEL)(
    "CA-DADOS-02 — %s: sem GRANT, %s recebe outro erro, diferente do bloqueio por RLS",
    async (nome, papel, tabela) => {
      await comDados(async (cliente) => {
        await cliente.query(`REVOKE ALL ON ${nome} FROM ${papel}`);

        await comoPapel(cliente, papel, async () => {
          const comandos = [
            `SELECT * FROM ${nome}`,
            tabela.inserir,
            `UPDATE ${nome} SET ${tabela.alteracao}`,
            `DELETE FROM ${nome}`,
          ];

          for (const comando of comandos) {
            const erro = await cliente.query(comando).catch((falha: unknown) => falha);

            expect(erro).toMatchObject({
              code: SEM_PRIVILEGIO,
              message: expect.stringMatching(MENSAGEM_SEM_GRANT),
            });
          }
        });
      });
    },
  );
});

describe("papel dono: limite da RLS", () => {
  it.each(POR_TABELA)(
    "CA-DADOS-02 — %s: o papel dono lê, insere, altera e exclui",
    async (nome, tabela) => {
      await comDados(async (cliente) => {
        expect(await contar(cliente, nome)).toBe(tabela.linhas);
        await expect(cliente.query(tabela.inserir)).resolves.toMatchObject({ rowCount: 1 });
        await expect(
          cliente.query(`UPDATE ${nome} SET ${tabela.alteracao} WHERE ${tabela.filtroNovo}`),
        ).resolves.toMatchObject({ rowCount: 1 });
        await expect(
          cliente.query(`DELETE FROM ${nome} WHERE ${tabela.filtroNovo}`),
        ).resolves.toMatchObject({ rowCount: 1 });
        expect(await contar(cliente, nome)).toBe(tabela.linhas);
      });
    },
  );

  it("CA-DADOS-02 — o dono ignora a RLS por ser dono, sem superusuário nem BYPASSRLS", async () => {
    await comDados(async (cliente) => {
      const { rows: papel } = await cliente.query(
        "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      const { rows: tabelas } = await cliente.query(
        `SELECT relname, pg_get_userbyid(relowner) AS dono, relforcerowsecurity
           FROM pg_class
          WHERE oid IN ('tenants'::regclass, 'memberships'::regclass, 'equipamentos'::regclass)
          ORDER BY relname`,
      );

      expect(papel).toEqual([{ rolname: PAPEL_DONO, rolsuper: false, rolbypassrls: false }]);
      expect(tabelas).toEqual(
        ["equipamentos", "memberships", "tenants"].map((relname) => ({
          relname,
          dono: PAPEL_DONO,
          relforcerowsecurity: false,
        })),
      );
    });
  });

  it("CA-DADOS-02 — sem filtro, o dono vê todos os tenants: o servidor precisa filtrar", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query<{ nome: string }>(
        "SELECT nome FROM equipamentos ORDER BY nome",
      );

      expect(rows).toEqual([{ nome: "Item do tenant A" }, { nome: "Item do tenant B" }]);
    });
  });
});
