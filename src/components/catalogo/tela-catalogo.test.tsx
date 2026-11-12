import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ItemCatalogo } from "@/components/catalogo/categorias";
import {
  MENSAGEM_CATALOGO_VAZIO,
  MENSAGEM_FALHA_CATALOGO,
  TelaCatalogo,
} from "@/components/catalogo/tela-catalogo";
import { ProvedorSessao, type SessaoAplicacao } from "@/components/shell/sessao";
import { formatarDataCurta } from "@/lib/datas";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";

// Dados fictícios de teste, no formato da carga inicial da Spec 002.
const URL_FOTO = "https://exemplo-ficticio.supabase.co/storage/v1/object/public/equipamentos";

function item(
  patrimonio: string,
  nome: string,
  categoria: ItemCatalogo["categoria"],
  disponibilidade: ItemCatalogo["disponibilidade"] = { estado: "disponivel" },
  imagemUrl: string | null = `${URL_FOTO}/${patrimonio}.jpg`,
): ItemCatalogo {
  return { patrimonio, nome, categoria, imagemUrl, disponibilidade };
}

const CARGA: ItemCatalogo[] = [
  item("TI-0001", "Notebook 14 polegadas", "notebook"),
  item("TI-0002", "Notebook 15 polegadas", "notebook", {
    estado: "emprestado",
    devolverAte: "2026-09-14",
  }),
  item("TI-0003", "Notebook 13 polegadas", "notebook"),
  item("TI-0004", "Notebook 15 polegadas", "notebook", { estado: "manutencao" }),
  item("TI-0005", "Monitor 24 polegadas", "monitor"),
  item("TI-0006", "Monitor 27 polegadas", "monitor"),
  item("TI-0007", "Monitor 22 polegadas", "monitor", { estado: "manutencao" }),
  item("TI-0008", "Cabo HDMI 2 m", "cabo", { estado: "disponivel" }, null),
  item("TI-0009", "Cabo USB-C 1 m", "cabo"),
  item("TI-0010", "Cabo de rede 3 m", "cabo"),
  item("TI-0011", "Webcam Full HD", "camera"),
  item("TI-0012", "Câmera compacta", "camera"),
];

const COLABORADORA: SessaoAplicacao = { nomeExibicao: "Marina Alves", papel: "colaborador" };
const OPERACOES: SessaoAplicacao = { nomeExibicao: "Rafael Lima", papel: "operacoes" };

function listarCarga() {
  return { itens: CARGA, proximoCursor: null, resumo: { total: 12, disponiveis: 9 } };
}

function renderizar(manipuladores: ManipuladoresTRPC, sessao: SessaoAplicacao = COLABORADORA) {
  return renderizarComTRPC(
    <ProvedorSessao value={sessao}>
      <TelaCatalogo />
    </ProvedorSessao>,
    manipuladores,
  );
}

async function cartao(nomeOuPatrimonio: string) {
  await screen.findAllByRole("article");
  const alvo = document.querySelector<HTMLElement>(`[data-patrimonio="${nomeOuPatrimonio}"]`);
  if (!alvo) throw new Error(`Card ${nomeOuPatrimonio} não encontrado`);
  return within(alvo);
}

afterEach(() => {
  cleanup();
});

