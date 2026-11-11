// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import {
  ErroCargaInvalida,
  executarCarga,
  executarCargaDoManifesto,
  SLUG_TENANT_INICIAL,
} from "./carga";
import { SITUACOES_INICIAIS } from "./carga-inicial";
import { ErroManifestoInvalido, lerManifesto, MANIFESTO_PADRAO, PATRIMONIOS_ESPERADOS } from "./manifesto";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;
const TEMPO_DO_COMANDO_MS = 120_000;

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const SEED = fileURLToPath(new URL("../seed.ts", import.meta.url));

const EM_MANUTENCAO = ["TI-0004", "TI-0007"];
const CATEGORIA_DO_MANIFESTO: Record<string, string> = {
  Notebook: "notebook",
  Monitor: "monitor",
  Cabo: "cabo",
  Câmera: "camera",
};

type ItemBruto = {
  id: string;
  equipamento: string;
  categoria: string;
  arquivo: { sha256: string };
  storage: { destino_planejado: string };
  origem: { autor: string; url_pagina: string };
};
const MANIFESTO: { itens: ItemBruto[] } = JSON.parse(readFileSync(MANIFESTO_PADRAO, "utf8"));

type Linha = {
  patrimonio: string;
  nome: string;
  categoria: string;
  situacao: string;
  imagem_caminho: string;
  imagem_sha256: string;
};

let banco: BancoReal;

