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

const FORMATO_ISO_SAO_PAULO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Data de calendário `AAAA-MM-DD` de um instante, no fuso de São Paulo. */
export function dataCalendarioSaoPaulo(instante: Date) {
  return FORMATO_ISO_SAO_PAULO.format(instante);
}

/** Dias corridos entre duas datas de calendário `AAAA-MM-DD`. */
export function diasEntre(inicio: string, fim: string) {
  const emDias = (data: string) => {
    const [ano, mes, dia] = data.split("-").map(Number);
    return Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1) / 86_400_000;
  };
  return Math.round(emDias(fim) - emDias(inicio));
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
