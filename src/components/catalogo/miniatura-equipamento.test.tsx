import { Laptop, Monitor, Usb, VideoCamera, type Icon } from "@phosphor-icons/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { CategoriaCatalogo, ItemCatalogo } from "@/components/catalogo/categorias";
import { MiniaturaEquipamento } from "@/components/catalogo/miniatura-equipamento";
import { TelaCatalogo } from "@/components/catalogo/tela-catalogo";
import { ProvedorSessao } from "@/components/shell/sessao";
import { renderizarComTRPC } from "@/test/trpc";

// Oráculo independente do mapeamento da aplicação: ícones do layout §5.11 (cabo usa `ph-usb`).
const ICONE_ESPERADO: Record<CategoriaCatalogo, Icon> = {
  notebook: Laptop,
  monitor: Monitor,
  cabo: Usb,
  camera: VideoCamera,
};

const CATEGORIAS = Object.keys(ICONE_ESPERADO) as CategoriaCatalogo[];

/** Desenho (conteúdo do `<svg>`) do ícone esperado, renderizado isoladamente. */
function desenhoEsperado(categoria: CategoriaCatalogo) {
  const Icone = ICONE_ESPERADO[categoria];
  const { container, unmount } = render(<Icone aria-hidden="true" size={20} />);
  const desenho = container.querySelector("svg")?.innerHTML;
  unmount();
  return desenho;
}

function desenhoExibido(alvo: Element | null) {
  return alvo?.querySelector("svg")?.innerHTML;
}

afterEach(() => {
  cleanup();
});

describe("T-CATALOGO-06 — ícone da categoria no lugar da fotografia", () => {
  it("CA-CATALOGO-06 — os quatro ícones de categoria têm desenhos distintos", () => {
    const desenhos = CATEGORIAS.map(desenhoEsperado);

    expect(desenhos.every((desenho) => typeof desenho === "string" && desenho.length > 0)).toBe(
      true,
    );
    expect(new Set(desenhos).size).toBe(CATEGORIAS.length);
  });

  it.each(CATEGORIAS)(
    "CA-CATALOGO-06 — sem fotografia, %s exibe o ícone da própria categoria",
    (categoria) => {
      const esperado = desenhoEsperado(categoria);
      const { container } = render(<MiniaturaEquipamento categoria={categoria} imagemUrl={null} />);
      const alvo = container.querySelector("[data-miniatura]");

      expect(alvo).toHaveAttribute("data-miniatura", "icone");
      expect(alvo?.querySelector("img")).toBeNull();
      expect(desenhoExibido(alvo)).toBe(esperado);
    },
  );

  it.each(CATEGORIAS)(
    "CA-CATALOGO-06 — fotografia que não carrega em %s cai para o ícone da própria categoria",
    async (categoria) => {
      const esperado = desenhoEsperado(categoria);
      const { container } = render(
        <MiniaturaEquipamento categoria={categoria} imagemUrl="https://exemplo.test/foto.jpg" />,
      );
      const alvo = container.querySelector("[data-miniatura]");
      const imagem = alvo?.querySelector("img");
      expect(imagem).not.toBeNull();

      fireEvent.error(imagem as HTMLImageElement);

      await waitFor(() => expect(alvo).toHaveAttribute("data-miniatura", "icone"));
      expect(desenhoExibido(alvo)).toBe(esperado);
    },
  );

  it("CA-CATALOGO-06 — no catálogo, cada card sem fotografia mostra o ícone da sua categoria", async () => {
    // Dados fictícios de teste: um item de cada categoria, todos sem fotografia.
    const itens: ItemCatalogo[] = [
      ["TI-0001", "Notebook 14 polegadas", "notebook"],
      ["TI-0005", "Monitor 24 polegadas", "monitor"],
      ["TI-0008", "Cabo HDMI 2 m", "cabo"],
      ["TI-0011", "Webcam Full HD", "camera"],
    ].map(([patrimonio, nome, categoria]) => ({
      patrimonio: patrimonio as string,
      nome: nome as string,
      categoria: categoria as CategoriaCatalogo,
      imagemUrl: null,
      disponibilidade: { estado: "disponivel" } as ItemCatalogo["disponibilidade"],
    }));
    const esperados = Object.fromEntries(CATEGORIAS.map((c) => [c, desenhoEsperado(c)]));

    renderizarComTRPC(
      <ProvedorSessao value={{ nomeExibicao: "Marina Alves", papel: "colaborador" }}>
        <TelaCatalogo />
      </ProvedorSessao>,
      {
        "equipamentos.listar": () => ({
          itens,
          proximoCursor: null,
          resumo: { total: 4, disponiveis: 4 },
        }),
      },
    );

    expect(await screen.findAllByRole("article")).toHaveLength(itens.length);
    for (const item of itens) {
      const alvo = document.querySelector(`[data-patrimonio="${item.patrimonio}"] [data-miniatura]`);
      expect(alvo).toHaveAttribute("data-miniatura", "icone");
      expect(desenhoExibido(alvo)).toBe(esperados[item.categoria]);
    }
  });
});
