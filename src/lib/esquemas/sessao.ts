import { z } from "zod";

// Papéis da Spec 002 (D6, RN-SESSAO-01). Espelham o enum `PapelMembership` do Prisma; o teste do
// esquema falha se os dois divergirem.
export const PAPEIS = ["colaborador", "operacoes"] as const;

export const esquemaPapel = z.enum(PAPEIS);

// Saída de `sessao.atual` (RF-SESSAO-06, CA-SESSAO-05): só nome de exibição e papel. Sem nome
// cadastrado, `nomeExibicao` é `null` e a interface mostra o papel (D-SESSAO-02).
export const esquemaSessaoAtual = z.strictObject({
  nomeExibicao: z.string().trim().min(1).nullable(),
  papel: esquemaPapel,
});

export type Papel = z.infer<typeof esquemaPapel>;
export type SessaoAtual = z.infer<typeof esquemaSessaoAtual>;
