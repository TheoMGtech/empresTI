"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useState, type ReactNode } from "react";
import superjson from "superjson";

import { trpc } from "@/trpc/cliente";

// Erro 4xx (sessão, permissão, regra, entrada) não muda com nova tentativa; falha de rede ou 5xx
// tenta mais uma vez antes de virar estado de erro na tela.
export function deveRepetirConsulta(falhas: number, erro: unknown) {
  const status = erro instanceof TRPCClientError ? erro.data?.httpStatus : undefined;
  const ehErroDoCliente = typeof status === "number" && status >= 400 && status < 500;
  return falhas < 1 && !ehErroDoCliente;
}

export function ProvedorTRPC({ children }: { children: ReactNode }) {
  const [clienteConsulta] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: deveRepetirConsulta }, mutations: { retry: false } },
      }),
  );
  const [clienteTRPC] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "/api/trpc",
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={clienteTRPC} queryClient={clienteConsulta}>
      <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
