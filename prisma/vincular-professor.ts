// Vincula uma conta existente ao tenant inicial. Uso:
//   node prisma/vincular-professor.ts --user-id <uuid> [--papel colaborador|operacoes] [--nome <texto>]
// Sem --papel, vale `colaborador` (professor). A guarda roda antes de abrir qualquer conexão. As
// mensagens são fixas: nunca repetem o identificador, o nome, a URL ou credenciais.
import { parseArgs } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { ErroBancoNaoPermitido, garantirBancoPermitido } from "./rotinas/guarda-banco.ts";
import { ErroIdentidadeRecusada } from "./rotinas/identidade.ts";
import { ErroVinculo, vincularUsuario, type DadosVinculo } from "./rotinas/vinculo.ts";

class ErroUso extends Error {
  readonly codigo = "USO_INVALIDO";

  constructor() {
    super(
      "Informe --user-id <uuid>, opcionalmente --papel <colaborador|operacoes> e --nome <texto>, " +
        "e, se aplicável, --confirmar-remoto=<hosts>.",
    );
  }
}

function lerDados(argumentos: string[]): DadosVinculo {
  try {
    const { values } = parseArgs({
      args: argumentos,
      options: {
        "user-id": { type: "string" },
        papel: { type: "string" },
        nome: { type: "string" },
        "confirmar-remoto": { type: "string" },
      },
    });
    if (values["user-id"] === undefined) throw new ErroUso();
    return {
      userId: values["user-id"],
      ...(values.papel === undefined ? {} : { papel: values.papel }),
      ...(values.nome === undefined ? {} : { nomeExibicao: values.nome }),
    };
  } catch {
    // A mensagem original repete o argumento recebido.
    throw new ErroUso();
  }
}

async function principal() {
  const argumentos = process.argv.slice(2);
  const { DATABASE_URL, DIRECT_URL } = process.env;

  garantirBancoPermitido({ env: { DATABASE_URL, DIRECT_URL }, argumentos });
  const dados = lerDados(argumentos);

  const url = DIRECT_URL ?? DATABASE_URL;
  if (url === undefined) throw new Error("URL de banco ausente.");

  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  try {
    const resultado = await vincularUsuario(prisma, dados);
    process.stdout.write(
      resultado === "criado" ? "Vínculo criado.\n" : "Vínculo já existente: nada mudou.\n",
    );
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await principal();
} catch (erro) {
  if (
    erro instanceof ErroBancoNaoPermitido ||
    erro instanceof ErroIdentidadeRecusada ||
    erro instanceof ErroVinculo ||
    erro instanceof ErroUso
  ) {
    process.stderr.write(`[${erro.codigo}] ${erro.message}\n`);
  } else {
    // O erro original pode conter a string de conexão ou o identificador.
    process.stderr.write("Falha inesperada no vínculo.\n");
  }
  process.exitCode = 1;
}
