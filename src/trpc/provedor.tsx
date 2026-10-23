"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import superjson from "superjson";

import { trpc } from "@/trpc/cliente";

export function ProvedorTRPC({ children }: { children: ReactNode }) {
  const [clienteConsulta] = useState(() => new QueryClient());
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
