import type { PrismaClient } from "@prisma/client";

type FabricaClientePrisma = () => PrismaClient;

export async function verificarSaudeDoBanco(obterPrisma: FabricaClientePrisma) {
  try {
    const quantidadeRegistros = await obterPrisma().saudeSistema.count();

    return {
      bancoOperacional: true,
      quantidadeRegistros,
    };
  } catch {
    return {
      bancoOperacional: false,
      quantidadeRegistros: null,
    };
  }
}
