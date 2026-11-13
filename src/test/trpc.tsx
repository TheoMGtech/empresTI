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

// Código JSON-RPC e status HTTP de cada código tRPC usado nas simulações.
const CODIGOS_TRPC = {
  BAD_REQUEST: [-32600, 400],
  UNAUTHORIZED: [-32001, 401],
  FORBIDDEN: [-32003, 403],
  NOT_FOUND: [-32004, 404],
  CONFLICT: [-32009, 409],
  PRECONDITION_FAILED: [-32012, 412],
  INTERNAL_SERVER_ERROR: [-32603, 500],
  SERVICE_UNAVAILABLE: [-32603, 503],
  TOO_MANY_REQUESTS: [-32029, 429],
} as const;

export type CodigoTRPCSimulado = keyof typeof CODIGOS_TRPC;

/** Erro no formato do `errorFormatter` (CA-SESSAO-11): `code`, `motivo` e `campos`. */
export function erroTRPC(
  codigo: CodigoTRPCSimulado,
  mensagem: string,
  extras: { motivo?: string; campos?: Record<string, string[]> } = {},
) {
  const [codigoJson, status] = CODIGOS_TRPC[codigo];

  return TRPCClientError.from({
    error: {
      code: codigoJson,
      message: mensagem,
      data: {
        code: codigo,
        httpStatus: status,
        motivo: extras.motivo ?? null,
        campos: extras.campos ?? null,
      },
    },
  });
}

export function renderizarComTRPC(interface_: ReactNode, manipuladores: ManipuladoresTRPC) {
  const clienteConsulta = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const clienteTRPC = trpc.createClient({ links: [criarLinkDeTeste(manipuladores)] });

  const resultado = render(
    <trpc.Provider client={clienteTRPC} queryClient={clienteConsulta}>
      <QueryClientProvider client={clienteConsulta}>{interface_}</QueryClientProvider>
    </trpc.Provider>,
  );

  return { ...resultado, clienteConsulta };
}
