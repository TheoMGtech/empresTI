// @vitest-environment node
// T-DEVOL-03: `emprestimos.meus` e `emprestimos.historico`, com Postgres real e datas fixas.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { esquemaSaidaHistorico, esquemaSaidaMeusEmprestimos } from "@/lib/esquemas/emprestimos";
import { routerAplicacao } from "@/server/api/raiz";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { listarHistorico, listarMeusEmprestimos } from "@/server/services/emprestimos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const URL_SUPABASE = "https://wdudlqacomnasnrxgbni.supabase.co";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const PESSOA = "00000000-0000-4000-8000-000000000001";
const OUTRA_PESSOA = "00000000-0000-4000-8000-000000000002";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const PESSOA_B = "00000000-0000-4000-8000-000000000004";

let banco: BancoReal;
let prisma: PrismaClient;
let cliente: Client;
let tenantA: string;
const ids: Record<string, string> = {};

function como(usuarioId: string | null) {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: usuarioId ? { id: usuarioId } : null }, error: null }),
    },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
}

async function gravar(
  rotulo: string,
  dados: {
    tenant?: string;
    patrimonio: string;
    usuario: string;
    retirado: string;
    devolverAte: string;
    devolvido?: string;
  },
) {
  const { rows } = await cliente.query<{ id: string }>(
    `INSERT INTO emprestimos
       (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
     SELECT tenant_id, id, $2, $3::timestamptz, $4::date, $5::timestamptz, $6
       FROM equipamentos WHERE tenant_id = $7 AND patrimonio = $1
     RETURNING id`,
    [
      dados.patrimonio,
      dados.usuario,
      dados.retirado,
      dados.devolverAte,
      dados.devolvido ?? null,
      dados.devolvido ? OPERACOES : null,
      dados.tenant ?? tenantA,
    ],
  );
  ids[rotulo] = rows[0]?.id as string;
}

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
    `INSERT INTO memberships (user_id, tenant_id, role) VALUES
       ($1, $5, 'colaborador'), ($2, $5, 'colaborador'), ($3, $5, 'operacoes'),
       ($4, $6, 'colaborador')`,
    [PESSOA, OUTRA_PESSOA, OPERACOES, PESSOA_B, tenantA, TENANT_B],
  );

  // Abertos da pessoa: TI-0002 vence antes de TI-0001.
  await gravar("aberto1", {
    patrimonio: "TI-0001",
    usuario: PESSOA,
    retirado: "2026-11-11T15:00:00Z",
    devolverAte: "2026-11-25",
  });
  await gravar("aberto2", {
    patrimonio: "TI-0002",
    usuario: PESSOA,
    retirado: "2026-11-06T15:00:00Z",
    devolverAte: "2026-11-20",
  });
  // Encerrados da pessoa, nas bordas do dia em São Paulo.
  await gravar("noUltimoMinuto", {
    patrimonio: "TI-0005",
    usuario: PESSOA,
    retirado: "2026-09-01T15:00:00Z",
    devolverAte: "2026-09-15",
    devolvido: "2026-09-16T02:59:00Z", // 23:59 de 15/09 em São Paulo
  });
  await gravar("umMinutoDepois", {
    patrimonio: "TI-0006",
    usuario: PESSOA,
    retirado: "2026-10-01T15:00:00Z",
    devolverAte: "2026-10-15",
    devolvido: "2026-10-16T03:00:00Z", // 00:00 de 16/10 em São Paulo
  });
  await gravar("antecipado", {
    patrimonio: "TI-0008",
    usuario: PESSOA,
    retirado: "2026-10-20T15:00:00Z",
    devolverAte: "2026-11-03",
    devolvido: "2026-11-01T15:00:00Z",
  });
  // Outras pessoas.
  await gravar("daOutraPessoa", {
    patrimonio: "TI-0003",
    usuario: OUTRA_PESSOA,
    retirado: "2026-11-10T15:00:00Z",
    devolverAte: "2026-11-24",
  });
  await gravar("encerradoDaOutraPessoa", {
    patrimonio: "TI-0009",
    usuario: OUTRA_PESSOA,
    retirado: "2026-08-01T15:00:00Z",
    devolverAte: "2026-08-15",
    devolvido: "2026-08-10T15:00:00Z",
  });
  await gravar("doTenantB", {
    tenant: TENANT_B,
    patrimonio: "TB-0001",
    usuario: PESSOA_B,
    retirado: "2026-11-10T15:00:00Z",
    devolverAte: "2026-11-24",
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

describe("emprestimos.meus", () => {
  it("CA-DEVOL-01 — traz só os empréstimos em aberto da própria pessoa, do vencimento mais próximo", async () => {
    const meus = await como(PESSOA).emprestimos.meus();

    expect(esquemaSaidaMeusEmprestimos.parse(meus)).toEqual(meus);
    expect(meus.map((e) => e.id)).toEqual([ids.aberto2, ids.aberto1]);
    expect(meus[0]).toMatchObject({
      equipamento: { patrimonio: "TI-0002", categoria: expect.any(String) },
      retiradoEm: new Date("2026-11-06T15:00:00Z"),
      devolverAte: "2026-11-20",
    });
    expect(meus[0]?.equipamento.imagemUrl).toMatch(/\/storage\/v1\/object\/public\/equipamentos\//);
  });

  it("RS-DEVOL-02 — não traz empréstimo de outra pessoa", async () => {
    const meus = await como(OUTRA_PESSOA).emprestimos.meus();

    expect(meus.map((e) => e.id)).toEqual([ids.daOutraPessoa]);
    await expect(como(OPERACOES).emprestimos.meus()).resolves.toEqual([]);
  });

  it.each([
    ["no último segundo do dia de vencimento", "2026-11-21T02:59:59Z", false],
    ["no primeiro segundo do dia seguinte", "2026-11-21T03:00:00Z", true],
  ])("CA-DEVOL-06 — emAtraso %s, em São Paulo", async (_caso, agora, atrasado) => {
    const meus = await listarMeusEmprestimos(
      prisma,
      { tenantId: tenantA, usuarioId: PESSOA },
      { agora: new Date(agora), urlSupabase: URL_SUPABASE },
    );

    expect(meus.map((e) => [e.equipamento.patrimonio, e.emAtraso])).toEqual([
      ["TI-0002", atrasado],
      ["TI-0001", false],
    ]);
  });
});

describe("emprestimos.historico", () => {
  it("CA-DEVOL-06 — marca no prazo e em atraso nas bordas do dia, do mais recente ao mais antigo", async () => {
    const historico = await como(PESSOA).emprestimos.historico({});

    expect(esquemaSaidaHistorico.parse(historico)).toEqual(historico);
    expect(historico.itens.map((e) => [e.id, e.noPrazo])).toEqual([
      [ids.antecipado, true],
      [ids.umMinutoDepois, false],
      [ids.noUltimoMinuto, true],
    ]);
    expect(historico.proximoCursor).toBeNull();
  });

  it("RF-DEVOL-02 — a paginação por cursor não duplica nem perde itens", async () => {
    const vistos: string[] = [];
    let cursor: string | undefined;
    let paginas = 0;
    do {
      const pagina = await como(PESSOA).emprestimos.historico({ limite: 1, cursor });
      vistos.push(...pagina.itens.map((e) => e.id));
      cursor = pagina.proximoCursor ?? undefined;
      paginas += 1;
    } while (cursor && paginas < 10);

    expect(vistos).toEqual([ids.antecipado, ids.umMinutoDepois, ids.noUltimoMinuto]);
    expect(paginas).toBe(3);
  });

  it("RS-DEVOL-02 — cursor de outra pessoa não revela nada", async () => {
    await expect(
      como(PESSOA).emprestimos.historico({ cursor: ids.encerradoDaOutraPessoa }),
    ).resolves.toEqual({ itens: [], proximoCursor: null });
  });

  it("RS-DEVOL-02 — o histórico não traz empréstimo de outra pessoa nem os abertos", async () => {
    const daOutra = await como(OUTRA_PESSOA).emprestimos.historico({});
    const minhas = await como(PESSOA).emprestimos.historico({});

    expect(daOutra.itens.map((e) => e.id)).toEqual([ids.encerradoDaOutraPessoa]);
    expect(minhas.itens.map((e) => e.id)).not.toContain(ids.aberto1);
  });

  it("CA-DEVOL-06 — noPrazo com datas fixas pelo serviço", async () => {
    const historico = await listarHistorico(
      prisma,
      { tenantId: tenantA, usuarioId: PESSOA },
      {},
      { urlSupabase: URL_SUPABASE },
    );

    expect(
      historico.itens.map((e) => [e.devolverAte, e.devolvidoEm.toISOString(), e.noPrazo]),
    ).toEqual([
      ["2026-11-03", "2026-11-01T15:00:00.000Z", true],
      ["2026-10-15", "2026-10-16T03:00:00.000Z", false],
      ["2026-09-15", "2026-09-16T02:59:00.000Z", true],
    ]);
  });
});

describe("isolamento e fluxo", () => {
  it("CA-DEVOL-05 — usuário do tenant B só vê o próprio tenant, em meus e no histórico", async () => {
    const meus = await como(PESSOA_B).emprestimos.meus();
    const historico = await como(PESSOA_B).emprestimos.historico({});

    expect(meus.map((e) => e.id)).toEqual([ids.doTenantB]);
    expect(historico.itens).toEqual([]);
    await expect(como(PESSOA_B).emprestimos.historico({ cursor: ids.antecipado })).resolves.toEqual(
      { itens: [], proximoCursor: null },
    );
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", "00000000-0000-4000-8000-0000000000ff", "FORBIDDEN"],
  ])("RS-DEVOL-01 — %s, meus e historico recusam", async (_caso, usuario, code) => {
    await expect(como(usuario).emprestimos.meus()).rejects.toMatchObject({ code });
    await expect(como(usuario).emprestimos.historico({})).rejects.toMatchObject({ code });
  });

  it("CA-DEVOL-02 — depois de devolver, o empréstimo sai de meus e entra no histórico", async () => {
    const caller = como(OUTRA_PESSOA);
    await caller.emprestimos.devolver({ emprestimoId: ids.daOutraPessoa as string });

    await expect(caller.emprestimos.meus()).resolves.toEqual([]);
    const { itens } = await caller.emprestimos.historico({});
    expect(itens[0]).toMatchObject({ id: ids.daOutraPessoa, devolvidoEm: expect.any(Date) });
  });
});
