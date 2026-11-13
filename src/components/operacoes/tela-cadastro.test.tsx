import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TelaDetalhe } from "@/components/catalogo/tela-detalhe";
import { MENSAGEM_EMPRESTIMO_EM_ABERTO } from "@/components/operacoes/controle-situacao";
import {
  MENSAGEM_CATEGORIA_OBRIGATORIA,
  MENSAGEM_PATRIMONIO_DUPLICADO,
  TelaCadastro,
} from "@/components/operacoes/tela-cadastro";
import { ProvedorSessao, type SessaoAplicacao } from "@/components/shell/sessao";
import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { erroTRPC, renderizarComTRPC, type ManipuladoresTRPC } from "@/test/trpc";
import type { SaidasRouter } from "@/trpc/tipos";

const { navegacao } = vi.hoisted(() => ({ navegacao: { empurrar: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navegacao.empurrar, replace: vi.fn(), prefetch: vi.fn() }),
}));

// Dados fictícios de teste.
const ULTIMOS = [
  { patrimonio: "TI-0012", nome: "Câmera compacta", criadoEm: new Date("2026-11-10T13:00:00Z") },
];

function renderizarCadastro(manipuladores: ManipuladoresTRPC = {}) {
  return renderizarComTRPC(<TelaCadastro />, {
    "operacoes.ultimosCadastros": () => ULTIMOS,
    ...manipuladores,
  });
}

function preencher(campos: Partial<Record<"Nome" | "Patrimônio", string>>) {
  for (const [rotulo, valor] of Object.entries(campos)) {
    fireEvent.input(screen.getByLabelText(rotulo), { target: { value: valor } });
  }
}

function escolherCategoria(valor: string) {
  fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: valor } });
}

beforeEach(() => {
  navegacao.empurrar.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("T-OPER-07 — cadastro de equipamento", () => {
  it("RF-OPER-05 — valida no cliente com o esquema do servidor, sem chamar o servidor", async () => {
    const cadastrar = vi.fn();
    renderizarCadastro({ "equipamentos.cadastrar": cadastrar });

    preencher({ Patrimônio: "PAT-12" });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();
    expect(screen.getByText("Use o formato TI-0000.")).toBeInTheDocument();
    expect(screen.getByText(MENSAGEM_CATEGORIA_OBRIGATORIA)).toBeInTheDocument();
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it("CA-OPER-05 — Cadastrar envia os dados e abre o detalhe do equipamento criado", async () => {
    const cadastrar = vi.fn<(entrada: unknown) => { id: string; patrimonio: string }>(() => ({
      id: "55555555-5555-4555-8555-555555555555",
      patrimonio: "TI-0013",
    }));
    renderizarCadastro({ "equipamentos.cadastrar": cadastrar });

    preencher({ Nome: "Monitor 19 polegadas", Patrimônio: "TI-0013" });
    escolherCategoria("monitor");
    fireEvent.click(screen.getByRole("radio", { name: "Em manutenção" }));
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(navegacao.empurrar).toHaveBeenCalledWith("/catalogo/TI-0013"));
    expect(cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Monitor 19 polegadas",
        categoria: "monitor",
        patrimonio: "TI-0013",
        situacao: "em_manutencao",
      }),
    );
    const enviado = cadastrar.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(enviado.numeroSerie).toBeUndefined();
  });

  it("RF-OPER-06 — Cadastrar e adicionar outro limpa o formulário e mantém a categoria", async () => {
    const ultimos = vi.fn(() => ULTIMOS);
    renderizarCadastro({
      "operacoes.ultimosCadastros": ultimos,
      "equipamentos.cadastrar": () => ({
        id: "55555555-5555-4555-8555-555555555555",
        patrimonio: "TI-0013",
      }),
    });

    preencher({ Nome: "Cabo HDMI 3 m", Patrimônio: "TI-0013" });
    escolherCategoria("cabo");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar e adicionar outro" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Equipamento TI-0013 cadastrado.");
    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(screen.getByLabelText("Patrimônio")).toHaveValue("");
    expect(screen.getByLabelText("Categoria")).toHaveValue("cabo");
    expect(navegacao.empurrar).not.toHaveBeenCalled();
    await waitFor(() => expect(ultimos).toHaveBeenCalledTimes(2));
  });

  it("CA-OPER-06 — patrimônio repetido aparece no próprio campo", async () => {
    renderizarCadastro({
      "equipamentos.cadastrar": () => {
        throw erroTRPC("CONFLICT", "duplicado", { motivo: "PATRIMONIO_DUPLICADO" });
      },
    });

    preencher({ Nome: "Notebook 14 polegadas", Patrimônio: "TI-0001" });
    escolherCategoria("notebook");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText(MENSAGEM_PATRIMONIO_DUPLICADO)).toBeInTheDocument();
    expect(screen.getByLabelText("Patrimônio")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Nome")).toHaveValue("Notebook 14 polegadas");
  });

  it.each([
    ["TOO_MANY_REQUESTS", MENSAGENS_LIMITE.excedido],
    ["SERVICE_UNAVAILABLE", MENSAGENS_LIMITE.indisponivel],
  ] as const)("CA-SEG-17 — cadastrar com %s mostra a mensagem própria e mantém o formulário", async (codigo, mensagem) => {
    renderizarCadastro({
      "equipamentos.cadastrar": () => {
        throw erroTRPC(codigo, "mensagem do servidor");
      },
    });

    preencher({ Nome: "Notebook 14 polegadas", Patrimônio: "TI-0001" });
    escolherCategoria("notebook");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Notebook 14 polegadas");
    expect(navegacao.empurrar).not.toHaveBeenCalled();
  });

  it("RF-OPER-06 — a prévia acompanha o formulário e não tem ação", async () => {
    renderizarCadastro();

    preencher({ Nome: "Webcam 4K", Patrimônio: "TI-0020" });
    escolherCategoria("camera");
    fireEvent.click(screen.getByRole("radio", { name: "Fora de uso" }));

    const previa = within(screen.getByRole("region", { name: "Prévia no catálogo" }));
    expect(await previa.findByText("Webcam 4K")).toBeInTheDocument();
    expect(previa.getByText("Câmera · TI-0020")).toBeInTheDocument();
    expect(previa.getByText("Fora de uso")).toBeInTheDocument();
    expect(previa.queryByRole("link")).not.toBeInTheDocument();
  });

  it("CA-OPER-10 — mostra os últimos cadastros", async () => {
    renderizarCadastro();

    const ultimos = within(await screen.findByRole("region", { name: "Últimos cadastros" }));
    expect(await ultimos.findByText(/Câmera compacta/)).toBeInTheDocument();
    expect(ultimos.getByText("10/nov")).toBeInTheDocument();
  });
});