async function comBanco<T>(acao: (prisma: PrismaClient, cliente: Client, url: string) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao(prisma, cliente, url);
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

async function equipamentos(cliente: Client) {
  const { rows } = await cliente.query<Linha>(
    `SELECT patrimonio, nome, categoria, situacao, imagem_caminho, imagem_sha256
       FROM equipamentos ORDER BY patrimonio`,
  );
  return rows;
}

async function contar(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM ${tabela}`,
  );
  return rows[0]?.total;
}

async function esperarVazio(cliente: Client) {
  expect(await contar(cliente, "tenants")).toBe(0);
  expect(await contar(cliente, "equipamentos")).toBe(0);
}

function comManifesto<T>(dados: unknown, acao: (caminho: string) => Promise<T>) {
  const pasta = mkdtempSync(path.join(tmpdir(), "carga-"));
  const caminho = path.join(pasta, "manifesto.json");
  writeFileSync(caminho, JSON.stringify(dados));
  return acao(caminho).finally(() => rmSync(pasta, { recursive: true, force: true }));
}

function rodarSeed(env: Record<string, string>) {
  return spawnSync(process.execPath, [SEED], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { PATH: process.env.PATH, NODE_ENV: "test", ...env },
    timeout: TEMPO_DO_COMANDO_MS - 10_000,
  });
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("tabela de carga inicial", () => {
  it("CA-DADOS-09 — cobre exatamente os 12 patrimônios", () => {
    expect(Object.keys(SITUACOES_INICIAIS).sort()).toEqual(PATRIMONIOS_ESPERADOS);
  });

  it("CA-DADOS-09 — tem dois em manutenção e dez ativos", () => {
    const situacoes = Object.entries(SITUACOES_INICIAIS);

    expect(
      situacoes.filter(([, situacao]) => situacao === "em_manutencao").map(([id]) => id),
    ).toEqual(EM_MANUTENCAO);
    expect(situacoes.filter(([, situacao]) => situacao === "ativo")).toHaveLength(10);
  });
});

describe("carga em banco vazio", () => {
  it("CA-DADOS-08 — cria exatamente um tenant suporte_ti", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);

      const { rows } = await cliente.query<{ slug: string }>("SELECT slug FROM tenants");
      expect(rows).toEqual([{ slug: SLUG_TENANT_INICIAL }]);
      expect(SLUG_TENANT_INICIAL).toBe("suporte_ti");
    });
  });

  it("CA-DADOS-08 — cria exatamente os 12 patrimônios esperados, sem repetição", async () => {
    await comBanco(async (prisma, cliente) => {
      const resultado = await executarCargaDoManifesto(prisma);
      const patrimonios = (await equipamentos(cliente)).map((linha) => linha.patrimonio);

      expect(resultado).toEqual({ criados: 12, preservados: 0 });
      expect(patrimonios).toEqual(PATRIMONIOS_ESPERADOS);
      expect(new Set(patrimonios).size).toBe(12);
    });
  });

  it("CA-DADOS-08 — todos os equipamentos pertencem ao tenant inicial", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);

      const { rows } = await cliente.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM equipamentos e
           JOIN tenants t ON t.id = e.tenant_id WHERE t.slug = 'suporte_ti'`,
      );
      expect(rows).toEqual([{ total: 12 }]);
    });
  });

  it("CA-DADOS-09 — dois em manutenção, dez ativos e nenhum fora de uso", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const linhas = await equipamentos(cliente);
      const com = (situacao: string) =>
        linhas.filter((linha) => linha.situacao === situacao).map((linha) => linha.patrimonio);

      expect(com("em_manutencao")).toEqual(EM_MANUTENCAO);
      expect(com("ativo")).toHaveLength(10);
      expect(com("fora_de_uso")).toEqual([]);
    });
  });

  it("CA-DADOS-09 — a situação não vem de item.situacao do manifesto", async () => {
    const situacoes = new Set(
      (JSON.parse(readFileSync(MANIFESTO_PADRAO, "utf8")) as { itens: { situacao: string }[] }).itens.map(
        (item) => item.situacao,
      ),
    );

    expect([...situacoes]).toEqual(["selecionada"]);
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const valores = new Set((await equipamentos(cliente)).map((linha) => linha.situacao));

      expect(valores.has("selecionada")).toBe(false);
    });
  });

  it("CA-DADOS-15 — nome, categoria, caminho e SHA-256 coincidem com o manifesto", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const linhas = await equipamentos(cliente);

      expect(linhas).toEqual(
        MANIFESTO.itens.map((item) => ({
          patrimonio: item.id,
          nome: item.equipamento,
          categoria: CATEGORIA_DO_MANIFESTO[item.categoria],
          situacao: SITUACOES_INICIAIS[item.id],
          imagem_caminho: item.storage.destino_planejado,
          imagem_sha256: item.arquivo.sha256,
        })),
      );
    });
  });

  it("CA-DADOS-15 — não grava URL, autor nem licença", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const texto = JSON.stringify(await cliente.query("SELECT e.* FROM equipamentos e").then((r) => r.rows));

      expect(texto).not.toMatch(/https?:\/\//);
      for (const item of MANIFESTO.itens) {
        expect(texto).not.toContain(`"${item.origem.autor}"`);
        expect(texto).not.toContain(item.origem.url_pagina);
      }
    });
  });

  it("CA-DADOS-08 — não sobrescreve registro existente", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("UPDATE equipamentos SET nome = 'Nome alterado' WHERE patrimonio = 'TI-0001'");

      const resultado = await executarCargaDoManifesto(prisma);
      const linhas = await equipamentos(cliente);

      expect(resultado).toEqual({ criados: 0, preservados: 12 });
      expect(linhas[0]?.nome).toBe("Nome alterado");
      expect(linhas).toHaveLength(12);
    });
  });
});

describe("o que a carga não cria", () => {
  it("CA-DADOS-22 — não grava eventos de auditoria", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);

      expect(await contar(cliente, "auditoria")).toBe(0);
    });
  });

  // A tabela de empréstimos passa a existir na Spec 005 (T-SOLIC-01): a prova vale para o que a
  // carga grava, não para a estrutura.
  it("CA-DADOS-08 — não cria usuários, memberships nem empréstimos", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const { rows } = await cliente.query<{ emprestimos: string | null; auth: string | null }>(
        `SELECT to_regclass('public.emprestimos')::text AS emprestimos,
                to_regnamespace('auth')::text AS auth`,
      );

      expect(await contar(cliente, "memberships")).toBe(0);
      expect(rows[0]?.auth).toBeNull();
      if (rows[0]?.emprestimos) expect(await contar(cliente, "emprestimos")).toBe(0);
    });
  });
});

