import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaginaInicial from "@/app/page";
import {
  MENSAGEM_CREDENCIAIS_INVALIDAS,
  MENSAGEM_FALHA_INESPERADA,
} from "@/components/login/formulario-login";
import { MENSAGEM_FALHA_SAIDA } from "@/components/login/sessao-ativa";
import { erroTRPC, renderizarComTRPC } from "@/test/trpc";

const CREDENCIAIS = { email: "colaborador@empresa.com", senha: "senha-de-teste" };

afterEach(() => {
  cleanup();
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

describe("tela de login", () => {
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

  it("RF-LOGIN-05/CA-LOGIN-04 — mostra Entrando..., impede envio duplicado e confirma o acesso", async () => {
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

    expect(
      await screen.findByRole("heading", { level: 2, name: "Acesso confirmado" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
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

  it("CA-LOGIN-05 — reconhece sessão existente ao carregar /", async () => {
    renderizarComTRPC(<PaginaInicial />, {
      "autenticacao.sessao": () => ({ autenticado: true }),
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Acesso confirmado" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it("CA-LOGIN-06 — Sair encerra a sessão e volta ao formulário", async () => {
    const sair = vi.fn(() => ({ autenticado: false }));
    renderizarComTRPC(<PaginaInicial />, {
      "autenticacao.sessao": () => ({ autenticado: true }),
      "autenticacao.sair": sair,
    });

    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(sair).toHaveBeenCalledTimes(1);
  });

  it("RF-LOGIN-08 — mantém a sessão e informa falha ao sair", async () => {
    renderizarComTRPC(<PaginaInicial />, {
      "autenticacao.sessao": () => ({ autenticado: true }),
      "autenticacao.sair": () => {
        throw erroTRPC("INTERNAL_SERVER_ERROR", "detalhe interno");
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(MENSAGEM_FALHA_SAIDA));
    expect(
      screen.getByRole("heading", { level: 2, name: "Acesso confirmado" }),
    ).toBeInTheDocument();
  });
});
