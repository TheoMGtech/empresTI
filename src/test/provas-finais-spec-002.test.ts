// @vitest-environment node
//
// Provas estáticas restantes da spec 002: o que o conjunto de arquivos não pode conter.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));

const ler = (relativo: string) => readFileSync(path.join(RAIZ, relativo), "utf8");

function listar(pasta: string, filtro: (arquivo: string) => boolean) {
  return readdirSync(path.join(RAIZ, pasta), { recursive: true, encoding: "utf8" })
    .map((arquivo) => path.posix.join(pasta, arquivo.replaceAll("\\", "/")))
    .filter(filtro)
    .sort();
}

const MIGRATIONS = listar("prisma/migrations", (arquivo) => arquivo.endsWith("migration.sql"));

const ROTINAS = [
  "prisma/seed.ts",
  "prisma/vincular-professor.ts",
  ...listar(
    "prisma/rotinas",
    (arquivo) => arquivo.endsWith(".ts") && !arquivo.endsWith(".test.ts"),
  ),
];

const ARQUIVOS_DE_TESTE = [
  ...listar("src/test", (arquivo) => arquivo.endsWith(".test.ts")),
  ...listar("prisma/rotinas", (arquivo) => arquivo.endsWith(".test.ts")),
];

describe("escopo das migrations", () => {
  it("CA-DADOS-18 — as migrations esperadas existem", () => {
    expect(MIGRATIONS.map((arquivo) => arquivo.split("/")[2]?.replace(/^\d+_/, ""))).toEqual([
      "criar_saude_sistema",
      "criar_estrutura_dominio",
      "criar_auditoria",
      "reforcar_bloqueio_truncate",
    ]);
  });

  it.each(MIGRATIONS)("CA-DADOS-18 — %s não cria estrutura de empréstimos", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/emprestimo|empréstimo/i);
  });

  it.each(MIGRATIONS)("CA-DADOS-19 — %s não escreve em auth.users", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/auth\s*\.\s*"?users/i);
  });
});

describe("escopo das rotinas", () => {
  it("CA-DADOS-19 — as rotinas esperadas foram avaliadas", () => {
    expect(ROTINAS).toEqual([
      "prisma/seed.ts",
      "prisma/vincular-professor.ts",
      "prisma/rotinas/carga-inicial.ts",
      "prisma/rotinas/carga.ts",
      "prisma/rotinas/guarda-banco.ts",
      "prisma/rotinas/identidade.ts",
      "prisma/rotinas/manifesto.ts",
      "prisma/rotinas/vinculo.ts",
    ]);
  });

  it.each(ROTINAS)("CA-DADOS-19 — %s não chama cadastro nem convite de usuário", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(
      /signUp|createUser|inviteUserByEmail|generateLink|auth\.admin|@supabase/,
    );
  });

  it.each(ROTINAS)("CA-DADOS-19 — %s não escreve em auth.users", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+"?auth"?\s*\./i);
  });

  it("CA-DADOS-19 — só a verificação de identidade lê auth.users", () => {
    const comLeitura = ROTINAS.filter((arquivo) => /FROM\s+auth\.users/.test(ler(arquivo)));

    expect(comLeitura).toEqual(["prisma/rotinas/identidade.ts"]);
  });

  it.each(ROTINAS)("CA-DADOS-18 — %s não trata de empréstimos", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/\.emprestimo|INSERT\s+INTO\s+"?emprestimos/i);
  });

  it.each(ROTINAS)("CA-DADOS-22 — %s não grava auditoria", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/\.auditoria\b|INSERT\s+INTO\s+"?auditoria/i);
  });

  it.each(ROTINAS)("CA-DADOS-23 — %s não registra em log nem carrega arquivos .env", (arquivo) => {
    expect(ler(arquivo)).not.toMatch(/console\.|dotenv|--env-file|\.env\.local/);
  });
});

describe("escopo da aplicação", () => {
  it("CA-DADOS-25 — o AppRouter mantém só os procedimentos existentes", () => {
    expect(Object.keys(routerAplicacao._def.procedures).sort()).toEqual([
      "autenticacao.entrar",
      "autenticacao.sair",
      "autenticacao.sessao",
      "tecnico.status",
    ]);
  });

  it("CA-DADOS-25 — não há páginas nem rotas novas", () => {
    const rotas = listar("src/app", (arquivo) => /\/(page|route)\.tsx?$/.test(arquivo));

    expect(rotas).toEqual([
      "src/app/api/trpc/[trpc]/route.ts",
      "src/app/login/page.tsx",
      "src/app/page.tsx",
    ]);
  });
});

describe("dependências", () => {
  it("CA-DADOS-26 — package.json mantém exatamente as dependências anteriores", () => {
    const pacote = JSON.parse(ler("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(Object.keys(pacote.dependencies).sort()).toEqual([
      "@hookform/resolvers",
      "@prisma/adapter-pg",
      "@prisma/client",
      "@supabase/ssr",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "@trpc/client",
      "@trpc/react-query",
      "@trpc/server",
      "class-variance-authority",
      "clsx",
      "next",
      "pg",
      "react",
      "react-dom",
      "react-hook-form",
      "superjson",
      "tailwind-merge",
      "zod",
    ]);
    expect(Object.keys(pacote.devDependencies).sort()).toEqual([
      "@playwright/test",
      "@tailwindcss/postcss",
      "@testing-library/jest-dom",
      "@testing-library/react",
      "@types/node",
      "@types/pg",
      "@types/react",
      "@types/react-dom",
      "@vitejs/plugin-react",
      "eslint",
      "eslint-config-next",
      "jsdom",
      "postcss",
      "prettier",
      "prisma",
      "sharp",
      "tailwindcss",
      "testcontainers",
      "typescript",
      "vitest",
    ]);
  });
});

describe("rastreabilidade", () => {
  const spec = ler("docs/specs/002-dados-iniciais/spec.md");
  const criterios = [...spec.matchAll(/^- \*\*(CA-DADOS-[C0-9]+)\*\*/gm)].map((item) => item[1]!);
  const testes = ARQUIVOS_DE_TESTE.map(ler).join("\n");

  it("CA-DADOS-27 — a spec define os 28 critérios", () => {
    expect(criterios).toHaveLength(28);
  });

  it.each(criterios)("CA-DADOS-27 — %s tem ao menos um teste", (criterio) => {
    expect(testes).toContain(`${criterio} —`);
  });
});