describe("recusas sem escrita", () => {
  it("CA-DADOS-08 — manifesto inválido é rejeitado sem escrita", async () => {
    const invalido = { ...MANIFESTO, estado: "preparacao" };

    await comBanco(async (prisma, cliente) => {
      await comManifesto(invalido, async (caminho) => {
        await expect(executarCargaDoManifesto(prisma, caminho)).rejects.toBeInstanceOf(
          ErroManifestoInvalido,
        );
      });
      await esperarVazio(cliente);
    });
  });

  it("CA-DADOS-08 — manifesto incompleto é rejeitado sem escrita", async () => {
    const incompleto = { ...MANIFESTO, estado: "aprovado", itens: MANIFESTO.itens.slice(0, 11) };

    await comBanco(async (prisma, cliente) => {
      await comManifesto(incompleto, async (caminho) => {
        await expect(executarCargaDoManifesto(prisma, caminho)).rejects.toMatchObject({
          codigo: "PATRIMONIOS_DIVERGENTES",
        });
      });
      await esperarVazio(cliente);
    });
  });

  it("CA-DADOS-09 — patrimônio sem situação na tabela é recusado sem escrita", async () => {
    const [primeiro] = lerManifesto();

    await comBanco(async (prisma, cliente) => {
      await expect(
        executarCarga(prisma, [{ ...primeiro!, patrimonio: "TI-9999" }]),
      ).rejects.toBeInstanceOf(ErroCargaInvalida);
      await esperarVazio(cliente);
    });
  });

  it("CA-DADOS-08 — falha no meio desfaz tudo, inclusive o tenant", async () => {
    const itens = lerManifesto();
    const comFalha = itens.map((item, indice) =>
      indice === 11 ? { ...item, imagemSha256: "valor-invalido" } : item,
    );

    await comBanco(async (prisma, cliente) => {
      await expect(executarCarga(prisma, comFalha)).rejects.toThrow();
      await esperarVazio(cliente);
    });
  });
});

const OUTRO_TENANT = "00000000-0000-4000-8000-00000000000b";
const SHA_OUTRO = "f".repeat(64);
const CAMINHO_OUTRO = "equipamentos/outra-foto.jpg";

/** Retrato completo, com identificadores e datas: revela qualquer escrita indevida. */
async function retrato(cliente: Client, tabela = "equipamentos") {
  const { rows } = await cliente.query<{ linha: string }>(
    `SELECT t::text AS linha FROM ${tabela} t ORDER BY 1`,
  );
  return rows.map((item) => item.linha);
}

async function equipamento(cliente: Client, patrimonio: string) {
  const linhas = await equipamentos(cliente);
  return linhas.find((linha) => linha.patrimonio === patrimonio);
}

async function criarOutroTenant(cliente: Client) {
  await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'outro_tenant')", [OUTRO_TENANT]);
}

describe("reexecução idêntica", () => {
  it("CA-DADOS-10 — a segunda execução cria 0 e preserva os 12", async () => {
    await comBanco(async (prisma) => {
      expect(await executarCargaDoManifesto(prisma)).toEqual({ criados: 12, preservados: 0 });
      expect(await executarCargaDoManifesto(prisma)).toEqual({ criados: 0, preservados: 12 });
    });
  });

  it("CA-DADOS-10 — execuções repetidas não mudam nenhuma linha", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const equipamentosAntes = await retrato(cliente);
      const tenantsAntes = await retrato(cliente, "tenants");

      for (let vez = 0; vez < 3; vez += 1) await executarCargaDoManifesto(prisma);

      expect(await retrato(cliente)).toEqual(equipamentosAntes);
      expect(await retrato(cliente, "tenants")).toEqual(tenantsAntes);
    });
  });

  it("CA-DADOS-10 — execuções simultâneas não duplicam registros", async () => {
    await comBanco(async (prisma, cliente) => {
      const resultados = await Promise.allSettled([
        executarCargaDoManifesto(prisma),
        executarCargaDoManifesto(prisma),
      ]);

      expect(resultados.some((item) => item.status === "fulfilled")).toBe(true);
      expect(await contar(cliente, "tenants")).toBe(1);
      expect((await equipamentos(cliente)).map((linha) => linha.patrimonio)).toEqual(
        PATRIMONIOS_ESPERADOS,
      );
    });
  });

  it("CA-DADOS-10 — reexecuções não criam memberships nem auditoria", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await executarCargaDoManifesto(prisma);

      expect(await contar(cliente, "memberships")).toBe(0);
      expect(await contar(cliente, "auditoria")).toBe(0);
    });
  });
});

