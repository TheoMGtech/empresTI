import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { lerAmbienteBanco } from "@/env";

const globalPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function obterClientePrisma() {
  if (!globalPrisma.prisma) {
    const { DATABASE_URL } = lerAmbienteBanco();
    const adapter = new PrismaPg(DATABASE_URL);
    globalPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalPrisma.prisma;
}
