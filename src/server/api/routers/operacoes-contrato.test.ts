import { SituacaoEquipamento, type PrismaClient } from "@prisma/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  MOTIVOS_EQUIPAMENTO_OPERACOES,
  SITUACOES,
  esquemaCadastroEquipamento,
  esquemaEntradaAlterarSituacao,
  type EntradaAlterarSituacao,
  type EntradaCadastroEquipamento,
  type SaidaAlterarSituacao,
  type SaidaCadastroEquipamento,
} from "@/lib/esquemas/equipamentos";
import {
  FILTROS_EMPRESTIMOS_EM_ABERTO,
  esquemaEmprestimoEmAberto,
  esquemaEntradaEmprestimosEmAberto,
  esquemaResumoOperacoes,
  esquemaSaidaUltimosCadastros,
  type EntradaEmprestimosEmAberto,
  type ResumoOperacoes,
  type SaidaEmprestimosEmAberto,
  type UltimoCadastro,
} from "@/lib/esquemas/operacoes";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";
const ID = "00000000-0000-4000-8000-0000000000a1";

const CADASTRO = {
  nome: "Notebook Lenovo ThinkPad",
  categoria: "notebook",
  patrimonio: "TI-0013",
  situacao: "ativo",
} as const;

function caller(papel: "colaborador" | "operacoes") {
  return routerAplicacao.createCaller({
    obterClientePrisma: () =>
      ({
        membership: { findMany: async () => [{ tenantId: TENANT, role: papel }] },
      }) as unknown as PrismaClient,
    obterClienteSupabase: async () =>
      ({
        auth: { getUser: async () => ({ data: { user: { id: USUARIO } }, error: null }) },
      }) as unknown as ClienteSupabaseAutenticacao,
  });
}

function chamadas(papel: "colaborador" | "operacoes") {
  const c = caller(papel);
  return [
    ["operacoes.emprestimosEmAberto", () => c.operacoes.emprestimosEmAberto({})],
    ["operacoes.resumo", () => c.operacoes.resumo()],
    ["operacoes.registrarDevolucao", () => c.operacoes.registrarDevolucao({ emprestimoId: ID })],
    ["operacoes.ultimosCadastros", () => c.operacoes.ultimosCadastros()],
    ["equipamentos.cadastrar", () => c.equipamentos.cadastrar(CADASTRO)],
    [
      "equipamentos.alterarSituacao",
      () => c.equipamentos.alterarSituacao({ equipamentoId: ID, situacao: "em_manutencao" }),
    ],
  ] as const;
}

describe("contrato da lista e do resumo", () => {
  it("RF-OPER-01 — o item traz o nome de exibição da pessoa, e nenhum identificador dela", () => {
    const item = {
      id: ID,
      equipamento: {
        patrimonio: "TI-0001",
        nome: "Notebook",
        categoria: "notebook",
        imagemUrl: null,
      },
      pessoa: { nomeExibicao: null },
      retiradoEm: new Date(),
      devolverAte: "2026-11-25",
      emAtraso: false,
    };

    expect(esquemaEmprestimoEmAberto.parse(item)).toEqual(item);
    expect(
      esquemaEmprestimoEmAberto.safeParse({ ...item, pessoa: { nomeExibicao: null, id: USUARIO } })
        .success,
    ).toBe(false);
    expect(esquemaEmprestimoEmAberto.safeParse({ ...item, userId: USUARIO }).success).toBe(false);
  });

  it("RF-OPER-03 — os chips são Todos, Em atraso e Vencem esta semana, mais a categoria", () => {
    expect(FILTROS_EMPRESTIMOS_EM_ABERTO).toEqual(["todos", "em_atraso", "vencem_7_dias"]);
    expect(
      esquemaEntradaEmprestimosEmAberto.parse({
        filtro: "vencem_7_dias",
        categoria: "notebook",
        tenantId: TENANT,
      }),
    ).toEqual({ filtro: "vencem_7_dias", categoria: "notebook" });
    expect(esquemaEntradaEmprestimosEmAberto.safeParse({ filtro: "vencem_30_dias" }).success).toBe(
      false,
    );
  });

  it("RF-OPER-02 — o resumo tem os quatro cards", () => {
    const resumo = { emAberto: 21, vencendoEm3Dias: 4, emAtraso: 3, emManutencao: 2 };

    expect(esquemaResumoOperacoes.parse(resumo)).toEqual(resumo);
    expect(esquemaResumoOperacoes.safeParse({ ...resumo, disponiveis: 1 }).success).toBe(false);
  });

  it("RF-OPER-08 — últimos cadastros têm até 3 itens com patrimônio, nome e data", () => {
    const item = { patrimonio: "TI-0013", nome: "Notebook", criadoEm: new Date() };

    expect(esquemaSaidaUltimosCadastros.parse([item, item, item])).toHaveLength(3);
    expect(esquemaSaidaUltimosCadastros.safeParse([item, item, item, item]).success).toBe(false);
  });
});

