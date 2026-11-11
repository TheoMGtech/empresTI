// @vitest-environment node
// T-CATALOGO-02: listagem por tenant, com visibilidade por papel, sobre a carga inicial real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { esquemaSaidaListarEquipamentos } from "@/lib/esquemas/equipamentos";
import { routerAplicacao } from "@/server/api/raiz";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { montarUrlImagem } from "@/server/services/equipamentos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const URL_SUPABASE = "https://wdudlqacomnasnrxgbni.supabase.co";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR_A = "00000000-0000-4000-8000-000000000001";
const OPERACOES_A = "00000000-0000-4000-8000-000000000002";
const COLABORADOR_B = "00000000-0000-4000-8000-000000000003";
const SEM_VINCULO = "00000000-0000-4000-8000-000000000004";

const PATRIMONIOS_DA_CARGA = Array.from(
  { length: 12 },
  (_, indice) => `TI-${String(indice + 1).padStart(4, "0")}`,
);

let banco: BancoReal;
let prisma: PrismaClient;

function como(usuarioId: string | null) {
  const cliente = {
    auth: {
      getUser: async () => ({
        data: { user: usuarioId ? { id: usuarioId } : null },
        error: null,
      }),
    },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => cliente,
  });
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
  const url = await banco.criarBanco();
  prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  await executarCargaDoManifesto(prisma);

  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    const { rows } = await cliente.query<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = 'suporte_ti'",
    );
    const tenantA = rows[0]?.id;
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
    await cliente.query(
      `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria, situacao) VALUES
         ($1, 'TI-9001', 'Monitor descartado', 'monitor', 'fora_de_uso'),
         ($2, 'TI-0001', 'Notebook do tenant B', 'notebook', 'ativo'),
         ($2, 'TB-0001', 'Câmera do tenant B', 'camera', 'ativo')`,
      [tenantA, TENANT_B],
    );
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $4, 'operacoes'), ($3, $5, 'colaborador')`,
      [COLABORADOR_A, OPERACOES_A, COLABORADOR_B, tenantA, TENANT_B],
    );
  } finally {
    await cliente.end();
  }
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await prisma?.$disconnect();
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_SUPABASE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("equipamentos.listar", () => {
  it("CA-CATALOGO-01 — com a carga inicial, a lista traz os 12 equipamentos", async () => {
    const saida = await como(COLABORADOR_A).equipamentos.listar({});

    expect(saida.itens.map((item) => item.patrimonio)).toEqual(PATRIMONIOS_DA_CARGA);
    expect(saida.resumo).toEqual({ total: 12, disponiveis: 10 });
    expect(saida.proximoCursor).toBeNull();
  });

  it("CA-CATALOGO-02 — usuário do tenant A não recebe equipamento do tenant B", async () => {
    const saida = await como(COLABORADOR_A).equipamentos.listar({});

    expect(saida.itens.map((item) => item.nome)).not.toContain("Notebook do tenant B");
    expect(saida.itens.map((item) => item.patrimonio)).not.toContain("TB-0001");
  });

  it("CA-CATALOGO-02 — usuário do tenant B recebe só o próprio tenant", async () => {
    const saida = await como(COLABORADOR_B).equipamentos.listar({});

    expect(saida.itens.map((item) => [item.patrimonio, item.nome])).toEqual([
      ["TB-0001", "Câmera do tenant B"],
      ["TI-0001", "Notebook do tenant B"],
    ]);
    expect(saida.resumo).toEqual({ total: 2, disponiveis: 2 });
  });

  it("RS-CATALOGO-01 — tenantId no input não muda o tenant", async () => {
    const entrada = { tenantId: TENANT_B } as Record<string, unknown>;
    const saida = await como(COLABORADOR_A).equipamentos.listar(entrada);

    expect(saida.itens.map((item) => item.patrimonio)).toEqual(PATRIMONIOS_DA_CARGA);
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", SEM_VINCULO, "FORBIDDEN"],
  ])("CA-CATALOGO-03 — %s o procedimento recusa", async (_caso, usuario, code) => {
    await expect(como(usuario).equipamentos.listar({})).rejects.toMatchObject({ code });
  });

  it("CA-CATALOGO-04 — TI-0004 e TI-0007 aparecem em manutenção, nunca como disponíveis", async () => {
    const { itens } = await como(COLABORADOR_A).equipamentos.listar({});
    const porPatrimonio = new Map(itens.map((item) => [item.patrimonio, item.disponibilidade]));

    expect(porPatrimonio.get("TI-0004")).toEqual({ estado: "manutencao" });
    expect(porPatrimonio.get("TI-0007")).toEqual({ estado: "manutencao" });
    expect(
      itens.filter((item) => item.disponibilidade.estado === "manutencao").map((i) => i.patrimonio),
    ).toEqual(["TI-0004", "TI-0007"]);
    expect(itens.filter((item) => item.disponibilidade.estado === "disponivel")).toHaveLength(10);
  });

  it("CA-CATALOGO-09 — fora_de_uso não aparece para colaborador", async () => {
    const saida = await como(COLABORADOR_A).equipamentos.listar({});

    expect(saida.itens.map((item) => item.patrimonio)).not.toContain("TI-9001");
    expect(saida.itens.some((item) => item.disponibilidade.estado === "fora_de_uso")).toBe(false);
  });

  it("CA-CATALOGO-09 — fora_de_uso aparece para operacoes, também no resumo", async () => {
    const saida = await como(OPERACOES_A).equipamentos.listar({});

    expect(saida.itens.map((item) => item.patrimonio)).toEqual([
      ...PATRIMONIOS_DA_CARGA,
      "TI-9001",
    ]);
    expect(saida.itens.at(-1)?.disponibilidade).toEqual({ estado: "fora_de_uso" });
    expect(saida.resumo).toEqual({ total: 13, disponiveis: 10 });
  });

  it("CA-CATALOGO-10 — a saída não contém nome do tomador, para nenhum papel", async () => {
    for (const usuario of [COLABORADOR_A, OPERACOES_A]) {
      const saida = await como(usuario).equipamentos.listar({});

      expect(esquemaSaidaListarEquipamentos.parse(saida)).toEqual(saida);
      for (const item of saida.itens) {
        expect(Object.keys(item).sort()).toEqual([
          "categoria",
          "disponibilidade",
          "imagemUrl",
          "nome",
          "patrimonio",
        ]);
      }
      expect(JSON.stringify(saida)).not.toMatch(/tomador|usuario|user_id|userId|tenant/i);
    }
  });

  it("RF-CATALOGO-02 — a URL da fotografia vem do caminho gravado", async () => {
    const { itens } = await como(COLABORADOR_A).equipamentos.listar({});

    for (const item of itens) {
      expect(item.imagemUrl).toMatch(
        new RegExp(
          `^${URL_SUPABASE}/storage/v1/object/public/equipamentos/${item.patrimonio}-[0-9a-f]{8}\\.jpg$`,
        ),
      );
    }
  });

  it("RF-CATALOGO-03 — equipamento sem fotografia volta com imagemUrl nulo", async () => {
    const { itens } = await como(COLABORADOR_B).equipamentos.listar({});

    expect(itens.every((item) => item.imagemUrl === null)).toBe(true);
  });
});

describe("montarUrlImagem", () => {
  it("RF-CATALOGO-02 — monta a URL pública do Storage", () => {
    expect(montarUrlImagem(`${URL_SUPABASE}/`, "equipamentos/TI-0001-40794e08.jpg")).toBe(
      `${URL_SUPABASE}/storage/v1/object/public/equipamentos/TI-0001-40794e08.jpg`,
    );
  });

  it("RF-CATALOGO-03 — sem caminho, não há URL", () => {
    expect(montarUrlImagem(URL_SUPABASE, null)).toBeNull();
  });
});
