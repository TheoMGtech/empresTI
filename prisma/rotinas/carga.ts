// Carga inicial do tenant e dos equipamentos, em uma única transação.
// Cria só o que falta e não sobrescreve registros existentes. Não cria usuários, memberships,
// empréstimos nem eventos de auditoria.
import type { PrismaClient } from "@prisma/client";

import { SITUACOES_INICIAIS } from "./carga-inicial.ts";
import { lerManifesto, MANIFESTO_PADRAO, type ItemManifesto } from "./manifesto.ts";

export const SLUG_TENANT_INICIAL = "suporte_ti";

export class ErroCargaInvalida extends Error {
  readonly codigo = "PATRIMONIO_SEM_SITUACAO";

  constructor() {
    super("Um patrimônio do manifesto não consta na tabela de carga inicial.");
    this.name = "ErroCargaInvalida";
  }
}

export type ResultadoCarga = { criados: number; preservados: number };

function montarRegistros(itens: readonly ItemManifesto[]) {
  return itens.map((item) => {
    const situacao = SITUACOES_INICIAIS[item.patrimonio];
    if (situacao === undefined) throw new ErroCargaInvalida();

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
