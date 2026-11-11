import type { PrismaClient, SituacaoEquipamento } from "@prisma/client";

import type { Disponibilidade, SaidaListarEquipamentos } from "@/lib/esquemas/equipamentos";
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
 * Equipamentos do tenant da sessão, por patrimônio (RF-CATALOGO-01). Nunca lê nem devolve quem
 * está com o item (RS-CATALOGO-03).
 */
export async function listarEquipamentos(
  prisma: ClientePrisma,
  escopo: Escopo,
  opcoes: { urlSupabase: string },
): Promise<SaidaListarEquipamentos> {
  const visiveis = filtroDeVisibilidade(escopo);

  const [registros, total, disponiveis] = await Promise.all([
    prisma.equipamento.findMany({
      where: visiveis,
      orderBy: { patrimonio: "asc" },
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

  return {
    itens: registros.map((registro) => ({
      patrimonio: registro.patrimonio,
      nome: registro.nome,
      categoria: registro.categoria,
      imagemUrl: montarUrlImagem(opcoes.urlSupabase, registro.imagemCaminho),
      disponibilidade: DISPONIBILIDADE_POR_SITUACAO[registro.situacao],
    })),
    proximoCursor: null,
    resumo: { total, disponiveis },
  };
}
