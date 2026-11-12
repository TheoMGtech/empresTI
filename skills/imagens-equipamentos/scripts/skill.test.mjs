// @vitest-environment node
// Confere a estrutura da skill e o lote real. Sem rede, credenciais ou imagens.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { CATEGORIA_POR_ID, MOTIVOS_DE_REJEICAO, validarManifesto } from "./nucleo.mjs";
import { iniciarManifesto } from "./preparar.mjs";

const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const NOME = "imagens-equipamentos";
const PASTA_DA_SKILL = path.join(RAIZ, "skills", NOME);
const PASTA_DE_SCRIPTS = path.join(PASTA_DA_SKILL, "scripts");
const CANONICO = path.join(PASTA_DA_SKILL, "SKILL.md");
const NATIVO = path.join(RAIZ, ".claude", "skills", NOME, "SKILL.md");
const CAMINHO_DO_LOTE = path.join(RAIZ, "docs", NOME, "lote.json");
const CLI_VALIDAR = path.join(PASTA_DE_SCRIPTS, "validar.mjs");
const REFERENCIAS = ["criterios-visuais.md", "pixabay.md"];
const pastas = [];

afterEach(async () => {
  await Promise.all(pastas.splice(0).map((pasta) => rm(pasta, { recursive: true, force: true })));
});

const ler = (caminho) => readFile(caminho, "utf8");

function separarFrontmatter(texto) {
  const achado = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(texto);
  if (!achado) throw new Error("frontmatter ausente");
  const campos = achado[1].split(/\r?\n/).map((linha) => {
    const separador = linha.indexOf(": ");
    return [linha.slice(0, separador), linha.slice(separador + 2)];
  });
  return { campos: Object.fromEntries(campos), corpo: achado[2] };
}

async function documentosDaSkill() {
  const caminhos = [
    CANONICO,
    ...REFERENCIAS.map((nome) => path.join(PASTA_DA_SKILL, "references", nome)),
  ];
  return Promise.all(caminhos.map(ler));
}

async function fontesDosScripts() {
  const fontes = await Promise.all(
    ["nucleo.mjs", "validar.mjs", "buscar.mjs", "preparar.mjs"].map((nome) =>
      ler(path.join(PASTA_DE_SCRIPTS, nome)),
    ),
  );
  return fontes.join("\n");
}

describe("CA-IMG-01: reconhecimento da skill", () => {
  it("CA-IMG-01: name corresponde à pasta nas duas cópias", async () => {
    const canonico = separarFrontmatter(await ler(CANONICO));
    const nativo = separarFrontmatter(await ler(NATIVO));

    expect(canonico.campos.name).toBe(NOME);
    expect(nativo.campos.name).toBe(NOME);
  });

  it("CA-IMG-01: description é idêntica, válida e diz quando não usar", async () => {
    const canonico = separarFrontmatter(await ler(CANONICO));
    const nativo = separarFrontmatter(await ler(NATIVO));
    const { description } = canonico.campos;

    expect(nativo.campos.description).toBe(description);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toContain("Use quando");
    expect(description).toContain("Não use para");
    expect(description).not.toContain(": ");
  });

  it("CA-IMG-01: frontmatter não concede ferramentas nem altera a invocação", async () => {
    for (const caminho of [CANONICO, NATIVO]) {
      const { campos } = separarFrontmatter(await ler(caminho));
      expect(Object.keys(campos).sort()).toEqual(["description", "name"]);
    }
  });

  it("CA-IMG-01: registro nativo aponta para a fonte canônica sem duplicar o procedimento", async () => {
    const { corpo } = separarFrontmatter(await ler(NATIVO));

    expect(corpo).toContain(`skills/${NOME}/SKILL.md`);
    expect(corpo).not.toContain("## Procedimento");
    expect(corpo.trim().split(/\r?\n/).length).toBeLessThanOrEqual(5);
  });

  it("CA-IMG-01: SKILL.md segue as seções da Aula 10 e deixa clara a falta de autorização", async () => {
    const { corpo } = separarFrontmatter(await ler(CANONICO));

    for (const secao of [
      "## Antes de começar",
      "## Procedimento",
      "## Verificação",
      "## Não faça",
    ]) {
      expect(corpo).toContain(secao);
    }
    expect(corpo).toContain("Invocar esta skill não autoriza nada");
    expect(corpo.split(/\r?\n/).length).toBeLessThanOrEqual(100);
  });
});