describe("T-CATALOGO-04 — tela e cards", () => {
  it("CA-CATALOGO-01/RF-CATALOGO-05 — mostra os 12 equipamentos e a contagem do cabeçalho", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    expect(await screen.findAllByRole("article")).toHaveLength(12);
    expect(screen.getByRole("heading", { level: 1, name: "Catálogo" })).toBeInTheDocument();
    expect(screen.getByText("12 equipamentos · 9 disponíveis agora")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Regras de empréstimo" })).toHaveTextContent(
      "Até 3 itens por pessoa, com prazo padrão de 14 dias.",
    );
  });

  it("CA-CATALOGO-04 — TI-0004 e TI-0007 aparecem em manutenção e sem ação", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    for (const patrimonio of ["TI-0004", "TI-0007"]) {
      const card = await cartao(patrimonio);
      expect(card.getByText("Manutenção")).toBeInTheDocument();
      expect(card.queryByRole("link")).not.toBeInTheDocument();
      expect(card.queryByText("Solicitar")).not.toBeInTheDocument();
    }
  });

  it("RF-CATALOGO-06 — card disponível abre o detalhe; emprestado não tem ação", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    const disponivel = await cartao("TI-0001");
    expect(disponivel.getByText("Disponível")).toBeInTheDocument();
    expect(disponivel.getByRole("link")).toHaveAttribute("href", "/catalogo/TI-0001");
    expect(disponivel.getByText("Solicitar")).toBeInTheDocument();

    const emprestado = await cartao("TI-0002");
    expect(emprestado.queryByRole("link")).not.toBeInTheDocument();
  });

  it("RF-CATALOGO-06 — Operações abre o detalhe de item indisponível", async () => {
    renderizar({ "equipamentos.listar": listarCarga }, OPERACOES);

    const manutencao = await cartao("TI-0004");
    expect(manutencao.getByRole("link")).toHaveAttribute("href", "/catalogo/TI-0004");
  });

  it("RF-CATALOGO-07 — emprestado mostra a data de devolução, sem nome de quem pegou", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    const emprestado = await cartao("TI-0002");
    expect(emprestado.getByText("Emprestado")).toBeInTheDocument();
    expect(emprestado.getByText("Emprestado · devolve 14/set")).toBeInTheDocument();
    expect(emprestado.queryByText(/Com /)).not.toBeInTheDocument();
  });

  it("RN-CATALOGO-03 — fora de uso, quando o servidor devolve, aparece com pill e sem ação", async () => {
    renderizar(
      {
        "equipamentos.listar": () => ({
          itens: [item("TI-0013", "Monitor 19 polegadas", "monitor", { estado: "fora_de_uso" })],
          proximoCursor: null,
          resumo: { total: 1, disponiveis: 0 },
        }),
      },
      OPERACOES,
    );

    const card = await cartao("TI-0013");
    expect(card.getByText("Fora de uso")).toBeInTheDocument();
    expect(screen.getByText("1 equipamento · 0 disponíveis agora")).toBeInTheDocument();
  });

  it("RF-CATALOGO-03 — mostra a fotografia de 40×40 quando existe", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    const card = await cartao("TI-0001");
    const miniatura = card.getByRole("presentation", { hidden: true }) as HTMLImageElement;
    expect(miniatura.tagName).toBe("IMG");
    expect(miniatura).toHaveAttribute("src", `${URL_FOTO}/TI-0001.jpg`);
    expect(miniatura).toHaveAttribute("width", "40");
  });

  it("CA-CATALOGO-06 — fotografia ausente exibe o ícone da categoria", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    await cartao("TI-0008");
    const alvo = document.querySelector('[data-patrimonio="TI-0008"] [data-miniatura]');
    expect(alvo).toHaveAttribute("data-miniatura", "icone");
    expect(alvo?.querySelector("img")).toBeNull();
    expect(alvo?.querySelector("svg")).not.toBeNull();
  });

  it("CA-CATALOGO-06 — fotografia que não carrega cai para o ícone da categoria", async () => {
    renderizar({ "equipamentos.listar": listarCarga });

    await cartao("TI-0005");
    const alvo = document.querySelector('[data-patrimonio="TI-0005"] [data-miniatura]');
    const imagem = alvo?.querySelector("img");
    expect(imagem).not.toBeNull();

    fireEvent.error(imagem as HTMLImageElement);

    await waitFor(() => expect(alvo).toHaveAttribute("data-miniatura", "icone"));
  });

  it("RF-CATALOGO-05 — mostra o carregamento enquanto a lista não chega", () => {
    renderizar({ "equipamentos.listar": () => new Promise(() => undefined) });

    expect(screen.getByRole("status")).toHaveTextContent("Carregando catálogo");
  });

  it("RF-CATALOGO-05 — catálogo vazio mostra o estado vazio", async () => {
    renderizar({
      "equipamentos.listar": () => ({
        itens: [],
        proximoCursor: null,
        resumo: { total: 0, disponiveis: 0 },
      }),
    });

    expect(await screen.findByText(MENSAGEM_CATALOGO_VAZIO)).toBeInTheDocument();
    expect(screen.getByText("0 equipamentos · 0 disponíveis agora")).toBeInTheDocument();
  });

  it("RF-CATALOGO-05 — falha ao carregar permite tentar de novo", async () => {
    let chamadas = 0;
    renderizar({
      "equipamentos.listar": () => {
        chamadas += 1;
        if (chamadas === 1) throw erroTRPC("INTERNAL_SERVER_ERROR", "falha");
        return listarCarga();
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAGEM_FALHA_CATALOGO);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findAllByRole("article")).toHaveLength(12);
  });

  it("CA-CATALOGO-08 — Mostrar mais pede a próxima página pelo cursor, sem duplicar", async () => {
    const listar = vi.fn((entrada: unknown) => {
      const { cursor } = entrada as { cursor?: string };
      return cursor
        ? { itens: CARGA.slice(6), proximoCursor: null, resumo: { total: 12, disponiveis: 9 } }
        : {
            itens: CARGA.slice(0, 6),
            proximoCursor: "TI-0006",
            resumo: { total: 12, disponiveis: 9 },
          };
    });
    renderizar({ "equipamentos.listar": listar });

    expect(await screen.findAllByRole("article")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar mais" }));

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(12));
    expect(listar).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "TI-0006" }));
    expect(screen.queryByRole("button", { name: "Mostrar mais" })).not.toBeInTheDocument();
  });

  it("RF-CATALOGO-07 — formata a data de calendário no padrão do layout", () => {
    expect(formatarDataCurta("2026-09-14")).toBe("14/set");
    expect(formatarDataCurta("2026-01-02")).toBe("02/jan");
    expect(formatarDataCurta("data-invalida")).toBe("data-invalida");
  });
});
