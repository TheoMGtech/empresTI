// Vincula uma identidade já existente ao tenant inicial (D1), com papel e nome de exibição
// opcionais (CA-SESSAO-12). Sem papel, vale `colaborador`, o papel do professor. Verificação e
// escrita ocorrem na mesma transação. Não cria usuário e não grava empréstimos nem eventos de
// auditoria. Vínculo existente nunca é alterado: divergência aborta.
import { PapelMembership, type PrismaClient } from "@prisma/client";

import { SLUG_TENANT_INICIAL } from "./carga.ts";
import { criarConsultaSql, verificarIdentidade } from "./identidade.ts";

const PAPEL_PADRAO: PapelMembership = PapelMembership.colaborador;
const PAPEIS_VALIDOS: readonly string[] = Object.values(PapelMembership);

const MENSAGENS = {
  TENANT_INEXISTENTE: "O tenant inicial não existe. Execute a carga antes do vínculo.",
  VINCULO_EM_OUTRO_TENANT: "A identidade já tem vínculo em outro tenant.",
  PAPEL_DIVERGENTE: "A identidade já tem vínculo com outro papel.",
  PAPEL_INVALIDO: "Papel inválido. Use colaborador ou operacoes.",
  NOME_INVALIDO: "O nome de exibição não pode ficar em branco.",
  NOME_DIVERGENTE: "A identidade já tem vínculo com outro nome de exibição.",
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

export type DadosVinculo = {
  userId: string;
  /** `colaborador` ou `operacoes`; sem valor, `colaborador`. */
  papel?: string;
  /** Opcional; espaço em branco nas pontas é removido. */
  nomeExibicao?: string;
};

function validarPapel(papel: string | undefined): PapelMembership {
  if (papel === undefined) return PAPEL_PADRAO;
  if (!PAPEIS_VALIDOS.includes(papel)) throw new ErroVinculo("PAPEL_INVALIDO");
  return papel as PapelMembership;
}

function validarNome(nome: string | undefined): string | null {
  if (nome === undefined) return null;
  const limpo = nome.trim();
  if (limpo === "") throw new ErroVinculo("NOME_INVALIDO");
  return limpo;
}

export async function vincularUsuario(
  prisma: Pick<PrismaClient, "$transaction">,
  dados: DadosVinculo,
): Promise<ResultadoVinculo> {
  // Entradas inválidas são recusadas antes de abrir a transação.
  const papel = validarPapel(dados.papel);
  const nomeExibicao = validarNome(dados.nomeExibicao);
  const { userId } = dados;

  return prisma.$transaction(async (transacao) => {
    await verificarIdentidade(criarConsultaSql(transacao), userId);

    const tenant = await transacao.tenant.findUnique({
      where: { slug: SLUG_TENANT_INICIAL },
      select: { id: true },
    });
    if (!tenant) throw new ErroVinculo("TENANT_INEXISTENTE");

    const vinculos = await transacao.membership.findMany({
      where: { userId },
      select: { tenantId: true, role: true, nomeExibicao: true },
    });
    if (vinculos.some((vinculo) => vinculo.tenantId !== tenant.id)) {
      throw new ErroVinculo("VINCULO_EM_OUTRO_TENANT");
    }

    const [existente] = vinculos;
    if (existente) {
      if (existente.role !== papel) throw new ErroVinculo("PAPEL_DIVERGENTE");
      if (nomeExibicao !== null && existente.nomeExibicao !== nomeExibicao) {
        throw new ErroVinculo("NOME_DIVERGENTE");
      }
      return "ja_existente";
    }

    await transacao.membership.create({
      data: { userId, tenantId: tenant.id, role: papel, nomeExibicao },
    });
    return "criado";
  });
}

/** Vínculo do professor (Spec 002): papel `colaborador`, sem nome de exibição. */
export function vincularProfessor(
  prisma: Pick<PrismaClient, "$transaction">,
  userId: string,
): Promise<ResultadoVinculo> {
  return vincularUsuario(prisma, { userId });
}
