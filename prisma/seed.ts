// Carga inicial do EmpresTI. Executar com `npm run seed`.
// A guarda roda antes de abrir qualquer conexão. As mensagens de erro são fixas e as saídas
// trazem só contagens: nunca URL, credencial ou dado pessoal.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { ErroCargaInvalida, executarCargaDoManifesto } from "./rotinas/carga.ts";
import { ErroBancoNaoPermitido, garantirBancoPermitido } from "./rotinas/guarda-banco.ts";
import { ErroManifestoInvalido } from "./rotinas/manifesto.ts";

async function principal() {
  const { DATABASE_URL, DIRECT_URL } = process.env;
  garantirBancoPermitido({
    env: { DATABASE_URL, DIRECT_URL },
    argumentos: process.argv.slice(2),
  });

  const url = DIRECT_URL ?? DATABASE_URL;
  if (url === undefined) throw new Error("URL de banco ausente.");

  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  try {
    const { criados, preservados } = await executarCargaDoManifesto(prisma);
    process.stdout.write(`Carga concluída: criados=${criados} preservados=${preservados}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await principal();
} catch (erro) {
  if (
    erro instanceof ErroBancoNaoPermitido ||
    erro instanceof ErroManifestoInvalido ||
    erro instanceof ErroCargaInvalida
  ) {
    process.stderr.write(`[${erro.codigo}] ${erro.message}\n`);
  } else {
    // O erro original pode conter a string de conexão.
    process.stderr.write("Falha inesperada na carga.\n");
  }
  process.exitCode = 1;
}
