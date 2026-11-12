// @vitest-environment node
// Prova só a configuração de lint, Vitest e sharp. Não implementa nem testa a skill.
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("configuração de testes da skill imagens-equipamentos", () => {
  it("roda em ambiente Node, sem DOM", () => {
    expect(typeof window).toBe("undefined");
  });

  it("CA-IMG-05 (preparação): sharp mede 800 × 600 reais em memória", async () => {
    const origem = await sharp({
      create: { width: 1280, height: 853, channels: 3, background: "#808080" },
    })
      .jpeg()
      .toBuffer();
    const saida = await sharp(origem).resize(800, 600, { fit: "cover" }).jpeg().toBuffer();

    const { width, height, format } = await sharp(saida).metadata();

    expect({ width, height, format }).toEqual({ width: 800, height: 600, format: "jpeg" });
  });
});
