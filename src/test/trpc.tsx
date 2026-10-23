import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { ReactNode } from "react";

import type { RouterAplicacao } from "@/server/api/raiz";
import { trpc } from "@/trpc/cliente";

type Manipulador = (entrada: unknown) => unknown;
export type ManipuladoresTRPC = Record<string, Manipulador>;

function criarLinkDeTeste(manipuladores: ManipuladoresTRPC): TRPCLink<RouterAplicacao> {
  return () =>
    ({ op }) =>
      observable((observador) => {
        const manipulador = manipuladores[op.path];

        Promise.resolve()
          .then(() => {
            if (!manipulador) throw new Error(`Procedimento sem simulação: ${op.path}`);
            return manipulador(op.input);
          })
          .then(
            (dados) => {
              observador.next({ result: { type: "data", data: dados } });
              observador.complete();
            },
            (erro: unknown) => {
              observador.error(
                erro instanceof TRPCClientError
                  ? erro
                  : TRPCClientError.from(erro instanceof Error ? erro : new Error(String(erro))),
              );
            },
          );
      });
}

export function erroTRPC(codigo: "UNAUTHORIZED" | "INTERNAL_SERVER_ERROR", mensagem: string) {
  return TRPCClientError.from({
    error: {
      code: codigo === "UNAUTHORIZED" ? -32001 : -32603,
      message: mensagem,
      data: { code: codigo, httpStatus: codigo === "UNAUTHORIZED" ? 401 : 500 },
    },
  });
}

export function renderizarComTRPC(interface_: ReactNode, manipuladores: ManipuladoresTRPC) {
  const clienteConsulta = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const clienteTRPC = trpc.createClient({ links: [criarLinkDeTeste(manipuladores)] });

  return render(
    <trpc.Provider client={clienteTRPC} queryClient={clienteConsulta}>
      <QueryClientProvider client={clienteConsulta}>{interface_}</QueryClientProvider>
    </trpc.Provider>,
  );
}
