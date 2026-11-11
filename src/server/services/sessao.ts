import type { PrismaClient } from "@prisma/client";

import type { Papel } from "@/lib/esquemas/sessao";

export type Vinculo = { tenantId: string; papel: Papel };

export class ErroSemMembership extends Error {}
export class ErroMultiplosMemberships extends Error {}

/**
 * Resolve tenant e papel do usuário a partir de `memberships` (RF-SESSAO-02). O usuário vem da
 * identidade validada no Supabase Auth, nunca do input. Mais de um vínculo é recusado sem
 * escolher tenant (D-SESSAO-01).
 */
export async function resolverVinculo(
  prisma: Pick<PrismaClient, "membership">,
  usuarioId: string,
): Promise<Vinculo> {
  const vinculos = await prisma.membership.findMany({
    where: { userId: usuarioId },
    select: { tenantId: true, role: true },
    take: 2,
  });

  if (vinculos.length === 0) throw new ErroSemMembership();
  if (vinculos.length > 1) throw new ErroMultiplosMemberships();

  const [vinculo] = vinculos as [(typeof vinculos)[number]];
  return { tenantId: vinculo.tenantId, papel: vinculo.role };
}
