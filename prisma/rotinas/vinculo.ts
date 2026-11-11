// Vincula uma identidade já existente ao tenant inicial, com o papel de professor (D1).
// Verificação e escrita ocorrem na mesma transação. Não cria usuário, não recebe papel por
// argumento e não grava empréstimos nem eventos de auditoria.
import type { PrismaClient } from "@prisma/client";

import { SLUG_TENANT_INICIAL } from "./carga.ts";
import { criarConsultaSql, verificarIdentidade } from "./identidade.ts";

const PAPEL_PROFESSOR = "colaborador";

const MENSAGENS = {
  TENANT_INEXISTENTE: "O tenant inicial não existe. Execute a carga antes do vínculo.",
  VINCULO_EM_OUTRO_TENANT: "A identidade já tem vínculo em outro tenant.",
  PAPEL_DIVERGENTE: "A identidade já tem vínculo com outro papel.",
} as const;

export class ErroVinculo extends Error {
  readonly codigo: keyof typeof MENSAGENS;

  constructor(codigo: keyof typeof MENSAGENS) {
    super(MENSAGENS[codigo]);
    this.name = "ErroVinculo";
    this.codigo = codigo;
  }
}

export type ResultadoVinculo = "criado" | "ja_existente";

export function vincularProfessor(
  prisma: Pick<PrismaClient, "$transaction">,
  userId: string,
): Promise<ResultadoVinculo> {
  return prisma.$transaction(async (transacao) => {
    await verificarIdentidade(criarConsultaSql(transacao), userId);

    const tenant = await transacao.tenant.findUnique({
      where: { slug: SLUG_TENANT_INICIAL },
      select: { id: true },
    });
    if (!tenant) throw new ErroVinculo("TENANT_INEXISTENTE");

    const vinculos = await transacao.membership.findMany({
      where: { userId },
      select: { tenantId: true, role: true },
    });
    if (vinculos.some((vinculo) => vinculo.tenantId !== tenant.id)) {
      throw new ErroVinculo("VINCULO_EM_OUTRO_TENANT");
    }

    const [existente] = vinculos;
    if (existente) {
      if (existente.role !== PAPEL_PROFESSOR) throw new ErroVinculo("PAPEL_DIVERGENTE");
      return "ja_existente";
    }

    await transacao.membership.create({
      data: { userId, tenantId: tenant.id, role: PAPEL_PROFESSOR },
    });
    return "criado";
  });
}