describe("preservação de alterações", () => {
  it.each([
    ["nome", "nome = 'Nome alterado'", "nome", "Nome alterado"],
    ["categoria", "categoria = 'cabo'", "categoria", "cabo"],
    ["situação", "situacao = 'fora_de_uso'", "situacao", "fora_de_uso"],
  ] as const)("CA-DADOS-11 — preserva %s alterado depois da carga", async (_nome, alteracao, coluna, valor) => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query(`UPDATE equipamentos SET ${alteracao} WHERE patrimonio = 'TI-0001'`);

      const resultado = await executarCargaDoManifesto(prisma);

      expect(resultado).toEqual({ criados: 0, preservados: 12 });
      expect((await equipamento(cliente, "TI-0001"))?.[coluna]).toBe(valor);
    });
  });

  it("CA-DADOS-11 — item que saiu da manutenção não volta a ela", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("UPDATE equipamentos SET situacao = 'ativo' WHERE patrimonio = 'TI-0004'");

      await executarCargaDoManifesto(prisma);

      expect((await equipamento(cliente, "TI-0004"))?.situacao).toBe("ativo");
    });
  });

  it("CA-DADOS-11 — a reexecução não toca em nenhuma linha alterada", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("UPDATE equipamentos SET nome = nome || ' alterado'");
      const antes = await retrato(cliente);

      await executarCargaDoManifesto(prisma);

      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it("CA-DADOS-11 — o código não atualiza nem remove equipamentos", () => {
    const fonte = readFileSync(new URL("./carga.ts", import.meta.url), "utf8");

    expect(fonte).not.toMatch(/equipamento\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\b/);
  });
});

describe("outros equipamentos e tenants", () => {
  it("CA-DADOS-12 — equipamentos fora dos 12, com e sem foto, ficam intactos", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      const { rows } = await cliente.query<{ id: string }>("SELECT id FROM tenants");
      await cliente.query(
        `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria)
         VALUES ($1, 'OP-0001', 'Sem foto', 'cabo')`,
        [rows[0]?.id],
      );
      await cliente.query(
        `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria, imagem_caminho, imagem_sha256)
         VALUES ($1, 'OP-0002', 'Com foto', 'monitor', $2, $3)`,
        [rows[0]?.id, CAMINHO_OUTRO, SHA_OUTRO],
      );
      const antes = await retrato(cliente);

      const resultado = await executarCargaDoManifesto(prisma);

      expect(resultado).toEqual({ criados: 0, preservados: 12 });
      expect(await retrato(cliente)).toEqual(antes);
      expect(await contar(cliente, "equipamentos")).toBe(14);
    });
  });

  it("CA-DADOS-12 — o mesmo patrimônio em outro tenant, com outra foto, não interfere", async () => {
    await comBanco(async (prisma, cliente) => {
      await criarOutroTenant(cliente);
      await cliente.query(
        `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria, imagem_caminho, imagem_sha256)
         VALUES ($1, 'TI-0001', 'De outro tenant', 'cabo', $2, $3)`,
        [OUTRO_TENANT, CAMINHO_OUTRO, SHA_OUTRO],
      );
      const antes = await cliente.query("SELECT e::text FROM equipamentos e");

      expect(await executarCargaDoManifesto(prisma)).toEqual({ criados: 12, preservados: 0 });
      expect(await executarCargaDoManifesto(prisma)).toEqual({ criados: 0, preservados: 12 });

      const { rows } = await cliente.query(
        "SELECT e::text FROM equipamentos e WHERE tenant_id = $1",
        [OUTRO_TENANT],
      );
      expect(rows).toEqual(antes.rows);
      expect(await contar(cliente, "equipamentos")).toBe(13);
    });
  });
});

