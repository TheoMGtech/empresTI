import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaginaInicial from "@/app/page";
import {
  MENSAGEM_CREDENCIAIS_INVALIDAS,
  MENSAGEM_FALHA_INESPERADA,
} from "@/components/login/formulario-login";
import { erroTRPC, renderizarComTRPC } from "@/test/trpc";

const { substituir } = vi.hoisted(() => ({ substituir: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituir, push: vi.fn(), prefetch: vi.fn() }),
}));

const CREDENCIAIS = { email: "colaborador@empresa.com", senha: "senha-de-teste" };

afterEach(() => {
  cleanup();
  substituir.mockReset();
});

function preencherEEnviar({ email, senha }: { email: string; senha: string }) {
  fireEvent.input(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.input(screen.getByLabelText("Senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

function renderizarSemSessao(manipuladores: Record<string, (entrada: unknown) => unknown> = {}) {
  return renderizarComTRPC(<PaginaInicial />, {
    "autenticacao.sessao": () => ({ autenticado: false }),
    ...manipuladores,
  });
}

// CA-LOGIN-07: validação, sucesso, falha genérica, sessão existente e logout,
// todos sem credenciais reais.
describe("CA-LOGIN-07 — tela de login", () => {
  it("CA-LOGIN-01/CA-LOGIN-09 — renderiza o login em / sem a tela técnica nem credenciais de teste", async () => {
    renderizarSemSessao();

    expect(
      screen.getByRole("heading", { level: 1, name: "Acesso ao sistema de empréstimo interno." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(screen.queryByText(/a base está de pé/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contas de teste/i)).not.toBeInTheDocument();
  });

  it("RS-LOGIN-03 — envio anterior à hidratação não coloca credenciais na URL", () => {
    renderizarSemSessao();

    expect(screen.getByLabelText("Senha").closest("form")).toHaveAttribute("method", "post");
  });

  it("CA-LOGIN-02 — bloqueia entradas inválidas no cliente, sem chamar o servidor", async () => {
    const entrar = vi.fn();
    renderizarSemSessao({ "autenticacao.entrar": entrar });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(
      "Informe um e-mail válido.",
    );

    preencherEEnviar({ email: "sem-arroba", senha: "senha-de-teste" });

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(entrar).not.toHaveBeenCalled();
  });

  it("RF-LOGIN-05/RF-LOGIN-06 — mostra Entrando..., impede envio duplicado e abre o catálogo", async () => {
    let concluirEntrada: (valor: { autenticado: true }) => void = () => {};
    const entrar = vi.fn(
      () =>
        new Promise((resolver) => {
          concluirEntrada = resolver;
        }),
    );
    renderizarSemSessao({ "autenticacao.entrar": entrar });

    preencherEEnviar(CREDENCIAIS);

    const botao = await screen.findByRole("button", { name: "Entrando..." });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(entrar).toHaveBeenCalledTimes(1);
    expect(entrar).toHaveBeenCalledWith(CREDENCIAIS);

    concluirEntrada({ autenticado: true });

    await waitFor(() => expect(substituir).toHaveBeenCalledWith("/catalogo"));
    expect(screen.getByRole("status")).toHaveTextContent("Abrindo o catálogo.");
    expect(screen.queryByText("Acesso confirmado")).not.toBeInTheDocument();
  });

  it("CA-LOGIN-03/RF-LOGIN-04 — exibe mensagem genérica para credenciais inválidas", async () => {
    renderizarSemSessao({
      "autenticacao.entrar": () => {
        throw erroTRPC("UNAUTHORIZED", MENSAGEM_CREDENCIAIS_INVALIDAS);
      },
    });

    preencherEEnviar(CREDENCIAIS);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_CREDENCIAIS_INVALIDAS),
    );
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("RF-LOGIN-08 — não expõe detalhes internos em falhas inesperadas", async () => {
    renderizarSemSessao({
      "autenticacao.entrar": () => {
        throw erroTRPC("INTERNAL_SERVER_ERROR", "detalhe interno: postgresql://banco");
      },
    });

    preencherEEnviar(CREDENCIAIS);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_FALHA_INESPERADA),
    );
    expect(screen.queryByText(/detalhe interno|postgresql/)).not.toBeInTheDocument();
  });

  it("CA-LOGIN-05 — sessão válida ao carregar / redireciona para /catalogo", async () => {
    renderizarComTRPC(<PaginaInicial />, {
      "autenticacao.sessao": () => ({ autenticado: true }),
    });

    await waitFor(() => expect(substituir).toHaveBeenCalledWith("/catalogo"));
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByText("Acesso confirmado")).not.toBeInTheDocument();
  });

  it("CA-LOGIN-06 — sem sessão, / mostra o formulário e não redireciona", async () => {
    renderizarSemSessao();

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(substituir).not.toHaveBeenCalled();
  });
});
