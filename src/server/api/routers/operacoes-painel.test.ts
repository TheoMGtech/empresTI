// @vitest-environment node
// T-OPER-02: lista de empréstimos em aberto, resumo e últimos cadastros, com Postgres real e
// datas fixas nas bordas das janelas de D-OPER-05.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  esquemaSaidaEmprestimosEmAberto,
  type EntradaEmprestimosEmAberto,
} from "@/lib/esquemas/operacoes";
import { routerAplicacao } from "@/server/api/raiz";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  consultarResumoOperacoes,
  listarEmprestimosEmAberto,
  listarUltimosCadastros,
} from "@/server/services/operacoes";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const URL_SUPABASE = "https://wdudlqacomnasnrxgbni.supabase.co";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const ANA = "00000000-0000-4000-8000-000000000001";
const BRUNO = "00000000-0000-4000-8000-000000000002";
const CARLA = "00000000-0000-4000-8000-000000000005";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const OPERACOES_B = "00000000-0000-4000-8000-000000000004";

// "Hoje" é 20/11/2026 em São Paulo.
const HOJE_A_TARDE = new Date("2026-11-20T15:00:00Z");
const HOJE_NO_ULTIMO_SEGUNDO = new Date("2026-11-21T02:59:59Z");
const AMANHA_NO_PRIMEIRO_SEGUNDO = new Date("2026-11-21T03:00:00Z");

let banco: BancoReal;
let prisma: PrismaClient;
let cliente: Client;
let tenantA: string;
const ids: Record<string, string> = {};

function como(usuarioId: string) {
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: usuarioId } }, error: null }) },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
}

async function gravar(
  rotulo: string,
  dados: {
    patrimonio: string;
    usuario: string;
    devolverAte: string;
    devolvido?: boolean;
    tenant?: string;
  },
) {
  const { rows } = await cliente.query<{ id: string }>(
    `INSERT INTO emprestimos
       (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
     SELECT tenant_id, id, $2, '2026-11-01T12:00:00Z', $3::date, $4::timestamptz, $5
       FROM equipamentos WHERE tenant_id = $6 AND patrimonio = $1
     RETURNING id`,
    [
      dados.patrimonio,
      dados.usuario,
      dados.devolverAte,
      dados.devolvido ? "2026-11-10T12:00:00Z" : null,
      dados.devolvido ? OPERACOES : null,
      dados.tenant ?? tenantA,
    ],
  );
  ids[rotulo] = rows[0]?.id as string;
}

const listar = (entrada: EntradaEmprestimosEmAberto = {}, agora = HOJE_A_TARDE) =>
  listarEmprestimosEmAberto(prisma, tenantA, entrada, { agora, urlSupabase: URL_SUPABASE });

