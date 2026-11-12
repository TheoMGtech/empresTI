// @vitest-environment node
// T-SESSAO-03: coluna `memberships.nome_exibicao` (D-SESSAO-02), provada em Postgres real.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const VIOLACAO_CHECK = "23514";
const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";

let banco: BancoReal;

async function comBanco<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_a')", [TENANT]);
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

const criarMembership = (cliente: Client, nome?: string | null) =>
  nome === undefined
    ? cliente.query(
        "INSERT INTO memberships (user_id, tenant_id, role) VALUES ($1, $2, 'colaborador')",
        [USUARIO, TENANT],
      )
    : cliente.query(
        `INSERT INTO memberships (user_id, tenant_id, role, nome_exibicao)
         VALUES ($1, $2, 'colaborador', $3)`,
        [USUARIO, TENANT, nome],
      );

const lerNome = async (cliente: Client) => {
  const { rows } = await cliente.query<{ nome_exibicao: string | null }>(
    "SELECT nome_exibicao FROM memberships WHERE user_id = $1",
    [USUARIO],
  );
  return rows[0]?.nome_exibicao;
};

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("memberships.nome_exibicao", () => {
  it("CA-SESSAO-14 — a coluna é texto opcional, sem valor padrão", async () => {
    await comBanco(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT data_type, is_nullable, column_default FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'memberships'
            AND column_name = 'nome_exibicao'`,
      );

      expect(rows).toEqual([{ data_type: "text", is_nullable: "YES", column_default: null }]);
    });
  });

  it("CA-SESSAO-05 — membership sem nome fica com NULL", async () => {
    await comBanco(async (cliente) => {
      await criarMembership(cliente);
      expect(await lerNome(cliente)).toBeNull();
    });
  });

  it("CA-SESSAO-05 — aceita NULL explícito", async () => {
    await comBanco(async (cliente) => {
      await criarMembership(cliente, null);
      expect(await lerNome(cliente)).toBeNull();
    });
  });

  it("CA-SESSAO-05 — grava o nome de exibição informado", async () => {
    await comBanco(async (cliente) => {
      await criarMembership(cliente, "Ana Souza");
      expect(await lerNome(cliente)).toBe("Ana Souza");
    });
  });

  it.each([
    ["vazio", ""],
    ["só espaços", "   "],
  ])("CA-SESSAO-14 — recusa nome %s", async (_caso, nome) => {
    await comBanco(async (cliente) => {
      await expect(criarMembership(cliente, nome)).rejects.toMatchObject({
        code: VIOLACAO_CHECK,
        constraint: "memberships_nome_exibicao_nao_vazio",
      });
    });
  });

  it("CA-SESSAO-14 — a atualização para texto vazio também é recusada", async () => {
    await comBanco(async (cliente) => {
      await criarMembership(cliente, "Ana Souza");

      await expect(
        cliente.query("UPDATE memberships SET nome_exibicao = ' ' WHERE user_id = $1", [USUARIO]),
      ).rejects.toMatchObject({ code: VIOLACAO_CHECK });
    });
  });
});
