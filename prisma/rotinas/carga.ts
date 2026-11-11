// Carga inicial do tenant e dos equipamentos, em uma única transação.
// Cria só o que falta e não sobrescreve registros existentes. Não cria usuários, memberships,
// empréstimos nem eventos de auditoria.
import type { PrismaClient } from "@prisma/client";

import { SITUACOES_INICIAIS } from "./carga-inicial.ts";
import { lerManifesto, MANIFESTO_PADRAO, type ItemManifesto } from "./manifesto.ts";

export const SLUG_TENANT_INICIAL = "suporte_ti";

const MENSAGENS = {
  PATRIMONIO_SEM_SITUACAO: "Um patrimônio do manifesto não consta na tabela de carga inicial.",
  FOTOGRAFIA_DIVERGENTE: "A fotografia de um patrimônio existente diverge do manifesto.",
} as const;

export class ErroCargaInvalida extends Error {
  readonly codigo: keyof typeof MENSAGENS;

  constructor(codigo: keyof typeof MENSAGENS) {
    super(MENSAGENS[codigo]);
    this.name = "ErroCargaInvalida";
    this.codigo = codigo;
  }
}

export type ResultadoCarga = { criados: number; preservados: number };

function montarRegistros(itens: readonly ItemManifesto[]) {
  return itens.map((item) => {
    const situacao = SITUACOES_INICIAIS[item.patrimonio];
    if (situacao === undefined) throw new ErroCargaInvalida("PATRIMONIO_SEM_SITUACAO");

    return {
      patrimonio: item.patrimonio,
      nome: item.nome,
      categoria: item.categoria,
      situacao,
      imagemCaminho: item.imagemCaminho,
      imagemSha256: item.imagemSha256,
    };
  });
}

export async function executarCarga(
  prisma: Pick<PrismaClient, "$transaction">,
  itens: readonly ItemManifesto[],
): Promise<ResultadoCarga> {
  const registros = montarRegistros(itens);

  return prisma.$transaction(async (transacao) => {
    const tenant = await transacao.tenant.upsert({
      where: { slug: SLUG_TENANT_INICIAL },
      create: { slug: SLUG_TENANT_INICIAL },
      update: {},
    });

    // Lê só os patrimônios da carga, neste tenant: outros equipamentos nem entram na comparação.
    // Divergência nunca é corrigida: lançar aqui desfaz a transação inteira.
    const existentes = await transacao.equipamento.findMany({
      where: {
        tenantId: tenant.id,
        patrimonio: { in: registros.map((registro) => registro.patrimonio) },
      },
      select: { patrimonio: true, imagemCaminho: true, imagemSha256: true },
    });
    const porPatrimonio = new Map(registros.map((item) => [item.patrimonio, item]));
    for (const existente of existentes) {
      const esperado = porPatrimonio.get(existente.patrimonio);
      if (
        existente.imagemCaminho !== esperado?.imagemCaminho ||
        existente.imagemSha256 !== esperado?.imagemSha256
      ) {
        throw new ErroCargaInvalida("FOTOGRAFIA_DIVERGENTE");
      }
    }

    const { count } = await transacao.equipamento.createMany({
      data: registros.map((registro) => ({ ...registro, tenantId: tenant.id })),
      skipDuplicates: true,
    });

    return { criados: count, preservados: registros.length - count };
  });
}

/** Valida o manifesto antes de qualquer escrita e executa a carga. */
export async function executarCargaDoManifesto(
  prisma: Pick<PrismaClient, "$transaction">,
  caminho: string = MANIFESTO_PADRAO,
) {
  return executarCarga(prisma, lerManifesto(caminho));
}
