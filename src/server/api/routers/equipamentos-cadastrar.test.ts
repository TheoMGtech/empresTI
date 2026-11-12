// @vitest-environment node
// T-OPER-04: `equipamentos.cadastrar`, com Postgres real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { CadastroEquipamento } from "@/lib/esquemas/equipamentos";
import { routerAplicacao } from "@/server/api/raiz";
import { MENSAGEM_PATRIMONIO_DUPLICADO } from "@/server/api/routers/equipamentos";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ACAO_CADASTRAR_EQUIPAMENTO,
  cadastrarEquipamento,
  recursoEquipamento,
} from "@/server/services/equipamentos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR = "00000000-0000-4000-8000-000000000001";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const OPERACOES_B = "00000000-0000-4000-8000-000000000004";

const NOVO: CadastroEquipamento = {
  nome: "Monitor LG 27",
  categoria: "monitor",
  patrimonio: "TI-0013",
  situacao: "ativo",
};

type Contexto = { prisma: PrismaClient; cliente: Client; tenantId: string };

let banco: BancoReal;

async function comAmbiente<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await executarCargaDoManifesto(prisma);
    const { rows } = await cliente.query<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = 'suporte_ti'",
    );
    const tenantId = rows[0]?.id as string;
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $4, 'operacoes'), ($3, $5, 'operacoes')`,
      [COLABORADOR, OPERACOES, OPERACOES_B, tenantId, TENANT_B],
    );
    return await acao({ prisma, cliente, tenantId });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

function como(prisma: PrismaClient, usuarioId: string) {
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: usuarioId } }, error: null }) },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
}

async function equipamentosCom(cliente: Client, patrimonio: string) {
  const { rows } = await cliente.query(
    `SELECT tenant_id, patrimonio, nome, categoria::text, situacao::text, numero_serie, local,
            observacoes, imagem_caminho
       FROM equipamentos WHERE patrimonio = $1 ORDER BY tenant_id`,
    [patrimonio],
  );
  return rows;
}

async function auditoria(cliente: Client) {
  const { rows } = await cliente.query<{ ator: string; acao: string; recurso: string }>(
    "SELECT ator, acao, recurso FROM auditoria ORDER BY ocorrido_em, id",
  );
  return rows;
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("equipamentos.cadastrar", () => {
  it("CA-OPER-05 — cadastrar cria o equipamento no tenant da sessão, com os opcionais", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantId }) => {
      const saida = await como(prisma, OPERACOES).equipamentos.cadastrar({
        ...NOVO,
        numeroSerie: "SN-1234",
        local: "Sala 3",
        observacoes: "Com cabo HDMI",
        tenantId: TENANT_B,
      } as CadastroEquipamento);

      expect(saida).toEqual({ id: expect.any(String), patrimonio: "TI-0013" });
      expect(await equipamentosCom(cliente, "TI-0013")).toEqual([
        {
          tenant_id: tenantId,
          patrimonio: "TI-0013",
          nome: "Monitor LG 27",
          categoria: "monitor",
          situacao: "ativo",
          numero_serie: "SN-1234",
          local: "Sala 3",
          observacoes: "Com cabo HDMI",
          imagem_caminho: null,
        },
      ]);
    });
  });

  it("CA-OPER-05 — opcionais vazios ficam nulos, e o item aparece disponível no catálogo", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await como(prisma, OPERACOES).equipamentos.cadastrar({
        ...NOVO,
        numeroSerie: "  ",
        local: "",
      });

      expect(await equipamentosCom(cliente, "TI-0013")).toMatchObject([
        { numero_serie: null, local: null, observacoes: null },
      ]);
      const { itens, resumo } = await como(prisma, COLABORADOR).equipamentos.listar({});
      expect(itens.find((item) => item.patrimonio === "TI-0013")).toMatchObject({
        imagemUrl: null,
        disponibilidade: { estado: "disponivel" },
      });
      expect(resumo).toEqual({ total: 13, disponiveis: 11 });
    });
  });

  it("CA-OPER-07 — cadastrado em manutenção não aparece como disponível", async () => {
    await comAmbiente(async ({ prisma }) => {
      await como(prisma, OPERACOES).equipamentos.cadastrar({ ...NOVO, situacao: "em_manutencao" });

      const colaborador = como(prisma, COLABORADOR);
      const { itens } = await colaborador.equipamentos.listar({ somenteDisponiveis: true });
      expect(itens.map((item) => item.patrimonio)).not.toContain("TI-0013");
      await expect(
        colaborador.equipamentos.detalhar({ patrimonio: "TI-0013" }),
      ).resolves.toMatchObject({ disponibilidade: { estado: "manutencao" } });
    });
  });

  it("RN-OPER-03 — cadastrado fora de uso fica oculto para colaborador", async () => {
    await comAmbiente(async ({ prisma }) => {
      await como(prisma, OPERACOES).equipamentos.cadastrar({ ...NOVO, situacao: "fora_de_uso" });

      const { itens } = await como(prisma, COLABORADOR).equipamentos.listar({});
      expect(itens.map((item) => item.patrimonio)).not.toContain("TI-0013");
    });
  });

  it("CA-OPER-06 — patrimônio repetido no tenant responde PATRIMONIO_DUPLICADO", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await expect(
        como(prisma, OPERACOES).equipamentos.cadastrar({ ...NOVO, patrimonio: "TI-0001" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: MENSAGEM_PATRIMONIO_DUPLICADO,
        cause: { motivo: "PATRIMONIO_DUPLICADO" },
      });
      expect(await equipamentosCom(cliente, "TI-0001")).toHaveLength(1);
      expect(await auditoria(cliente)).toEqual([]);
    });
  });

  it("RN-OPER-02 — o mesmo patrimônio é aceito em outro tenant", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await como(prisma, OPERACOES_B).equipamentos.cadastrar({ ...NOVO, patrimonio: "TI-0001" });

      expect(await equipamentosCom(cliente, "TI-0001")).toHaveLength(2);
    });
  });

  it.each([
    ["sem o prefixo", "0013"],
    ["com três dígitos", "TI-013"],
    ["em minúsculas", "ti-0013"],
    ["com sufixo", "TI-0013A"],
  ])("CA-OPER-06 — patrimônio %s é recusado sem gravar", async (_caso, patrimonio) => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await expect(
        como(prisma, OPERACOES).equipamentos.cadastrar({ ...NOVO, patrimonio }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await equipamentosCom(cliente, patrimonio)).toEqual([]);
    });
  });

  it("CA-OPER-04 — colaborador recebe FORBIDDEN e nada é gravado", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      await expect(como(prisma, COLABORADOR).equipamentos.cadastrar(NOVO)).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
      });
      expect(await equipamentosCom(cliente, "TI-0013")).toEqual([]);
    });
  });
});

describe("auditoria do cadastro", () => {
  it("CA-OPER-08 — o cadastro grava auditoria com Operações como ator", async () => {
    await comAmbiente(async ({ prisma, cliente }) => {
      const { id } = await como(prisma, OPERACOES).equipamentos.cadastrar(NOVO);

      expect(await auditoria(cliente)).toEqual([
        { ator: OPERACOES, acao: ACAO_CADASTRAR_EQUIPAMENTO, recurso: recursoEquipamento(id) },
      ]);
    });
  });

  it("CA-OPER-08 — falha na auditoria desfaz o cadastro", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantId }) => {
      const falha = new Error("falha simulada da auditoria");
      const auditoriaQuebrada = {
        $transaction: ((acao: (transacao: PrismaClient) => Promise<unknown>) =>
          prisma.$transaction(async (transacao) =>
            acao(
              new Proxy(transacao, {
                get(alvo, chave, receptor) {
                  if (chave === "auditoria") {
                    return {
                      create: async () => {
                        throw falha;
                      },
                    };
                  }
                  return Reflect.get(alvo, chave, receptor);
                },
              }) as unknown as PrismaClient,
            ),
          )) as unknown as PrismaClient["$transaction"],
      };

      await expect(
        cadastrarEquipamento(auditoriaQuebrada, { tenantId, ator: OPERACOES }, NOVO),
      ).rejects.toBe(falha);
      expect(await equipamentosCom(cliente, "TI-0013")).toEqual([]);
      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});
