// @vitest-environment node
// T-SOLIC-04: `equipamentos.detalhar` por papel, sobre a carga inicial real e empréstimos gravados.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { esquemaDetalheEquipamento } from "@/lib/esquemas/equipamentos";
import { calcularDevolverAte } from "@/lib/prazos";
import { routerAplicacao } from "@/server/api/raiz";
import { MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO } from "@/server/api/routers/equipamentos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { detalharEquipamento } from "@/server/services/equipamentos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const URL_SUPABASE = "https://wdudlqacomnasnrxgbni.supabase.co";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR_A = "00000000-0000-4000-8000-000000000001";
const OPERACOES_A = "00000000-0000-4000-8000-000000000002";
const COLABORADOR_B = "00000000-0000-4000-8000-000000000003";
const OUTRO_COLABORADOR_A = "00000000-0000-4000-8000-000000000004";

const CAMPOS_SO_DE_OPERACOES = ["numeroSerie", "observacoes", "historico"] as const;

let banco: BancoReal;
let prisma: PrismaClient;
let tenantA: string;

function como(usuarioId: string | null) {
  const cliente = {
    auth: {
      getUser: async () => ({ data: { user: usuarioId ? { id: usuarioId } : null }, error: null }),
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
    tenantA = rows[0]?.id as string;
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role, nome_exibicao) VALUES
         ($1, $5, 'colaborador', NULL), ($2, $5, 'operacoes', 'Bruno Lima'),
         ($3, $6, 'colaborador', NULL), ($4, $5, 'colaborador', 'Ana Souza')`,
      [COLABORADOR_A, OPERACOES_A, COLABORADOR_B, OUTRO_COLABORADOR_A, tenantA, TENANT_B],
    );
    await cliente.query(
      `UPDATE equipamentos SET numero_serie = 'SN-0001', local = 'Sala 3',
              observacoes = 'Carregador na gaveta'
        WHERE tenant_id = $1 AND patrimonio = 'TI-0001'`,
      [tenantA],
    );
    await cliente.query(
      `UPDATE equipamentos SET local = '   ', numero_serie = '' WHERE tenant_id = $1 AND patrimonio = 'TI-0005'`,
      [tenantA],
    );
    await cliente.query(
      `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria, situacao) VALUES
         ($1, 'TI-9001', 'Monitor descartado', 'monitor', 'fora_de_uso'),
         ($2, 'TI-0001', 'Notebook do tenant B', 'notebook', 'ativo')`,
      [tenantA, TENANT_B],
    );
    // TI-0002: dois empréstimos encerrados. TI-0003: um aberto.
    await cliente.query(
      `INSERT INTO emprestimos
         (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
       SELECT $1, e.id, v.user_id::uuid, v.retirado::timestamptz, v.ate::date,
              v.devolvido::timestamptz, v.por::uuid
         FROM equipamentos e
         JOIN (VALUES
           ('TI-0002', $2, '2026-09-01T12:00:00Z', '2026-09-15', '2026-09-10T18:00:00Z', $3),
           ('TI-0002', $4, '2026-10-01T12:00:00Z', '2026-10-15', '2026-10-14T18:00:00Z', $3),
           ('TI-0003', $4, '2026-11-05T12:00:00Z', '2026-11-19', NULL, NULL)
         ) AS v(patrimonio, user_id, retirado, ate, devolvido, por)
           ON v.patrimonio = e.patrimonio
        WHERE e.tenant_id = $1`,
      [tenantA, COLABORADOR_A, OPERACOES_A, OUTRO_COLABORADOR_A],
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

const naoEncontrado = {
  code: "NOT_FOUND",
  message: MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO,
  cause: { motivo: "EQUIPAMENTO_NAO_ENCONTRADO" },
};

describe("equipamentos.detalhar", () => {
  it("RF-SOLIC-01 — devolve o detalhe do equipamento do tenant", async () => {
    const detalhe = await como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-0001" });

    expect(esquemaDetalheEquipamento.parse(detalhe)).toEqual(detalhe);
    expect(detalhe).toMatchObject({
      patrimonio: "TI-0001",
      local: "Sala 3",
      disponibilidade: { estado: "disponivel" },
      ultimaDevolucao: null,
    });
    expect(detalhe.imagemUrl).toMatch(
      /^https:\/\/wdudlqacomnasnrxgbni\.supabase\.co\/storage\/v1\/object\/public\/equipamentos\/TI-0001-/,
    );
    expect(detalhe.devolverAtePrevisto).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("CA-SOLIC-04 — usuário do tenant B não detalha item que só existe no tenant A", async () => {
    await expect(
      como(COLABORADOR_B).equipamentos.detalhar({ patrimonio: "TI-0005" }),
    ).rejects.toMatchObject(naoEncontrado);
  });

  it("CA-SOLIC-04 — o mesmo patrimônio devolve o item do próprio tenant", async () => {
    const doB = await como(COLABORADOR_B).equipamentos.detalhar({ patrimonio: "TI-0001" });
    const doA = await como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-0001" });

    expect(doB.nome).toBe("Notebook do tenant B");
    expect(doB.id).not.toBe(doA.id);
    expect(doB.local).toBeNull();
  });

  it("CA-SOLIC-04 — patrimônio inexistente não é encontrado", async () => {
    await expect(
      como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-9999" }),
    ).rejects.toMatchObject(naoEncontrado);
  });

  it("CA-SOLIC-08 — fora_de_uso responde NOT_FOUND para colaborador", async () => {
    await expect(
      como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-9001" }),
    ).rejects.toMatchObject(naoEncontrado);
  });

  it("CA-SOLIC-08 — fora_de_uso é detalhado para Operações", async () => {
    await expect(
      como(OPERACOES_A).equipamentos.detalhar({ patrimonio: "TI-9001" }),
    ).resolves.toMatchObject({ disponibilidade: { estado: "fora_de_uso" } });
  });

  it("CA-SOLIC-09 — colaborador não recebe numeroSerie, observacoes nem historico", async () => {
    for (const patrimonio of ["TI-0001", "TI-0002"]) {
      const detalhe = await como(COLABORADOR_A).equipamentos.detalhar({ patrimonio });

      for (const campo of CAMPOS_SO_DE_OPERACOES) expect(detalhe).not.toHaveProperty(campo);
      expect(JSON.stringify(detalhe)).not.toMatch(/SN-0001|Carregador|Bruno|Ana Souza/);
    }
  });

  it("CA-SOLIC-09 — Operações recebe numeroSerie, observacoes e historico", async () => {
    const detalhe = await como(OPERACOES_A).equipamentos.detalhar({ patrimonio: "TI-0001" });

    expect(detalhe).toMatchObject({
      numeroSerie: "SN-0001",
      observacoes: "Carregador na gaveta",
      historico: [],
    });
  });

  it("RS-SOLIC-05 — o histórico de Operações traz os empréstimos com o nome de quem pegou", async () => {
    const detalhe = await como(OPERACOES_A).equipamentos.detalhar({ patrimonio: "TI-0002" });

    expect(detalhe.historico).toEqual([
      {
        retiradoEm: new Date("2026-10-01T12:00:00Z"),
        devolverAte: "2026-10-15",
        devolvidoEm: new Date("2026-10-14T18:00:00Z"),
        tomadorNome: "Ana Souza",
      },
      {
        retiradoEm: new Date("2026-09-01T12:00:00Z"),
        devolverAte: "2026-09-15",
        devolvidoEm: new Date("2026-09-10T18:00:00Z"),
        tomadorNome: null,
      },
    ]);
    expect(detalhe.ultimaDevolucao).toEqual(new Date("2026-10-14T18:00:00Z"));
    expect(JSON.stringify(detalhe)).not.toContain(COLABORADOR_A);
  });

  it("RF-SOLIC-01 — a última devolução também aparece para colaborador", async () => {
    await expect(
      como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-0002" }),
    ).resolves.toMatchObject({ ultimaDevolucao: new Date("2026-10-14T18:00:00Z") });
  });

  it("RF-SOLIC-04 — item com empréstimo aberto aparece emprestado, com a data de devolução", async () => {
    await expect(
      como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-0003" }),
    ).resolves.toMatchObject({
      disponibilidade: { estado: "emprestado", devolverAte: "2026-11-19" },
    });
  });

  it("RN-CATALOGO-02 — item em manutenção aparece em manutenção", async () => {
    await expect(
      como(COLABORADOR_A).equipamentos.detalhar({ patrimonio: "TI-0004" }),
    ).resolves.toMatchObject({ disponibilidade: { estado: "manutencao" } });
  });

  it("RF-SOLIC-05 — campo opcional só com espaço em branco volta nulo", async () => {
    const detalhe = await como(OPERACOES_A).equipamentos.detalhar({ patrimonio: "TI-0005" });

    expect(detalhe).toMatchObject({ local: null, numeroSerie: null, observacoes: null });
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", "00000000-0000-4000-8000-0000000000ff", "FORBIDDEN"],
  ])("RS-SOLIC-01 — %s o procedimento recusa", async (_caso, usuario, code) => {
    await expect(
      como(usuario).equipamentos.detalhar({ patrimonio: "TI-0001" }),
    ).rejects.toMatchObject({ code });
  });

  it("CA-SOLIC-10 — devolverAtePrevisto usa o relógio injetado, com datas fixas", async () => {
    for (const [agora, esperado] of [
      ["2026-11-11T15:00:00Z", "2026-11-25"],
      ["2026-11-12T02:00:00Z", "2026-11-25"],
      ["2026-12-25T15:00:00Z", "2027-01-08"],
    ] as const) {
      const detalhe = await detalharEquipamento(
        prisma,
        { tenantId: tenantA, papel: "colaborador" },
        "TI-0001",
        { urlSupabase: URL_SUPABASE, agora: new Date(agora) },
      );

      expect(detalhe.devolverAtePrevisto).toBe(esperado);
      expect(detalhe.devolverAtePrevisto).toBe(calcularDevolverAte(new Date(agora)));
    }
  });
});
