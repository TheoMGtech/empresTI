const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

/**
 * Data de calendário `AAAA-MM-DD`, já no calendário de São Paulo pelo servidor, no formato do
 * layout (`14/set`). Não passa por `Date`, para o fuso do navegador não mudar o dia.
 */
export function formatarDataCurta(dataCalendario: string) {
  const [, mes, dia] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataCalendario)?.slice(1) ?? [];
  const nomeMes = MESES_CURTOS[Number(mes) - 1];

  if (!dia || !nomeMes) return dataCalendario;

  return `${dia}/${nomeMes}`;
}
