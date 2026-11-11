import type { PrismaClient } from "@prisma/client";

import type { Papel, SessaoAtual } from "@/lib/esquemas/sessao";

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

/**
 * Nome de exibição e papel da sessão (RF-SESSAO-06, CA-SESSAO-05). Lê só o membership do próprio
 * usuário no tenant já resolvido pelo contexto. Nome feito só de espaço em branco conta como
 * ausente: a interface mostra o papel (D-SESSAO-02).
 */
export async function consultarSessaoAtual(
  prisma: Pick<PrismaClient, "membership">,
  vinculo: { usuarioId: string; tenantId: string },
): Promise<SessaoAtual> {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_tenantId: { userId: vinculo.usuarioId, tenantId: vinculo.tenantId } },
    select: { nomeExibicao: true, role: true },
  });
  const nome = membership.nomeExibicao?.trim();

  return { nomeExibicao: nome ? nome : null, papel: membership.role };
}
