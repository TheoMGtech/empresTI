import { Prisma, type PrismaClient, type SituacaoEquipamento } from "@prisma/client";

import {
  LIMITE_PADRAO_LISTAGEM,
  type CadastroEquipamento,
  type DetalheEquipamento,
  type Disponibilidade,
  type EntradaListarEquipamentos,
  type SaidaCadastroEquipamento,
  type SaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import type { Papel } from "@/lib/esquemas/sessao";
import { calcularDevolverAte, formatarDataDoBanco } from "@/lib/prazos";

type ClientePrisma = Pick<PrismaClient, "equipamento">;
type Escopo = { tenantId: string; papel: Papel };

export class ErroEquipamentoNaoEncontrado extends Error {}

/**
 * URL pública da fotografia, montada na leitura (RF-CATALOGO-02, RN-DADOS-08). O caminho gravado
 * já inclui o bucket (`equipamentos/<arquivo>`).
 */
export function montarUrlImagem(urlSupabase: string, caminho: string | null): string | null {
  if (!caminho) return null;
  const base = urlSupabase.replace(/\/+$/, "");
  const objeto = caminho.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${objeto}`;
}

// Disponibilidade pela situação gravada. Um item `ativo` com empréstimo aberto está emprestado
// (RN-DADOS-06, RF-SOLIC-04): ver `disponibilidadeDe`.
const DISPONIBILIDADE_POR_SITUACAO: Record<SituacaoEquipamento, Disponibilidade> = {
  ativo: { estado: "disponivel" },
  em_manutencao: { estado: "manutencao" },
  fora_de_uso: { estado: "fora_de_uso" },
};

/** A situação gravada prevalece; um item `ativo` com empréstimo aberto está emprestado. */
function disponibilidadeDe(
  situacao: SituacaoEquipamento,
  aberto: { devolverAte: Date } | null | undefined,
): Disponibilidade {
  return situacao === "ativo" && aberto
    ? { estado: "emprestado", devolverAte: formatarDataDoBanco(aberto.devolverAte) }
    : DISPONIBILIDADE_POR_SITUACAO[situacao];
}

/** Disponível: `ativo` e sem empréstimo aberto (RN-DADOS-06, RN-SOLIC-01). */
const SO_DISPONIVEIS = {
  situacao: "ativo" as const,
  emprestimos: { none: { devolvidoEm: null } },
};

/** `fora_de_uso` só aparece para Operações (RN-CATALOGO-03); o papel vem do contexto. */
function filtroDeVisibilidade({ tenantId, papel }: Escopo) {
  return papel === "operacoes"
    ? { tenantId }
    : { tenantId, situacao: { not: "fora_de_uso" as const } };
}

/**
 * Equipamentos do tenant da sessão, por patrimônio (RF-CATALOGO-01), com filtros (RF-CATALOGO-04)
 * e cursor no último patrimônio devolvido (plano da Spec 004). O `resumo` usa só o recorte de
 * visibilidade, sem os filtros da tela (RF-CATALOGO-05). Nunca lê nem devolve quem está com o item
 * (RS-CATALOGO-03).
 */
export async function listarEquipamentos(
  prisma: ClientePrisma,
  escopo: Escopo,
  entrada: EntradaListarEquipamentos,
  opcoes: { urlSupabase: string },
): Promise<SaidaListarEquipamentos> {
  const visiveis = filtroDeVisibilidade(escopo);
  const limite = entrada.limite ?? LIMITE_PADRAO_LISTAGEM;

  const [registros, total, disponiveis] = await Promise.all([
    prisma.equipamento.findMany({
      where: {
        AND: [
          visiveis,
          entrada.categoria ? { categoria: entrada.categoria } : {},
          entrada.somenteDisponiveis ? SO_DISPONIVEIS : {},
          entrada.cursor ? { patrimonio: { gt: entrada.cursor } } : {},
        ],
      },
      orderBy: { patrimonio: "asc" },
      // Um a mais para saber se existe próxima página.
      take: limite + 1,
      select: {
        patrimonio: true,
        nome: true,
        categoria: true,
        situacao: true,
        imagemCaminho: true,
        // Só a data de devolução do aberto: nunca quem está com o item (RS-CATALOGO-03).
        emprestimos: { where: { devolvidoEm: null }, select: { devolverAte: true }, take: 1 },
      },
    }),
    prisma.equipamento.count({ where: visiveis }),
    prisma.equipamento.count({ where: { AND: [visiveis, SO_DISPONIVEIS] } }),
  ]);

  const pagina = registros.slice(0, limite);
  const haMais = registros.length > limite;

  return {
    itens: pagina.map((registro) => ({
      patrimonio: registro.patrimonio,
      nome: registro.nome,
      categoria: registro.categoria,
      imagemUrl: montarUrlImagem(opcoes.urlSupabase, registro.imagemCaminho),
      disponibilidade: disponibilidadeDe(registro.situacao, registro.emprestimos[0]),
    })),
    proximoCursor: haMais ? (pagina.at(-1)?.patrimonio ?? null) : null,
    resumo: { total, disponiveis },
  };
}

/** Texto opcional sem valor útil vira `null`, para a tela ocultar o campo (RF-SOLIC-05). */
function textoOuNulo(valor: string | null): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

/**
 * Detalhe de um equipamento do tenant da sessão, por patrimônio (RF-SOLIC-01). Equipamento de outro
 * tenant, inexistente ou `fora_de_uso` para colaborador não é encontrado (CA-SOLIC-04, CA-SOLIC-08).
 * Número de série, observações e histórico só saem para Operações (CA-SOLIC-09, RS-SOLIC-05).
 * `agora` é injetado para o prazo previsto ser testável com datas fixas (CA-SOLIC-10).
 */
export async function detalharEquipamento(
  prisma: Pick<PrismaClient, "equipamento" | "emprestimo">,
  escopo: Escopo,
  patrimonio: string,
  opcoes: { urlSupabase: string; agora: Date },
): Promise<DetalheEquipamento> {
  const equipamento = await prisma.equipamento.findFirst({
    where: { ...filtroDeVisibilidade(escopo), patrimonio },
    select: {
      id: true,
      patrimonio: true,
      nome: true,
      categoria: true,
      situacao: true,
      imagemCaminho: true,
      local: true,
      numeroSerie: true,
      observacoes: true,
    },
  });
  if (!equipamento) throw new ErroEquipamentoNaoEncontrado();

  const doEquipamento = { tenantId: escopo.tenantId, equipamentoId: equipamento.id };
  const operacoes = escopo.papel === "operacoes";

  const [aberto, ultima, historico] = await Promise.all([
    prisma.emprestimo.findFirst({
      where: { ...doEquipamento, devolvidoEm: null },
      select: { devolverAte: true },
    }),
    prisma.emprestimo.aggregate({ where: doEquipamento, _max: { devolvidoEm: true } }),
    operacoes
      ? prisma.emprestimo.findMany({
          where: doEquipamento,
          orderBy: [{ retiradoEm: "desc" }, { id: "asc" }],
          select: {
            retiradoEm: true,
            devolverAte: true,
            devolvidoEm: true,
            membership: { select: { nomeExibicao: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const disponibilidade = disponibilidadeDe(equipamento.situacao, aberto);

  const detalhe: DetalheEquipamento = {
    id: equipamento.id,
    patrimonio: equipamento.patrimonio,
    nome: equipamento.nome,
    categoria: equipamento.categoria,
    imagemUrl: montarUrlImagem(opcoes.urlSupabase, equipamento.imagemCaminho),
    disponibilidade,
    local: textoOuNulo(equipamento.local),
    ultimaDevolucao: ultima._max.devolvidoEm,
    devolverAtePrevisto: calcularDevolverAte(opcoes.agora),
  };

  if (!operacoes || !historico) return detalhe;

  return {
    ...detalhe,
    numeroSerie: textoOuNulo(equipamento.numeroSerie),
    observacoes: textoOuNulo(equipamento.observacoes),
    historico: historico.map((emprestimo) => ({
      retiradoEm: emprestimo.retiradoEm,
      devolverAte: formatarDataDoBanco(emprestimo.devolverAte),
      devolvidoEm: emprestimo.devolvidoEm,
      tomadorNome: textoOuNulo(emprestimo.membership.nomeExibicao),
    })),
  };
}

// ---------------------------------------------------------------------------------------------
// Spec 008 — cadastro e situação (Operações).

/** Ação gravada na auditoria pelo cadastro (RS-OPER-03). */
export const ACAO_CADASTRAR_EQUIPAMENTO = "equipamento.cadastrar";

/** Recurso auditado: o equipamento. */
export const recursoEquipamento = (id: string) => `equipamento:${id}`;

export class ErroPatrimonioDuplicado extends Error {}

/**
 * Cadastra um equipamento no tenant da sessão (RF-OPER-05, CA-OPER-05): um registro por unidade
 * física (RN-OPER-01), com a situação inicial escolhida (RN-OPER-03) e sem fotografia (D-OPER-04).
 * Patrimônio repetido no tenant vira `ErroPatrimonioDuplicado` (RN-OPER-02). A auditoria entra na
 * mesma transação: se falhar, nada é cadastrado (CA-OPER-08).
 */
export async function cadastrarEquipamento(
  prisma: Pick<PrismaClient, "$transaction">,
  escopo: { tenantId: string; ator: string },
  dados: CadastroEquipamento,
): Promise<SaidaCadastroEquipamento> {
  try {
    return await prisma.$transaction(async (transacao) => {
      const equipamento = await transacao.equipamento.create({
        data: {
          tenantId: escopo.tenantId,
          patrimonio: dados.patrimonio,
          nome: dados.nome,
          categoria: dados.categoria,
          situacao: dados.situacao,
          numeroSerie: dados.numeroSerie ?? null,
          local: dados.local ?? null,
          observacoes: dados.observacoes ?? null,
        },
        select: { id: true, patrimonio: true },
      });

      await transacao.auditoria.create({
        data: {
          tenantId: escopo.tenantId,
          ator: escopo.ator,
          acao: ACAO_CADASTRAR_EQUIPAMENTO,
          recurso: recursoEquipamento(equipamento.id),
        },
      });

      return equipamento;
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      throw new ErroPatrimonioDuplicado();
    }
    throw erro;
  }
}
