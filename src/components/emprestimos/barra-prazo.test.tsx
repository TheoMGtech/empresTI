import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { BarraPrazo } from "./barra-prazo";

const RETIRADA = new Date("2026-11-10T13:00:00Z");
const VENCIMENTO = "2026-11-24";

function preenchimento() {
  return screen.getByRole("progressbar", { name: "Prazo" }).querySelector("rect");
}

describe("T-SEG-03 — barra de prazo sem estilo inline", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    { emAtraso: false, agora: "2026-11-17T15:00:00Z" },
    { emAtraso: true, agora: "2026-11-26T15:00:00Z" },
  ])(
    "CA-SEG-06 — o HTML do servidor não tem atributo style (emAtraso=$emAtraso)",
    ({ emAtraso, agora }) => {
      const html = renderToStaticMarkup(
        <BarraPrazo
          agora={new Date(agora)}
          devolverAte={VENCIMENTO}
          emAtraso={emAtraso}
          retiradoEm={RETIRADA}
        />,
      );

      expect(html).not.toMatch(/\sstyle=/i);
      expect(html).toContain("<rect");
    },
  );

  it.each([
    { agora: "2026-11-10T15:00:00Z", emAtraso: false, largura: "0%" },
    { agora: "2026-11-17T15:00:00Z", emAtraso: false, largura: "50%" },
    { agora: "2026-11-24T15:00:00Z", emAtraso: false, largura: "100%" },
    { agora: "2026-11-26T15:00:00Z", emAtraso: true, largura: "100%" },
  ])(
    "CA-SEG-06 — mantém a proporção para as mesmas datas ($agora → $largura)",
    ({ agora, emAtraso, largura }) => {
      render(
        <BarraPrazo
          agora={new Date(agora)}
          devolverAte={VENCIMENTO}
          emAtraso={emAtraso}
          retiradoEm={RETIRADA}
        />,
      );

      expect(preenchimento()).toHaveAttribute("width", largura);
    },
  );

  it("CA-SEG-06 — mantém cores, ponta arredondada e a barra fora da árvore de acessibilidade", () => {
    const { rerender } = render(
      <BarraPrazo
        agora={new Date("2026-11-17T15:00:00Z")}
        devolverAte={VENCIMENTO}
        emAtraso={false}
        retiradoEm={RETIRADA}
      />,
    );

    expect(preenchimento()).toHaveClass("fill-(--accent-500)");
    expect(preenchimento()).toHaveAttribute("rx", "2");
    expect(preenchimento()).toHaveAttribute("height", "100%");
    expect(preenchimento()?.closest("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(
      <BarraPrazo
        agora={new Date("2026-11-26T15:00:00Z")}
        devolverAte={VENCIMENTO}
        emAtraso
        retiradoEm={RETIRADA}
      />,
    );

    expect(preenchimento()).toHaveClass("fill-[#E08A90]");
  });
});
