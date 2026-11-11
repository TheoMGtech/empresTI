import type { PrismaClient, SituacaoEquipamento } from "@prisma/client";

import {
  LIMITE_PADRAO_LISTAGEM,
  type Disponibilidade,
  type EntradaListarEquipamentos,
  type SaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import type { Papel } from "@/lib/esquemas/sessao";

type ClientePrisma = Pick<PrismaClient, "equipamento">;
type Escopo = { tenantId: string; papel: Papel };

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

// Até a Spec 005 não há empréstimos: `ativo` resulta em `disponivel` (plano da Spec 004).
const DISPONIBILIDADE_POR_SITUACAO: Record<SituacaoEquipamento, Disponibilidade> = {
  ativo: { estado: "disponivel" },
  em_manutencao: { estado: "manutencao" },
  fora_de_uso: { estado: "fora_de_uso" },
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
          // Até a Spec 005, disponível é o mesmo que `ativo`.
          entrada.somenteDisponiveis ? { situacao: "ativo" as const } : {},
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
      },
    }),
    prisma.equipamento.count({ where: visiveis }),
    prisma.equipamento.count({ where: { ...visiveis, situacao: "ativo" } }),
  ]);

  const pagina = registros.slice(0, limite);
  const haMais = registros.length > limite;

  return {
    itens: pagina.map((registro) => ({
      patrimonio: registro.patrimonio,
      nome: registro.nome,
      categoria: registro.categoria,
      imagemUrl: montarUrlImagem(opcoes.urlSupabase, registro.imagemCaminho),
      disponibilidade: DISPONIBILIDADE_POR_SITUACAO[registro.situacao],
    })),
    proximoCursor: haMais ? (pagina.at(-1)?.patrimonio ?? null) : null,
    resumo: { total, disponiveis },
  };
}
