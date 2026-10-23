import { describe, expect, it, vi } from "vitest";

const { redirecionar } = vi.hoisted(() => ({ redirecionar: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: redirecionar }));

import PaginaLogin from "@/app/login/page";

describe("rota /login", () => {
  it("CA-LOGIN-09 — redireciona para a tela inicial", () => {
    PaginaLogin();

    expect(redirecionar).toHaveBeenCalledWith("/");
  });
});