beforeAll(async () => {
  banco = await iniciarBancoReal();
  const url = await banco.criarBanco();
  prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  await executarCargaDoManifesto(prisma);
  cliente = new Client({ connectionString: url });
  await cliente.connect();

  const { rows } = await cliente.query<{ id: string }>(
    "SELECT id FROM tenants WHERE slug = 'suporte_ti'",
  );
  tenantA = rows[0]?.id as string;
  await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
  await cliente.query(
    `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria) VALUES
       ($1, 'TB-0001', 'Câmera do tenant B', 'camera')`,
    [TENANT_B],
  );
  await cliente.query(
    `INSERT INTO memberships (user_id, tenant_id, role, nome_exibicao) VALUES
       ($1, $6, 'colaborador', 'Ana Souza'), ($2, $6, 'colaborador', NULL),
       ($3, $6, 'colaborador', E'\t'), ($4, $6, 'operacoes', 'Op'), ($5, $7, 'operacoes', NULL)`,
    [ANA, BRUNO, CARLA, OPERACOES, OPERACOES_B, tenantA, TENANT_B],
  );

  await gravar("atrasado", { patrimonio: "TI-0001", usuario: ANA, devolverAte: "2026-11-19" });
  await gravar("venceHoje", { patrimonio: "TI-0002", usuario: BRUNO, devolverAte: "2026-11-20" });
  await gravar("vence3", { patrimonio: "TI-0003", usuario: CARLA, devolverAte: "2026-11-23" });
  await gravar("vence4", { patrimonio: "TI-0005", usuario: ANA, devolverAte: "2026-11-24" });
  await gravar("vence7", { patrimonio: "TI-0006", usuario: BRUNO, devolverAte: "2026-11-27" });
  await gravar("vence8", { patrimonio: "TI-0008", usuario: CARLA, devolverAte: "2026-11-28" });
  await gravar("encerrado", {
    patrimonio: "TI-0009",
    usuario: ANA,
    devolverAte: "2026-11-21",
    devolvido: true,
  });
  await gravar("doTenantB", {
    tenant: TENANT_B,
    patrimonio: "TB-0001",
    usuario: OPERACOES_B,
    devolverAte: "2026-11-21",
  });
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await cliente?.end();
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

describe("operacoes.emprestimosEmAberto", () => {
  it("CA-OPER-01 — traz todos os empréstimos em aberto do tenant, e nenhum de outro", async () => {
    const saida = await listar();

    expect(esquemaSaidaEmprestimosEmAberto.parse(saida)).toEqual(saida);
    expect(saida.itens.map((e) => e.id)).toEqual([
      ids.atrasado,
      ids.venceHoje,
      ids.vence3,
      ids.vence4,
      ids.vence7,
      ids.vence8,
    ]);
    expect(saida.itens.map((e) => e.id)).not.toContain(ids.encerrado);
    expect(saida.itens.map((e) => e.id)).not.toContain(ids.doTenantB);
  });

  it("RF-OPER-01 — traz o nome de exibição de quem está com o item, ou nulo", async () => {
    const { itens } = await listar();
    const nomes = Object.fromEntries(itens.map((e) => [e.id, e.pessoa.nomeExibicao]));

    expect(nomes[ids.atrasado as string]).toBe("Ana Souza");
    expect(nomes[ids.venceHoje as string]).toBeNull();
    expect(nomes[ids.vence3 as string]).toBeNull();
    expect(JSON.stringify(itens)).not.toMatch(new RegExp(`${ANA}|${BRUNO}|${CARLA}`));
  });

  it("RF-OPER-03 — linhas em atraso vêm marcadas", async () => {
    const { itens } = await listar();

    expect(itens.map((e) => e.emAtraso)).toEqual([true, false, false, false, false, false]);
  });

  it("RF-OPER-03 — o chip Em atraso traz só os atrasados", async () => {
    await expect(listar({ filtro: "em_atraso" })).resolves.toMatchObject({
      itens: [{ id: ids.atrasado, emAtraso: true }],
      proximoCursor: null,
    });
  });

  it("CA-OPER-11 — Vencem esta semana vai de hoje até hoje + 7, inclusive, sem atrasados", async () => {
    const { itens } = await listar({ filtro: "vencem_7_dias" });

    expect(itens.map((e) => e.devolverAte)).toEqual([
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
      "2026-11-27",
    ]);
  });

  it.each([
    [
      "no último segundo de hoje",
      HOJE_NO_ULTIMO_SEGUNDO,
      ["2026-11-20", "2026-11-23", "2026-11-24", "2026-11-27"],
    ],
    [
      "no primeiro segundo de amanhã",
      AMANHA_NO_PRIMEIRO_SEGUNDO,
      ["2026-11-23", "2026-11-24", "2026-11-27", "2026-11-28"],
    ],
  ])("CA-OPER-11 — a janela de 7 dias se move %s, em São Paulo", async (_caso, agora, esperado) => {
    const { itens } = await listar({ filtro: "vencem_7_dias" }, agora);

    expect(itens.map((e) => e.devolverAte)).toEqual(esperado);
  });

  it("RF-OPER-03 — o chip de categoria filtra pelo equipamento, e combina com o filtro", async () => {
    const { rows } = await cliente.query<{ categoria: string }>(
      "SELECT categoria::text FROM equipamentos WHERE tenant_id = $1 AND patrimonio = 'TI-0001'",
      [tenantA],
    );
    const categoria = rows[0]?.categoria as "notebook";
    const todos = (await listar()).itens;

    const filtrados = await listar({ categoria });
    expect(filtrados.itens).toEqual(todos.filter((e) => e.equipamento.categoria === categoria));
    expect(filtrados.itens.length).toBeGreaterThan(0);

    const combinados = await listar({ categoria, filtro: "em_atraso" });
    expect(combinados.itens.map((e) => e.id)).toEqual([ids.atrasado]);
  });

  it("RF-OPER-01 — a paginação por cursor não duplica nem perde itens", async () => {
    const vistos: string[] = [];
    let cursor: string | undefined;
    let paginas = 0;
    do {
      const pagina = await listar({ limite: 2, cursor });
      vistos.push(...pagina.itens.map((e) => e.id));
      cursor = pagina.proximoCursor ?? undefined;
      paginas += 1;
    } while (cursor && paginas < 10);

    expect(vistos).toEqual((await listar()).itens.map((e) => e.id));
    expect(paginas).toBe(3);
  });

  it("RS-OPER-01 — cursor fora do recorte devolve página vazia", async () => {
    await expect(listar({ cursor: ids.encerrado })).resolves.toEqual({
      itens: [],
      proximoCursor: null,
    });
    await expect(listar({ cursor: ids.doTenantB })).resolves.toEqual({
      itens: [],
      proximoCursor: null,
    });
  });

  it("CA-OPER-01 — pelo procedimento, Operações do tenant B vê só o próprio tenant", async () => {
    const { itens } = await como(OPERACOES_B).operacoes.emprestimosEmAberto({});

    expect(itens.map((e) => e.id)).toEqual([ids.doTenantB]);
  });
});

describe("operacoes.resumo", () => {
  it("CA-OPER-02 — os cards batem com os dados, com data fixa", async () => {
    await expect(
      consultarResumoOperacoes(prisma, tenantA, { agora: HOJE_A_TARDE }),
    ).resolves.toEqual({ emAberto: 6, vencendoEm3Dias: 2, emAtraso: 1, emManutencao: 2 });
  });

  it.each([
    ["no último segundo de hoje", HOJE_NO_ULTIMO_SEGUNDO, { vencendoEm3Dias: 2, emAtraso: 1 }],
    [
      "no primeiro segundo de amanhã",
      AMANHA_NO_PRIMEIRO_SEGUNDO,
      { vencendoEm3Dias: 2, emAtraso: 2 },
    ],
  ])(
    "CA-OPER-02 — as janelas do resumo se movem %s, em São Paulo",
    async (_caso, agora, esperado) => {
      await expect(consultarResumoOperacoes(prisma, tenantA, { agora })).resolves.toMatchObject({
        emAberto: 6,
        ...esperado,
      });
    },
  );

  it("CA-OPER-02 — Vencendo em 3 dias inclui hoje e hoje + 3, e exclui hoje + 4", async () => {
    // Em 20/11: 20/11 (hoje) e 23/11 (hoje + 3) entram; 24/11 (hoje + 4) fica fora.
    const naJanela = (await listar()).itens
      .filter((e) => e.devolverAte >= "2026-11-20" && e.devolverAte <= "2026-11-23")
      .map((e) => e.devolverAte);

    expect(naJanela).toEqual(["2026-11-20", "2026-11-23"]);
    await expect(
      consultarResumoOperacoes(prisma, tenantA, { agora: HOJE_A_TARDE }),
    ).resolves.toMatchObject({ vencendoEm3Dias: naJanela.length });
  });

  it("CA-OPER-02 — o resumo do tenant B não soma dados do tenant A", async () => {
    await expect(como(OPERACOES_B).operacoes.resumo()).resolves.toMatchObject({
      emAberto: 1,
      emManutencao: 0,
    });
  });
});

describe("operacoes.ultimosCadastros", () => {
  it("CA-OPER-10 — traz os 3 cadastros mais recentes do tenant", async () => {
    const operacoes = como(OPERACOES);
    for (const patrimonio of ["TI-0101", "TI-0102", "TI-0103", "TI-0104"]) {
      await operacoes.equipamentos.cadastrar({
        nome: `Cabo ${patrimonio}`,
        categoria: "cabo",
        patrimonio,
        situacao: "ativo",
      });
    }
    await como(OPERACOES_B).equipamentos.cadastrar({
      nome: "Do tenant B",
      categoria: "cabo",
      patrimonio: "TI-0105",
      situacao: "ativo",
    });

    const ultimos = await operacoes.operacoes.ultimosCadastros();
    expect(ultimos.map((e) => e.patrimonio)).toEqual(["TI-0104", "TI-0103", "TI-0102"]);
    expect(ultimos[0]).toEqual({
      patrimonio: "TI-0104",
      nome: "Cabo TI-0104",
      criadoEm: expect.any(Date),
    });
    await expect(listarUltimosCadastros(prisma, TENANT_B)).resolves.toMatchObject([
      { patrimonio: "TI-0105" },
      { patrimonio: "TB-0001" },
    ]);
  });
});

describe("autorização", () => {
  it.each([
    ["operacoes.emprestimosEmAberto", () => como(ANA).operacoes.emprestimosEmAberto({})],
    ["operacoes.resumo", () => como(ANA).operacoes.resumo()],
    ["operacoes.ultimosCadastros", () => como(ANA).operacoes.ultimosCadastros()],
  ])("CA-OPER-04 — colaborador recebe FORBIDDEN em %s", async (_nome, chamar) => {
    await expect(chamar()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
    });
  });
});
