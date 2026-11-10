// @vitest-environment node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ErroDockerIndisponivel,
  ErroHostNaoLocal,
  garantirHostLocal,
  iniciarBancoReal,
  PAPEL_DONO,
  type BancoReal,
} from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

async function comCliente<T>(url: string, acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

describe("proteções do banco real", () => {
  it.each(["localhost", "127.0.0.1", "::1"])("CA-DADOS-01 — aceita o host local %s", (host) => {
    expect(() => garantirHostLocal(host)).not.toThrow();
  });

  it.each(["db.exemplo.supabase.co", "aws-0.pooler.supabase.com", "10.0.0.5", ""])(
    "CA-DADOS-01 — recusa o host não local %s",
    (host) => {
      expect(() => garantirHostLocal(host)).toThrow(ErroHostNaoLocal);
    },
  );

  it("CA-DADOS-01 — falha, sem ignorar a suíte, quando o Docker está indisponível", async () => {
    await expect(
      iniciarBancoReal(async () => {
        throw new Error("docker ausente");
      }),
    ).rejects.toThrow(ErroDockerIndisponivel);
  });

  it("CA-DADOS-01 — encerra o container quando o host não é local", async () => {
    let encerrado = false;

    await expect(
      iniciarBancoReal(async () => ({
        getHost: () => "db.exemplo.supabase.co",
        getMappedPort: () => 5432,
        stop: async () => {
          encerrado = true;
        },
      })),
    ).rejects.toThrow(ErroHostNaoLocal);

    expect(encerrado).toBe(true);
  });
});

describe("banco real descartável", () => {
  let banco: BancoReal;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://nao-usar:nao-usar@host-remoto.invalid:5432/remoto";
    process.env.DIRECT_URL = "postgresql://nao-usar:nao-usar@host-remoto.invalid:5432/remoto";
    banco = await iniciarBancoReal();
  }, TEMPO_DE_SUBIDA_MS);

  afterAll(async () => {
    await banco?.encerrar();
  }, TEMPO_DE_ENCERRAMENTO_MS);

  it("CA-DADOS-01 — remove as variáveis de banco herdadas e usa host local", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.DIRECT_URL).toBeUndefined();
    expect(() => garantirHostLocal(banco.host)).not.toThrow();
  });

  it("CA-DADOS-01 — aplica do zero a migration existente, com o papel dono", async () => {
    const url = await banco.criarBanco();

    const linhas = await comCliente(url, async (cliente) => {
      const { rows } = await cliente.query<{
        dono: string;
        rls: boolean;
        policies: string;
      }>(
        `SELECT pg_get_userbyid(c.relowner) AS dono,
                c.relrowsecurity AS rls,
                (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname) AS policies
           FROM pg_class c
          WHERE c.relname = 'saude_sistema'`,
      );
      return rows;
    });

    expect(linhas).toEqual([{ dono: PAPEL_DONO, rls: true, policies: "2" }]);
  });

  it("CA-DADOS-01 — o papel dono não é superusuário", async () => {
    const url = await banco.criarBanco();

    const superusuario = await comCliente(url, async (cliente) => {
      const { rows } = await cliente.query<{ rolsuper: boolean }>(
        "SELECT rolsuper FROM pg_roles WHERE rolname = current_user",
      );
      return rows[0]?.rolsuper;
    });

    expect(superusuario).toBe(false);
  });

  it("CA-DADOS-01 — não cria tabelas de domínio", async () => {
    const url = await banco.criarBanco();

    const tabelas = await comCliente(url, async (cliente) => {
      const { rows } = await cliente.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
      );
      return rows.map((linha) => linha.tablename);
    });

    expect(tabelas).toEqual(["saude_sistema"]);
  });

  it.each(["anon", "authenticated"])(
    "CA-DADOS-01 — o bootstrap deixa %s chegar à RLS, que nega leitura e escrita",
    async (papel) => {
      const url = await banco.criarBanco();

      await comCliente(url, async (cliente) => {
        await cliente.query(
          `INSERT INTO saude_sistema (tenant_id, componente)
           VALUES ('00000000-0000-4000-8000-000000000001', 'teste')`,
        );
        await cliente.query(`SET ROLE ${papel}`);

        const { rows } = await cliente.query("SELECT * FROM saude_sistema");
        expect(rows).toEqual([]);

        await expect(
          cliente.query(
            `INSERT INTO saude_sistema (tenant_id, componente)
             VALUES ('00000000-0000-4000-8000-000000000002', 'teste')`,
          ),
        ).rejects.toThrow(/row-level security/);
      });
    },
  );

  it("CA-DADOS-01 — cada banco copiado é isolado dos demais", async () => {
    const urlA = await banco.criarBanco();
    const urlB = await banco.criarBanco();

    await comCliente(urlA, (cliente) =>
      cliente.query(
        `INSERT INTO saude_sistema (tenant_id, componente)
         VALUES ('00000000-0000-4000-8000-000000000001', 'teste')`,
      ),
    );

    const contar = (url: string) =>
      comCliente(url, async (cliente) => {
        const { rows } = await cliente.query<{ total: string }>(
          "SELECT count(*) AS total FROM saude_sistema",
        );
        return rows[0]?.total;
      });

    expect(await contar(urlA)).toBe("1");
    expect(await contar(urlB)).toBe("0");
  });
});

describe("execução TypeScript", () => {
  it("CA-DADOS-26 — roda arquivo .ts com node, usando só dependências instaladas", () => {
    const sonda = fileURLToPath(new URL("./sonda-typescript.ts", import.meta.url));
    const raiz = fileURLToPath(new URL("../../", import.meta.url));

    const { status, stdout } = spawnSync(process.execPath, [sonda], {
      cwd: raiz,
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      timeout: 15_000,
    });

    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      prisma: true,
      adaptador: true,
      zod: true,
      relativo: "auxiliar",
    });
  });
});