describe("contrato do cadastro e da situação", () => {
  it("RF-OPER-05 — o esquema do formulário aceita o cadastro mínimo e limpa opcionais vazios", () => {
    expect(
      esquemaCadastroEquipamento.parse({
        ...CADASTRO,
        numeroSerie: "  ",
        local: "Sala 3",
        observacoes: "",
      }),
    ).toEqual({ ...CADASTRO, local: "Sala 3" });
  });

  it.each([
    ["patrimônio sem o prefixo", { patrimonio: "0013" }],
    ["patrimônio com três dígitos", { patrimonio: "TI-013" }],
    ["patrimônio em minúsculas", { patrimonio: "ti-0013" }],
    ["nome vazio", { nome: "  " }],
    ["categoria desconhecida", { categoria: "impressora" }],
    ["situação desconhecida", { situacao: "emprestado" }],
  ])("CA-OPER-06 — o esquema recusa %s", (_caso, extra) => {
    expect(esquemaCadastroEquipamento.safeParse({ ...CADASTRO, ...extra }).success).toBe(false);
  });

  it("RN-OPER-03 — as situações são as do enum SituacaoEquipamento", () => {
    expect([...SITUACOES].sort()).toEqual(Object.values(SituacaoEquipamento).sort());
  });

  it("RF-OPER-07 — alterar situação recebe equipamentoId e situação", () => {
    expect(
      esquemaEntradaAlterarSituacao.parse({
        equipamentoId: ID,
        situacao: "fora_de_uso",
        tenantId: TENANT,
      }),
    ).toEqual({ equipamentoId: ID, situacao: "fora_de_uso" });
  });

  it("RN-OPER-02/RF-OPER-07 — os motivos de recusa são os da spec", () => {
    expect(MOTIVOS_EQUIPAMENTO_OPERACOES).toEqual(["PATRIMONIO_DUPLICADO", "EMPRESTIMO_EM_ABERTO"]);
  });
});

describe("registro e autorização", () => {
  it("RS-OPER-01 — os seis procedimentos existem com os tipos do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toEqual(
      expect.arrayContaining(chamadas("operacoes").map(([nome]) => nome)),
    );
    type E = inferRouterInputs<RouterAplicacao>;
    type S = inferRouterOutputs<RouterAplicacao>;
    expectTypeOf<
      E["operacoes"]["emprestimosEmAberto"]
    >().toEqualTypeOf<EntradaEmprestimosEmAberto>();
    expectTypeOf<S["operacoes"]["emprestimosEmAberto"]>().toEqualTypeOf<SaidaEmprestimosEmAberto>();
    expectTypeOf<S["operacoes"]["resumo"]>().toEqualTypeOf<ResumoOperacoes>();
    expectTypeOf<S["operacoes"]["ultimosCadastros"]>().toEqualTypeOf<UltimoCadastro[]>();
    expectTypeOf<E["equipamentos"]["cadastrar"]>().toEqualTypeOf<EntradaCadastroEquipamento>();
    expectTypeOf<S["equipamentos"]["cadastrar"]>().toEqualTypeOf<SaidaCadastroEquipamento>();
    expectTypeOf<E["equipamentos"]["alterarSituacao"]>().toEqualTypeOf<EntradaAlterarSituacao>();
    expectTypeOf<S["equipamentos"]["alterarSituacao"]>().toEqualTypeOf<SaidaAlterarSituacao>();
  });

  it.each(chamadas("colaborador"))(
    "CA-OPER-04 — colaborador recebe FORBIDDEN em %s",
    async (_n, chamar) => {
      await expect(chamar()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
      });
    },
  );
});
