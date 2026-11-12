// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  type CodigoManifesto,
  ErroManifestoInvalido,
  lerManifesto,
  MANIFESTO_PADRAO,
  PATRIMONIOS_ESPERADOS,
  validarManifesto,
} from "./manifesto";

type Item = Record<string, unknown> & {
  id: string;
  arquivo: Record<string, unknown> & { nome_relativo: string; sha256: string };
  storage: Record<string, unknown>;
  aprovacao_humana: Record<string, unknown>;
};
type Manifesto = Record<string, unknown> & { estado: string; itens: Item[] };

const BASE: Manifesto = JSON.parse(readFileSync(MANIFESTO_PADRAO, "utf8"));
const SHA_OUTRO = "f".repeat(64);

const copia = () => structuredClone(BASE);
const primeiro = (manifesto: Manifesto) => manifesto.itens[0] as Item;

function codigoDe(dados: unknown): CodigoManifesto {
  try {
    validarManifesto(dados);
  } catch (erro) {
    if (erro instanceof ErroManifestoInvalido) return erro.codigo;
    throw erro;
  }
  throw new Error("O manifesto deveria ter sido recusado.");
}

function alterado(mutar: (manifesto: Manifesto) => void) {
  const manifesto = copia();
  mutar(manifesto);
  return manifesto;
}

describe("manifesto aceito", () => {
  it("CA-DADOS-17 — aceita o manifesto versionado, em estado aprovado", () => {
    expect(BASE.estado).toBe("aprovado");

    const itens = lerManifesto();

    expect(itens.map((item) => item.patrimonio)).toEqual(PATRIMONIOS_ESPERADOS);
  });

  it("CA-DADOS-17 — aceita aprovado sem registro de publicação", () => {
    const manifesto = copia();

    expect(manifesto.itens.some((item) => "publicacao" in item)).toBe(false);
    expect(validarManifesto(manifesto)).toHaveLength(12);
  });

  it("CA-DADOS-17 — aceita o estado publicado, posterior ao aprovado", () => {
    expect(validarManifesto(alterado((m) => (m.estado = "publicado")))).toHaveLength(12);
  });

  it("CA-DADOS-17 — devolve dados estruturados para a carga", () => {
    const item = primeiro(BASE);

    expect(validarManifesto(copia())[0]).toEqual({
      patrimonio: "TI-0001",
      nome: "Notebook 14 polegadas",
      categoria: "notebook",
      imagemCaminho: item.storage.destino_planejado,
      imagemSha256: item.arquivo.sha256,
    });
  });

  it("CA-DADOS-17 — normaliza as quatro categorias", () => {
    const categorias = new Set(validarManifesto(copia()).map((item) => item.categoria));

    expect([...categorias].sort()).toEqual(["cabo", "camera", "monitor", "notebook"]);
  });

  it("CA-DADOS-17 — não devolve situação, URL, autor nem licença", () => {
    for (const item of validarManifesto(copia())) {
      expect(Object.keys(item).sort()).toEqual([
        "categoria",
        "imagemCaminho",
        "imagemSha256",
        "nome",
        "patrimonio",
      ]);
      expect(item.imagemCaminho).not.toMatch(/^https?:/);
    }
  });

  it("CA-DADOS-17 — a leitura não altera o manifesto", () => {
    const hash = () => createHash("sha256").update(readFileSync(MANIFESTO_PADRAO)).digest("hex");
    const antes = hash();

    lerManifesto();

    expect(hash()).toBe(antes);
  });

  it("CA-DADOS-17 — a entrada recebida não é modificada", () => {
    const manifesto = copia();

    validarManifesto(manifesto);

    expect(manifesto).toEqual(BASE);
  });
});