describe("recriação do que falta", () => {
  it("CA-DADOS-13 — recria só o patrimônio ausente", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("DELETE FROM equipamentos WHERE patrimonio = 'TI-0005'");
      const antes = await retrato(cliente);

      const resultado = await executarCargaDoManifesto(prisma);
      const depois = await retrato(cliente);

      expect(resultado).toEqual({ criados: 1, preservados: 11 });
      expect(depois).toHaveLength(12);
      expect(depois).toEqual(expect.arrayContaining(antes));
    });
  });

  it.each([
    ["TI-0004", "em_manutencao"],
    ["TI-0005", "ativo"],
  ])("CA-DADOS-13 — %s recriado volta com a situação %s da tabela", async (patrimonio, situacao) => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("DELETE FROM equipamentos WHERE patrimonio = $1", [patrimonio]);

      await executarCargaDoManifesto(prisma);

      expect((await equipamento(cliente, patrimonio))?.situacao).toBe(situacao);
    });
  });
});

describe("divergências impeditivas", () => {
  it.each([
    ["caminho divergente", "imagem_caminho = $1", [CAMINHO_OUTRO]],
    ["SHA-256 divergente", "imagem_sha256 = $1", [SHA_OUTRO]],
    ["caminho e SHA-256 divergentes", "imagem_caminho = $1, imagem_sha256 = $2", [CAMINHO_OUTRO, SHA_OUTRO]],
    ["fotografia ausente", "imagem_caminho = NULL, imagem_sha256 = NULL", []],
  ] as const)("CA-DADOS-14 — %s aborta sem corrigir", async (_nome, alteracao, parametros) => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query(`UPDATE equipamentos SET ${alteracao} WHERE patrimonio = 'TI-0003'`, [
        ...parametros,
      ]);
      const antes = await retrato(cliente);

      await expect(executarCargaDoManifesto(prisma)).rejects.toMatchObject({
        codigo: "FOTOGRAFIA_DIVERGENTE",
      });

      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it("CA-DADOS-14 — divergência impede criar outro patrimônio ausente", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query("DELETE FROM equipamentos WHERE patrimonio = 'TI-0001'");
      await cliente.query(
        "UPDATE equipamentos SET imagem_sha256 = $1 WHERE patrimonio = 'TI-0012'",
        [SHA_OUTRO],
      );
      const antes = await retrato(cliente);

      await expect(executarCargaDoManifesto(prisma)).rejects.toBeInstanceOf(ErroCargaInvalida);

      expect(await retrato(cliente)).toEqual(antes);
      expect(await contar(cliente, "equipamentos")).toBe(11);
    });
  });

  it("CA-DADOS-14 — falha depois das escritas desfaz tenant e equipamentos", async () => {
    await comBanco(async (prisma, cliente) => {
      const falha = new Error("falha simulada depois das escritas");
      const clienteComFalha = {
        $transaction: ((acao: (transacao: never) => Promise<unknown>) =>
          prisma.$transaction(async (transacao) => {
            await acao(transacao as never);
            throw falha;
          })) as unknown as PrismaClient["$transaction"],
      };

      await expect(executarCarga(clienteComFalha, lerManifesto())).rejects.toBe(falha);

      await esperarVazio(cliente);
    });
  });

  it("CA-DADOS-14 — a mensagem não repete dados do registro", async () => {
    await comBanco(async (prisma, cliente) => {
      await executarCargaDoManifesto(prisma);
      await cliente.query(
        "UPDATE equipamentos SET imagem_caminho = $1 WHERE patrimonio = 'TI-0003'",
        [CAMINHO_OUTRO],
      );

      const erro = await executarCargaDoManifesto(prisma).catch((falha: Error) => falha);

      expect((erro as Error).message).not.toContain("TI-0003");
      expect((erro as Error).message).not.toContain(CAMINHO_OUTRO);
    });
  });

  it("CA-DADOS-16 — manifesto com patrimônio repetido é recusado sem escrita", async () => {
    const repetido = {
      ...MANIFESTO,
      estado: "aprovado",
      itens: [MANIFESTO.itens[0], ...MANIFESTO.itens.slice(0, 11)],
    };

    await comBanco(async (prisma, cliente) => {
      await comManifesto(repetido, async (caminho) => {
        await expect(executarCargaDoManifesto(prisma, caminho)).rejects.toMatchObject({
          codigo: "PATRIMONIO_REPETIDO",
        });
      });
      await esperarVazio(cliente);
    });
  });
});

