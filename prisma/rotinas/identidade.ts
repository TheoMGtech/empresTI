// Verifica se uma identidade do Supabase Auth pode receber vínculo (D17): UUID válido, identidade
// existente, e-mail confirmado e sem banimento. Só lê: não cria usuário e não seleciona e-mail
// nem coluna de credencial. Na dúvida, recusa: qualquer falha da consulta vira indeterminada.
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const COLUNAS_NECESSARIAS = ["banned_until", "deleted_at", "email_confirmed_at", "id"];

const MENSAGENS = {
  UUID_INVALIDO: "O identificador informado não é um UUID válido.",
  IDENTIDADE_INEXISTENTE: "A identidade informada não existe.",
  EMAIL_NAO_CONFIRMADO: "A identidade informada não tem e-mail confirmado.",
  IDENTIDADE_BANIDA: "A identidade informada está banida.",
  IDENTIDADE_INDETERMINADA: "Não foi possível verificar a identidade informada.",
} as const;

export type CodigoIdentidade = keyof typeof MENSAGENS;

export class ErroIdentidadeRecusada extends Error {
  readonly codigo: CodigoIdentidade;

  constructor(codigo: CodigoIdentidade) {
    super(MENSAGENS[codigo]);
    this.name = "ErroIdentidadeRecusada";
    this.codigo = codigo;
  }
}

export type SituacaoIdentidade =
  | { existe: false }
  | { existe: true; confirmado: boolean; banido: boolean };

/** Porta da verificação: a real lê `auth.users`, e os testes podem injetar outra. */
export type ConsultaIdentidade = (userId: string) => Promise<SituacaoIdentidade>;

type ClienteSql = Pick<PrismaClient, "$queryRaw">;

export function criarConsultaSql(cliente: ClienteSql): ConsultaIdentidade {
  return async (userId) => {
    const colunas = await cliente.$queryRaw<{ column_name: string }[]>`
      SELECT column_name::text AS column_name
        FROM information_schema.columns
       WHERE table_schema = 'auth'
         AND table_name = 'users'
         AND column_name IN ('id', 'email_confirmed_at', 'banned_until', 'deleted_at')
       ORDER BY column_name`;

    if (colunas.map((coluna) => coluna.column_name).join() !== COLUNAS_NECESSARIAS.join()) {
      throw new Error("Estrutura de auth.users indisponível.");
    }

    const linhas = await cliente.$queryRaw<{ confirmado: boolean; banido: boolean }[]>`
      SELECT "email_confirmed_at" IS NOT NULL AS confirmado,
             "banned_until" IS NOT NULL AND "banned_until" > now() AS banido
        FROM auth.users
       WHERE "id" = ${userId}::uuid AND "deleted_at" IS NULL`;

    const [linha] = linhas;
    return linha ? { existe: true, confirmado: linha.confirmado, banido: linha.banido } : { existe: false };
  };
}

/** Lança se a identidade não puder receber vínculo. Chamar antes de qualquer escrita. */
export async function verificarIdentidade(consulta: ConsultaIdentidade, userId: string) {
  if (!z.uuid().safeParse(userId).success) throw new ErroIdentidadeRecusada("UUID_INVALIDO");

  let situacao: SituacaoIdentidade;
  try {
    situacao = await consulta(userId);
  } catch {
    // O erro original pode trazer detalhes da conexão ou do identificador.
    throw new ErroIdentidadeRecusada("IDENTIDADE_INDETERMINADA");
  }

  if (!situacao.existe) throw new ErroIdentidadeRecusada("IDENTIDADE_INEXISTENTE");
  if (!situacao.confirmado) throw new ErroIdentidadeRecusada("EMAIL_NAO_CONFIRMADO");
  if (situacao.banido) throw new ErroIdentidadeRecusada("IDENTIDADE_BANIDA");
}