const DETALHE: SaidasRouter["equipamentos"]["detalhar"] = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  patrimonio: "TI-0004",
  nome: "Notebook 15 polegadas",
  categoria: "notebook",
  imagemUrl: null,
  disponibilidade: { estado: "manutencao" },
  local: null,
  ultimaDevolucao: null,
  devolverAtePrevisto: "2026-11-25",
  numeroSerie: null,
  observacoes: null,
  historico: [],
};

function renderizarDetalhe(sessao: SessaoAplicacao, manipuladores: ManipuladoresTRPC = {}) {
  return renderizarComTRPC(
    <ProvedorSessao value={sessao}>
      <TelaDetalhe patrimonio="TI-0004" />
    </ProvedorSessao>,
    {
      "equipamentos.detalhar": () => DETALHE,
      "emprestimos.meuResumo": () => ({ itensAbertos: 0, limite: 3, emAtraso: 0, prazoDias: 14 }),
      ...manipuladores,
    },
  );
}

const OPERACOES: SessaoAplicacao = { nomeExibicao: "Rafael Lima", papel: "operacoes" };

describe("T-OPER-07 — alteração de situação", () => {
  it("CA-OPER-09/DF-7 — Operações tira o item da manutenção pelo detalhe", async () => {
    const alterar = vi.fn(() => ({ id: DETALHE.id, situacao: "ativo" }));
    renderizarDetalhe(OPERACOES, { "equipamentos.alterarSituacao": alterar });

    const controle = within(await screen.findByRole("region", { name: "Situação do equipamento" }));
    expect(controle.getByRole("radio", { name: "Em manutenção" })).toBeChecked();
    expect(controle.getByRole("button", { name: "Salvar situação" })).toBeDisabled();

    fireEvent.click(controle.getByRole("radio", { name: "Disponível" }));
    fireEvent.click(controle.getByRole("button", { name: "Salvar situação" }));

    expect(await controle.findByText("Situação atualizada.")).toBeInTheDocument();
    expect(alterar).toHaveBeenCalledWith({ equipamentoId: DETALHE.id, situacao: "ativo" });
  });

  it("CA-OPER-09 — com empréstimo em aberto, a recusa aparece e a escolha volta", async () => {
    renderizarDetalhe(OPERACOES, {
      "equipamentos.alterarSituacao": () => {
        throw erroTRPC("CONFLICT", "aberto", { motivo: "EMPRESTIMO_EM_ABERTO" });
      },
    });

    const controle = within(await screen.findByRole("region", { name: "Situação do equipamento" }));
    fireEvent.click(controle.getByRole("radio", { name: "Fora de uso" }));
    fireEvent.click(controle.getByRole("button", { name: "Salvar situação" }));

    expect(await controle.findByText(MENSAGEM_EMPRESTIMO_EM_ABERTO)).toBeInTheDocument();
    expect(controle.getByRole("radio", { name: "Em manutenção" })).toBeChecked();
  });

  it.each([
    ["TOO_MANY_REQUESTS", MENSAGENS_LIMITE.excedido],
    ["SERVICE_UNAVAILABLE", MENSAGENS_LIMITE.indisponivel],
  ] as const)("CA-SEG-17 — alterar situação com %s mostra a mensagem própria", async (codigo, mensagem) => {
    renderizarDetalhe(OPERACOES, {
      "equipamentos.alterarSituacao": () => {
        throw erroTRPC(codigo, "mensagem do servidor");
      },
    });

    const controle = within(await screen.findByRole("region", { name: "Situação do equipamento" }));
    fireEvent.click(controle.getByRole("radio", { name: "Fora de uso" }));
    fireEvent.click(controle.getByRole("button", { name: "Salvar situação" }));

    expect(await controle.findByRole("alert")).toHaveTextContent(mensagem);
  });

  it("RN-SESSAO-02 — colaborador não vê o controle de situação", async () => {
    renderizarDetalhe({ nomeExibicao: "Marina Alves", papel: "colaborador" });

    await screen.findByRole("heading", { level: 1, name: "Notebook 15 polegadas" });
    expect(
      screen.queryByRole("region", { name: "Situação do equipamento" }),
    ).not.toBeInTheDocument();
  });
});
