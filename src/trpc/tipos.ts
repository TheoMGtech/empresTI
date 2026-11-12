import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { RouterAplicacao } from "@/server/api/raiz";

// Tipos inferidos do AppRouter (ADR-001 §4): a tela não declara contrato à mão.
export type EntradasRouter = inferRouterInputs<RouterAplicacao>;
export type SaidasRouter = inferRouterOutputs<RouterAplicacao>;
