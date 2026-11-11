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

const FORMATO_SAO_PAULO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Instante (retirada, devolução) no formato `dd/mmm`, no calendário de São Paulo (DF-2). */
export function formatarInstanteCurto(instante: Date) {
  const partes = FORMATO_SAO_PAULO.formatToParts(instante);
  const dia = partes.find((parte) => parte.type === "day")?.value;
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const nomeMes = MESES_CURTOS[mes - 1];

  return dia && nomeMes ? `${dia}/${nomeMes}` : "";
}

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
