// Executada com `node`, sem transpilador, para provar o modo em que as rotinas de carga vão
// rodar. Não abre conexão. A importação relativa é dinâmica porque o tsconfig atual não
// aceita a extensão .ts em import estático, e a sonda não deve alterá-lo.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

type Resultado = {
  prisma: boolean;
  adaptador: boolean;
  zod: boolean;
  relativo: string;
};

const caminhoAuxiliar = "./sonda-typescript-auxiliar.ts";
const auxiliar = (await import(caminhoAuxiliar)) as { marca: { origem: string } };

const resultado: Resultado = {
  prisma: typeof PrismaClient === "function",
  adaptador: typeof PrismaPg === "function",
  zod: z.string().safeParse("ok").success,
  relativo: auxiliar.marca.origem,
};

process.stdout.write(JSON.stringify(resultado));