describe("CA-IMG-01: documentação coerente com os scripts", () => {
  it("CA-IMG-01: toda referência existe e é apontada pelo SKILL.md", async () => {
    const { corpo } = separarFrontmatter(await ler(CANONICO));
    const links = [...corpo.matchAll(/\]\((references\/[^)]+)\)/g)].map((achado) => achado[1]);
    const existentes = await readdir(path.join(PASTA_DA_SKILL, "references"));

    expect([...new Set(links)].sort()).toEqual(
      REFERENCIAS.map((nome) => `references/${nome}`).sort(),
    );
    expect(existentes.sort()).toEqual([...REFERENCIAS].sort());
    for (const link of links) expect(existsSync(path.join(PASTA_DA_SKILL, link))).toBe(true);
  });

  it("CA-IMG-01: toda opção documentada existe nos scripts", async () => {
    const documentos = (await documentosDaSkill()).join("\n");
    const fontes = await fontesDosScripts();
    const semGit = documentos.replaceAll("git status --short", "");
    const opcoes = [...new Set(semGit.match(/--[a-z][a-z-]+/g))];

    expect(opcoes.length).toBeGreaterThan(5);
    for (const opcao of opcoes) expect(fontes, opcao).toContain(opcao);
  });

  it("CA-IMG-01: todo código documentado existe nos scripts", async () => {
    const documentos = (await documentosDaSkill()).join("\n");
    const fontes = await fontesDosScripts();
    const codigos = [
      ...new Set([...documentos.matchAll(/`([A-Z][A-Z0-9_]{4,})`/g)].map((a) => a[1])),
    ];

    expect(codigos.length).toBeGreaterThan(10);
    for (const codigo of codigos.filter((c) => c !== "PIXABAY_API_KEY")) {
      expect(fontes, codigo).toContain(`"${codigo}"`);
    }
  });

  it("CA-IMG-09: documenta exatamente os motivos de rejeição do núcleo", async () => {
    const criterios = await ler(path.join(PASTA_DA_SKILL, "references", "criterios-visuais.md"));
    const linhas = criterios.split(/\r?\n/).filter((linha) => /^\| `[A-Z_]+` \|/.test(linha));
    const documentados = linhas.map((linha) => /`([A-Z_]+)`/.exec(linha)[1]);

    expect(documentados.sort()).toEqual([...MOTIVOS_DE_REJEICAO].sort());
  });

  it("CA-IMG-15: não traz instruções de escrita em produção", async () => {
    const documentos = [...(await documentosDaSkill()), await ler(NATIVO)].join("\n");

    expect(documentos).not.toMatch(
      /service_role|SERVICE_ROLE|createBucket|\.upload\(|apply_migration|allowed-tools|bypassPermissions|dangerously/i,
    );
  });
});

describe("CA-IMG-04: lote inicial", () => {
  async function gerarManifesto() {
    const diretorioTrabalho = await mkdtemp(path.join(tmpdir(), "imagens-lote-"));
    pastas.push(diretorioTrabalho);
    const caminhoManifesto = path.join(diretorioTrabalho, "manifesto.json");
    await iniciarManifesto({ caminhoManifesto, caminhoLote: CAMINHO_DO_LOTE, diretorioTrabalho });
    return { caminhoManifesto, diretorio: path.join(diretorioTrabalho, "publicar") };
  }

  it("CA-IMG-04: traz cada um dos 12 identificadores uma vez, com a categoria esperada", async () => {
    const lote = JSON.parse(await ler(CAMINHO_DO_LOTE));

    expect(lote.map((item) => item.id)).toEqual([...CATEGORIA_POR_ID.keys()]);
    for (const item of lote) expect(item.categoria).toBe(CATEGORIA_POR_ID.get(item.id));
  });

  it("CA-IMG-04: contém somente identificador, nome e categoria", async () => {
    const lote = JSON.parse(await ler(CAMINHO_DO_LOTE));

    for (const item of lote) {
      expect(Object.keys(item).sort()).toEqual(["categoria", "equipamento", "id"]);
    }
  });

  it("CA-IMG-04: gera manifesto em preparação aceito pelo validador real", async () => {
    const { caminhoManifesto, diretorio } = await gerarManifesto();
    const manifesto = JSON.parse(await ler(caminhoManifesto));

    const relatorio = await validarManifesto({ caminhoManifesto, diretorio, estado: "preparacao" });
    const processo = spawnSync(
      process.execPath,
      [
        CLI_VALIDAR,
        "--manifesto",
        caminhoManifesto,
        "--diretorio",
        diretorio,
        "--estado",
        "preparacao",
      ],
      { encoding: "utf8" },
    );

    expect(relatorio.problemas).toEqual([]);
    expect(processo.status).toBe(0);
    expect(processo.stdout).toContain("Estado verificado: preparacao");
    expect(manifesto.estado).toBe("preparacao");
    expect(manifesto.rejeicoes).toEqual([]);
    expect(manifesto.semelhanca_visual).toEqual({ situacao: "nao_verificada" });
    expect(await readdir(diretorio)).toEqual([]);
  });

  it("CA-IMG-04: todos os itens começam pendentes, sem fotografia nem aprovação", async () => {
    const { caminhoManifesto } = await gerarManifesto();
    const { itens } = JSON.parse(await ler(caminhoManifesto));

    expect(itens).toHaveLength(12);
    for (const item of itens) {
      expect(item.situacao).toBe("pendente");
      expect(Object.keys(item).sort()).toEqual(["categoria", "equipamento", "id", "situacao"]);
    }
  });

  it("CA-IMG-04: o lote não é um manifesto e o validador recusa usá-lo diretamente", async () => {
    const { diretorio } = await gerarManifesto();

    const processo = spawnSync(
      process.execPath,
      [
        CLI_VALIDAR,
        "--manifesto",
        CAMINHO_DO_LOTE,
        "--diretorio",
        diretorio,
        "--estado",
        "preparacao",
      ],
      { encoding: "utf8" },
    );

    expect(processo.status).toBe(3);
    expect(processo.stdout).toContain("ESQUEMA_INVALIDO");
  });
});
