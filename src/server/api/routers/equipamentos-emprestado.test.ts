// @vitest-environment node
// T-SOLIC-06: a listagem do catálogo reflete empréstimos abertos (RF-SOLIC-04), sem expor o tomador
// (CA-CATALOGO-10).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { esquemaSaidaListarEquipamentos } from "@/lib/esquemas/equipamentos";
import { routerAplicacao } from "@/server/api/raiz";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const COLABORADOR_A = "00000000-0000-4000-8000-000000000001";
const OPERACOES_A = "00000000-0000-4000-8000-000000000002";
const TOMADORA = "00000000-0000-4000-8000-000000000004";

let banco: BancoReal;
let prisma: PrismaClient;
let cliente: Client;
let tenantA: string;

function como(usuarioId: string) {
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: usuarioId } }, error: null }) },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
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
  await cliente.query(
    `INSERT INTO memberships (user_id, tenant_id, role, nome_exibicao) VALUES
       ($1, $4, 'colaborador', NULL), ($2, $4, 'operacoes', 'Bruno Lima'),
       ($3, $4, 'colaborador', 'Ana Souza')`,
    [COLABORADOR_A, OPERACOES_A, TOMADORA, tenantA],
  );
  // TI-0001 emprestado em aberto; TI-0002 já devolvido.
  await cliente.query(
    `INSERT INTO emprestimos
       (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
     SELECT $1, e.id, $2, v.retirado::timestamptz, v.ate::date, v.devolvido::timestamptz, v.por::uuid
       FROM equipamentos e
       JOIN (VALUES
         ('TI-0001', '2026-11-11T15:00:00Z', '2026-11-25', NULL, NULL),
         ('TI-0002', '2026-10-01T15:00:00Z', '2026-10-15', '2026-10-10T15:00:00Z', $3)
       ) AS v(patrimonio, retirado, ate, devolvido, por) ON v.patrimonio = e.patrimonio
      WHERE e.tenant_id = $1`,
    [tenantA, TOMADORA, OPERACOES_A],
  );
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await cliente?.end();
  await prisma?.$disconnect();
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listagem com empréstimos", () => {
  it("RF-SOLIC-04 — item com empréstimo aberto aparece emprestado, com a data de devolução", async () => {
    const { itens } = await como(COLABORADOR_A).equipamentos.listar({});
    const porPatrimonio = new Map(itens.map((item) => [item.patrimonio, item.disponibilidade]));

    expect(porPatrimonio.get("TI-0001")).toEqual({
      estado: "emprestado",
      devolverAte: "2026-11-25",
    });
    expect(porPatrimonio.get("TI-0002")).toEqual({ estado: "disponivel" });
    expect(porPatrimonio.get("TI-0004")).toEqual({ estado: "manutencao" });
  });

  it("RN-DADOS-06 — item emprestado não conta como disponível no resumo", async () => {
    await expect(como(COLABORADOR_A).equipamentos.listar({})).resolves.toMatchObject({
      resumo: { total: 12, disponiveis: 9 },
    });
  });

  it("CA-CATALOGO-07 — Só disponíveis exclui o item emprestado", async () => {
    const { itens } = await como(COLABORADOR_A).equipamentos.listar({ somenteDisponiveis: true });

    expect(itens).toHaveLength(9);
    expect(itens.map((item) => item.patrimonio)).not.toContain("TI-0001");
    expect(itens.every((item) => item.disponibilidade.estado === "disponivel")).toBe(true);
  });

  it("CA-CATALOGO-08 — a paginação com Só disponíveis continua sem duplicar nem perder", async () => {
    const vistos: string[] = [];
    let cursor: string | undefined;
    do {
      const pagina = await como(COLABORADOR_A).equipamentos.listar({
        somenteDisponiveis: true,
        limite: 2,
        cursor,
      });
      vistos.push(...pagina.itens.map((item) => item.patrimonio));
      cursor = pagina.proximoCursor ?? undefined;
    } while (cursor);

    expect(vistos).toHaveLength(9);
    expect(new Set(vistos).size).toBe(9);
  });

  it("CA-CATALOGO-10 — a saída não contém o tomador, para nenhum papel", async () => {
    for (const usuario of [COLABORADOR_A, OPERACOES_A]) {
      const saida = await como(usuario).equipamentos.listar({});
      const texto = JSON.stringify(saida);

      expect(esquemaSaidaListarEquipamentos.parse(saida)).toEqual(saida);
      expect(texto).not.toContain("Ana Souza");
      expect(texto).not.toContain(TOMADORA);
      expect(texto).not.toMatch(/tomador|user_id|userId|usuario/i);
    }
  });

  it("RF-SOLIC-04 — depois de confirmar uma solicitação, o item aparece emprestado no catálogo", async () => {
    const caller = como(COLABORADOR_A);
    const { id: equipamentoId } = await caller.equipamentos.detalhar({ patrimonio: "TI-0003" });

    const { devolverAte } = await caller.emprestimos.solicitar({ equipamentoId });
    const { itens, resumo } = await caller.equipamentos.listar({});

    expect(itens.find((item) => item.patrimonio === "TI-0003")?.disponibilidade).toEqual({
      estado: "emprestado",
      devolverAte,
    });
    expect(resumo).toEqual({ total: 12, disponiveis: 8 });
  });
});