describe("estado e estrutura", () => {
  it.each(["preparacao", "final_revisao", "desconhecido", ""])(
    "CA-DADOS-16 — recusa o estado '%s'",
    (estado) => {
      expect(codigoDe(alterado((m) => (m.estado = estado)))).toBe("ESTADO_INVALIDO");
    },
  );

  it.each<[string, unknown]>([
    ["nulo", null],
    ["texto", "manifesto"],
    ["lista", []],
    ["objeto vazio", {}],
    ["sem estado", { itens: [] }],
    ["sem itens", { estado: "aprovado" }],
    ["itens que não são lista", { estado: "aprovado", itens: {} }],
    ["item nulo", { estado: "aprovado", itens: [null] }],
  ])("CA-DADOS-16 — recusa entrada inválida: %s", (_nome, dados) => {
    expect(codigoDe(dados)).toBe("ESTRUTURA_INVALIDA");
  });

  it.each<[string, (item: Item) => void]>([
    ["id", (i) => delete (i as Partial<Item>).id],
    ["equipamento", (i) => delete i.equipamento],
    ["categoria", (i) => delete i.categoria],
    ["situacao", (i) => delete i.situacao],
    ["arquivo", (i) => delete (i as Partial<Item>).arquivo],
    ["arquivo.nome_relativo", (i) => delete (i.arquivo as Partial<Item["arquivo"]>).nome_relativo],
    ["arquivo.sha256", (i) => delete (i.arquivo as Partial<Item["arquivo"]>).sha256],
    ["storage", (i) => delete (i as Partial<Item>).storage],
    ["storage.destino_planejado", (i) => delete i.storage.destino_planejado],
    ["aprovacao_humana", (i) => delete (i as Partial<Item>).aprovacao_humana],
    ["aprovacao_humana.decisao", (i) => delete i.aprovacao_humana.decisao],
    ["aprovacao_humana.sha256_aprovado", (i) => delete i.aprovacao_humana.sha256_aprovado],
  ])("CA-DADOS-16 — recusa item sem %s", (_campo, remover) => {
    expect(codigoDe(alterado((m) => remover(primeiro(m))))).toBe("ESTRUTURA_INVALIDA");
  });

  it.each<[string, (item: Item) => void]>([
    ["id malformado", (i) => (i.id = "PAT-0001")],
    ["equipamento vazio", (i) => (i.equipamento = "   ")],
    ["categoria desconhecida", (i) => (i.categoria = "Projetor")],
    ["fotografia pendente", (i) => (i.situacao = "pendente")],
    ["situação operacional no lugar da seleção", (i) => (i.situacao = "em_manutencao")],
    ["SHA-256 curto", (i) => (i.arquivo.sha256 = "a".repeat(63))],
    ["SHA-256 em maiúsculas", (i) => (i.arquivo.sha256 = "A".repeat(64))],
    ["decisão não aprovada", (i) => (i.aprovacao_humana.decisao = "reprovada")],
    ["SHA-256 aprovado malformado", (i) => (i.aprovacao_humana.sha256_aprovado = "x")],
  ])("CA-DADOS-16 — recusa valor inválido: %s", (_nome, mutar) => {
    expect(codigoDe(alterado((m) => mutar(primeiro(m))))).toBe("ESTRUTURA_INVALIDA");
  });
});

describe("patrimônios", () => {
  it("CA-DADOS-16 — recusa 11 itens", () => {
    expect(codigoDe(alterado((m) => m.itens.pop()))).toBe("PATRIMONIOS_DIVERGENTES");
  });

  it("CA-DADOS-16 — recusa lista vazia", () => {
    expect(codigoDe(alterado((m) => (m.itens = [])))).toBe("PATRIMONIOS_DIVERGENTES");
  });

  it("CA-DADOS-16 — recusa um 13º item", () => {
    const manifesto = alterado((m) => {
      const extra = structuredClone(primeiro(m));
      extra.id = "TI-0013";
      m.itens.push(extra);
    });

    expect(codigoDe(manifesto)).toBe("PATRIMONIOS_DIVERGENTES");
  });

  it("CA-DADOS-16 — recusa patrimônio fora do esperado, mesmo com 12 itens", () => {
    expect(codigoDe(alterado((m) => (primeiro(m).id = "TI-0099")))).toBe(
      "PATRIMONIOS_DIVERGENTES",
    );
  });

  it("CA-DADOS-16 — recusa patrimônio repetido", () => {
    const manifesto = alterado((m) => {
      m.itens[1] = structuredClone(primeiro(m));
    });

    expect(codigoDe(manifesto)).toBe("PATRIMONIO_REPETIDO");
  });
});