describe("comando TypeScript", () => {
  it(
    "CA-DADOS-10 — o seed reexecutado informa 0 criados e 12 preservados",
    async () => {
      await comBanco(async (_prisma, cliente, url) => {
        rodarSeed({ DIRECT_URL: url });
        const { status, stdout } = rodarSeed({ DIRECT_URL: url });

        expect({ status, stdout }).toEqual({
          status: 0,
          stdout: "Carga concluída: criados=0 preservados=12\n",
        });
        expect(await contar(cliente, "equipamentos")).toBe(12);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-14 — o seed aborta na divergência, com código e sem detalhes",
    async () => {
      await comBanco(async (prisma, cliente, url) => {
        await executarCargaDoManifesto(prisma);
        await cliente.query(
          "UPDATE equipamentos SET imagem_caminho = $1 WHERE patrimonio = 'TI-0003'",
          [CAMINHO_OUTRO],
        );

        const { status, stdout, stderr } = rodarSeed({ DIRECT_URL: url });

        expect(status).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("FOTOGRAFIA_DIVERGENTE");
        expect(stderr).not.toContain(CAMINHO_OUTRO);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-23 — o seed roda com node e imprime só contagens",
    async () => {
      await comBanco(async (_prisma, cliente, url) => {
        const { status, stdout, stderr } = rodarSeed({ DIRECT_URL: url });
        const saida = `${stdout}\n${stderr}`;
        const senha = new URL(url).password;

        expect({ status, stdout }).toEqual({
          status: 0,
          stdout: "Carga concluída: criados=12 preservados=0\n",
        });
        expect(saida).not.toContain(senha);
        expect(saida).not.toContain("postgresql://");
        expect(await contar(cliente, "equipamentos")).toBe(12);
      });
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-24 — o seed recusa banco remoto sem confirmação, sem expor a conexão",
    () => {
      const senha = "senha-ficticia-123";
      const { status, stdout, stderr } = rodarSeed({
        DIRECT_URL: `postgresql://usuario:${senha}@db.exemplo.invalid:5432/banco`,
      });
      const saida = `${stdout}\n${stderr}`;

      expect(status).toBe(1);
      expect(saida).toContain("REMOTO_SEM_CONFIRMACAO");
      expect(saida).not.toContain(senha);
      expect(saida).not.toContain("db.exemplo.invalid");
    },
    TEMPO_DO_COMANDO_MS,
  );

  it(
    "CA-DADOS-24 — o seed recusa a falta de URL",
    () => {
      const { status, stderr } = rodarSeed({});

      expect(status).toBe(1);
      expect(stderr).toContain("URL_AUSENTE");
    },
    TEMPO_DO_COMANDO_MS,
  );

  it("CA-DADOS-26 — o script npm executa o seed com node", () => {
    const pacote = JSON.parse(readFileSync(path.join(RAIZ, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(pacote.scripts.seed).toBe("node prisma/seed.ts");
  });
});
