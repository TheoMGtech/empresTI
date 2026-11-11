// Datas de calendário do EmpresTI. O dia vale no fuso de São Paulo (Spec 005 e Spec 006): a
// devolução vence no fim do dia `devolverAte`, e o prazo conta da data da retirada.

export const FUSO_OPERACAO = "America/Sao_Paulo";

/** Prazo padrão de devolução, em dias corridos (RN-SOLIC-03). */
export const PRAZO_PADRAO_DIAS = 14;

const FORMATO_DATA = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_OPERACAO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data (AAAA-MM-DD) do calendário de São Paulo no instante informado. */
export function dataEmSaoPaulo(instante: Date): string {
  return FORMATO_DATA.format(instante);
}

/** Soma dias corridos a uma data AAAA-MM-DD, sem depender de fuso nem de horário de verão. */
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Data de devolução de um empréstimo confirmado no instante informado (RN-SOLIC-03). */
export function calcularDevolverAte(agora: Date): string {
  return somarDias(dataEmSaoPaulo(agora), PRAZO_PADRAO_DIAS);
}

/** Converte o valor de uma coluna `DATE` lida pelo Prisma (meia-noite UTC) em AAAA-MM-DD. */
export function formatarDataDoBanco(data: Date): string {
  return data.toISOString().slice(0, 10);
}
