import { describe, expect, it } from "vitest";

import {
  PRAZO_PADRAO_DIAS,
  calcularDevolverAte,
  dataEmSaoPaulo,
  formatarDataDoBanco,
  somarDias,
} from "@/lib/prazos";

describe("prazos", () => {
  it("RN-SOLIC-03 — o prazo padrão é de 14 dias corridos", () => {
    expect(PRAZO_PADRAO_DIAS).toBe(14);
  });

  it.each([
    ["meio do dia", "2026-11-11T15:00:00Z", "2026-11-11"],
    ["noite em São Paulo, madrugada em UTC", "2026-11-12T02:59:59Z", "2026-11-11"],
    ["meia-noite em São Paulo", "2026-11-12T03:00:00Z", "2026-11-12"],
  ])("CA-SOLIC-10 — a data vale no calendário de São Paulo (%s)", (_caso, instante, data) => {
    expect(dataEmSaoPaulo(new Date(instante))).toBe(data);
  });

  it.each([
    ["dentro do mês", "2026-11-11T15:00:00Z", "2026-11-25"],
    ["retirada à noite em São Paulo", "2026-11-12T02:00:00Z", "2026-11-25"],
    ["virada de ano", "2026-12-25T15:00:00Z", "2027-01-08"],
    ["fevereiro de ano não bissexto", "2027-02-20T15:00:00Z", "2027-03-06"],
    ["fevereiro de ano bissexto", "2028-02-20T15:00:00Z", "2028-03-05"],
  ])("CA-SOLIC-10 — devolverAte com data fixa: %s", (_caso, instante, esperado) => {
    expect(calcularDevolverAte(new Date(instante))).toBe(esperado);
  });

  it("CA-SOLIC-10 — somar dias não depende do fuso do processo", () => {
    expect(somarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(somarDias("2026-11-11", 14)).toBe("2026-11-25");
  });

  it("CA-SOLIC-10 — a coluna DATE lida pelo Prisma volta como AAAA-MM-DD", () => {
    expect(formatarDataDoBanco(new Date("2026-11-25T00:00:00Z"))).toBe("2026-11-25");
  });
});