describe("coerência de arquivo, Storage e aprovação", () => {
  it.each<[string, (item: Item) => string]>([
    ["outro patrimônio", (i) => i.arquivo.nome_relativo.replace("TI-0001", "TI-0002")],
    ["outro hash no nome", (i) => i.arquivo.nome_relativo.replace(/-[0-9a-f]{8}\./, "-00000000.")],
    ["extensão errada", (i) => i.arquivo.nome_relativo.replace(".jpg", ".png")],
    ["caminho relativo para fora", (i) => `../${i.arquivo.nome_relativo}`],
    ["subpasta", (i) => `pasta/${i.arquivo.nome_relativo}`],
  ])("CA-DADOS-16 — recusa nome de arquivo: %s", (_nome, novo) => {
    const manifesto = alterado((m) => {
      const item = primeiro(m);
      item.arquivo.nome_relativo = novo(item);
    });

    expect(codigoDe(manifesto)).toBe("NOME_ARQUIVO_DIVERGENTE");
  });

  it("CA-DADOS-16 — recusa SHA-256 divergente do nome do arquivo", () => {
    const manifesto = alterado((m) => {
      const item = primeiro(m);
      item.arquivo.sha256 = SHA_OUTRO;
      item.aprovacao_humana.sha256_aprovado = SHA_OUTRO;
    });

    expect(codigoDe(manifesto)).toBe("NOME_ARQUIVO_DIVERGENTE");
  });

  it.each<[string, (item: Item) => string]>([
    ["outro bucket", (i) => `outro/${i.arquivo.nome_relativo}`],
    ["sem bucket", (i) => i.arquivo.nome_relativo],
    ["outro arquivo", () => "equipamentos/TI-0001-00000000.jpg"],
    ["URL completa", (i) => `https://exemplo.invalid/equipamentos/${i.arquivo.nome_relativo}`],
    ["vazio", () => ""],
  ])("CA-DADOS-16 — recusa destino incoerente: %s", (_nome, novo) => {
    const manifesto = alterado((m) => {
      const item = primeiro(m);
      item.storage.destino_planejado = novo(item);
    });

    expect(codigoDe(manifesto)).toBe("DESTINO_INCOERENTE");
  });

  it("CA-DADOS-16 — recusa aprovação de outro SHA-256", () => {
    const manifesto = alterado((m) => {
      primeiro(m).aprovacao_humana.sha256_aprovado = SHA_OUTRO;
    });

    expect(codigoDe(manifesto)).toBe("APROVACAO_DIVERGENTE");
  });

  it("CA-DADOS-16 — detecta a divergência também no último item", () => {
    const manifesto = alterado((m) => {
      (m.itens.at(-1) as Item).aprovacao_humana.sha256_aprovado = SHA_OUTRO;
    });

    expect(codigoDe(manifesto)).toBe("APROVACAO_DIVERGENTE");
  });
});

describe("leitura do arquivo", () => {
  function comArquivo<T>(conteudo: string, acao: (caminho: string) => T) {
    const pasta = mkdtempSync(path.join(tmpdir(), "manifesto-"));
    const caminho = path.join(pasta, "manifesto.json");
    writeFileSync(caminho, conteudo);
    try {
      return acao(caminho);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  }

  const erroDe = (acao: () => unknown) => {
    try {
      acao();
    } catch (erro) {
      return erro as ErroManifestoInvalido;
    }
    throw new Error("A leitura deveria ter falhado.");
  };

  it("CA-DADOS-16 — recusa arquivo ausente, sem repetir o caminho", () => {
    const caminho = path.join(tmpdir(), "caminho-secreto-inexistente.json");
    const erro = erroDe(() => lerManifesto(caminho));

    expect(erro.codigo).toBe("ARQUIVO_ILEGIVEL");
    expect(erro.message).not.toContain("caminho-secreto");
  });

  it("CA-DADOS-16 — recusa JSON inválido, sem repetir o conteúdo", () => {
    const erro = comArquivo('{"conteudo-secreto": ', (caminho) =>
      erroDe(() => lerManifesto(caminho)),
    );

    expect(erro.codigo).toBe("JSON_INVALIDO");
    expect(erro.message).not.toContain("conteudo-secreto");
  });

  it("CA-DADOS-16 — valida o conteúdo lido de um arquivo", () => {
    const erro = comArquivo(JSON.stringify({ ...copia(), estado: "preparacao" }), (caminho) =>
      erroDe(() => lerManifesto(caminho)),
    );

    expect(erro.codigo).toBe("ESTADO_INVALIDO");
  });
});

describe("limites da rotina", () => {
  const arquivo = fileURLToPath(new URL("./manifesto.ts", import.meta.url));

  it("CA-DADOS-17 — não usa banco, rede, skill nem processamento de imagem", () => {
    const fonte = readFileSync(arquivo, "utf8");

    expect(fonte).not.toMatch(/from "@prisma|from "pg"|fetch\(|from "sharp"|from ".*skills\//);
    expect(fonte).not.toMatch(/writeFile|unlink|rename\(/);
  });

  it("CA-DADOS-17 — o módulo roda com node, sem transpilador", () => {
    const { status } = spawnSync(process.execPath, [arquivo], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      timeout: 15_000,
    });

    expect(status).toBe(0);
  });
});
