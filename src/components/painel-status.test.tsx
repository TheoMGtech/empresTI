import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PainelStatus } from "@/components/painel-status";

const refetch = vi.fn();

vi.mock("@/trpc/cliente", () => ({
  trpc: {
    tecnico: {
      status: {
        useQuery: () => ({
          data: {
            ambiente: "test",
            bancoOperacional: true,
            quantidadeRegistros: 0,
            supabaseVinculado: true,
            verificadoEm: "2026-10-19T10:00:00.000Z",
            versao: "0.1.0",
          },
          isError: false,
          isFetching: false,
          isPending: false,
          refetch,
        }),
      },
    },
  },
}));

describe("PainelStatus", () => {
  beforeEach(() => refetch.mockClear());

  it("AZ-05 — apresenta o estado técnico sem comportamento de produto", () => {
    render(<PainelStatus />);

    expect(
      screen.getByRole("heading", { level: 1, name: "A base está de pé." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API técnica" })).toBeInTheDocument();
    expect(screen.queryByText(/emprestar/i)).not.toBeInTheDocument();
  });
});
