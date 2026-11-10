// @vitest-environment node
// Usa apenas imagens sintéticas em pasta temporária. Nenhum caso acessa rede ou credenciais.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import {
  CATEGORIA_POR_ID,
  codigoDeSaida,
  inspecionarImagemFinal,
  LIMITE_BYTES_IMAGEM,
  localizarArquivo,
  raizDoDiretorio,
  validarManifesto,
} from "./nucleo.mjs";

const CLI = fileURLToPath(new URL("./validar.mjs", import.meta.url));
const IDS = [...CATEGORIA_POR_ID.keys()];
const ORDEM = ["preparacao", "final_revisao", "aprovado", "publicado"];
const pastas = [];

afterEach(async () => {
  await Promise.all(pastas.splice(0).map((pasta) => rm(pasta, { recursive: true, force: true })));
});

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function jpeg(indice, largura = 800, altura = 600) {
  const background = { r: (indice * 19) % 256, g: 255 - indice * 19, b: 90 };
  return sharp({ create: { width: largura, height: altura, channels: 3, background } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

function preencherArquivo(item, bytes, atinge) {
  const sha256 = hash(bytes);
  const nome = `${item.id}-${sha256.slice(0, 8)}.jpg`;
  item.arquivo = { nome_relativo: nome, dimensoes_finais: { largura: 800, altura: 600 }, sha256 };
  item.storage = { destino_planejado: `equipamentos/${nome}` };
  if (atinge("aprovado")) {
    item.aprovacao_humana = {
      decisao: "aprovada",
      responsavel: "Responsável de teste",
      aprovada_em: "2026-11-11",
      sha256_aprovado: sha256,
    };
  }
  if (atinge("publicado")) {
    item.publicacao = {
      url_publica: `https://abc123.supabase.co/storage/v1/object/public/equipamentos/${nome}`,
      verificada_em: "2026-11-12",
      sha256_verificado: sha256,
    };
  }
  return nome;
}

async function montarLote(estado = "final_revisao") {
  const raiz = await mkdtemp(path.join(tmpdir(), "imagens-equipamentos-"));
  pastas.push(raiz);
  const diretorio = path.join(raiz, "publicar");
  await mkdir(diretorio);

  const atinge = (minimo) => ORDEM.indexOf(estado) >= ORDEM.indexOf(minimo);
  const itens = [];

  for (const [indice, id] of IDS.entries()) {
    const pixabayId = 1000 + indice;
    const item = {
      id,
      equipamento: `Equipamento ${id}`,
      categoria: CATEGORIA_POR_ID.get(id),
      situacao: "selecionada",
      origem: {
        fonte: "Pixabay",
        pixabay_id: pixabayId,
        url_pagina: `https://pixabay.com/photos/foto-${pixabayId}/`,
        autor: `autor-${indice}`,
        licenca: { referencia: "Licença de Conteúdo Pixabay", consultada_em: "2026-11-09" },
        obtida_em: "2026-11-10",
        dimensoes_originais: { largura: 1280, altura: 853 },
      },
      revisao_visual: { resultado: "aceita_agente" },
    };
    const bytes = await jpeg(indice);
    await writeFile(path.join(diretorio, preencherArquivo(item, bytes, atinge)), bytes);
    itens.push(item);
  }

  const manifesto = {
    versao: 1,
    estado,
    semelhanca_visual: atinge("aprovado")
      ? {
          situacao: "verificada",
          metodo: "revisao_humana",
          responsavel: "Responsável de teste",
          verificada_em: "2026-11-11",
        }
      : { situacao: "nao_verificada" },
    itens,
    rejeicoes: [],
  };
  const caminhoManifesto = path.join(raiz, "manifesto.json");

  const salvar = () => writeFile(caminhoManifesto, JSON.stringify(manifesto));

  return {
    raiz,
    diretorio,
    manifesto,
    caminhoManifesto,
    item: (id) => itens.find((item) => item.id === id),
    salvar,
    async validar(modo = manifesto.estado) {
      await salvar();
      return validarManifesto({ caminhoManifesto, diretorio, estado: modo });
    },
    // Troca a imagem mantendo o manifesto coerente, para isolar o defeito sob teste.
    async trocarImagem(id, bytes) {
      const item = itens.find((candidato) => candidato.id === id);
      await unlink(path.join(diretorio, item.arquivo.nome_relativo));
      await writeFile(path.join(diretorio, preencherArquivo(item, bytes, atinge)), bytes);
    },
  };
}

function tornarPendente(lote, id) {
  const indice = lote.manifesto.itens.findIndex((item) => item.id === id);
  const { equipamento, categoria } = lote.manifesto.itens[indice];
  lote.manifesto.itens[indice] = { id, equipamento, categoria, situacao: "pendente" };
}

const codigos = (relatorio) => relatorio.problemas.map((problema) => problema.codigo);

function executar(...argumentos) {
  return spawnSync(process.execPath, [CLI, ...argumentos], { encoding: "utf8" });
}

async function executarLote(lote, modo = lote.manifesto.estado) {
  await lote.salvar();
  return executar(
    "--manifesto",
    lote.caminhoManifesto,
    "--diretorio",
    lote.diretorio,
    "--estado",
    modo,
  );
}

describe("CA-IMG-04: identificadores do lote", () => {
  it("CA-IMG-04: aceita o lote válido com os 12 identificadores", async () => {
    const relatorio = await (await montarLote()).validar();

    expect(relatorio.problemas).toEqual([]);
    expect(relatorio.aprovado).toBe(true);
    expect(relatorio.resumo).toMatchObject({
      itens: 12,
      selecionados: 12,
      arquivos_verificados: 12,
    });
    expect(codigoDeSaida(relatorio)).toBe(0);
  });

  it("CA-IMG-04: fixa quatro notebooks, três monitores, três cabos e duas câmeras", () => {
    const contagem = {};
    for (const categoria of CATEGORIA_POR_ID.values())
      contagem[categoria] = (contagem[categoria] ?? 0) + 1;

    expect(IDS).toHaveLength(12);
    expect(contagem).toEqual({ Notebook: 4, Monitor: 3, Cabo: 3, Câmera: 2 });
  });

  it("CA-IMG-04: rejeita identificador ausente", async () => {
    const lote = await montarLote();
    lote.manifesto.itens.splice(2, 1);

    const relatorio = await lote.validar();

    expect(codigos(relatorio)).toEqual(["ID_AUSENTE"]);
    expect(relatorio.problemas[0].item).toBe("TI-0003");
  });

  it("CA-IMG-04: rejeita identificador duplicado", async () => {
    const lote = await montarLote();
    lote.manifesto.itens[1] = { ...lote.manifesto.itens[0] };

    expect(codigos(await lote.validar())).toEqual(["ID_DUPLICADO", "ID_AUSENTE"]);
  });

  it("CA-IMG-04: rejeita identificador extra", async () => {
    const lote = await montarLote();
    lote.manifesto.itens.push({ ...lote.manifesto.itens[0], id: "TI-0013" });

    expect(codigos(await lote.validar())).toEqual(["ID_EXTRA"]);
  });

  it.each(["TI-1", "ti-0001", "TI-00011", "../TI-0001"])(
    "CA-IMG-04: rejeita identificador malformado %s",
    async (id) => {
      const lote = await montarLote();
      lote.manifesto.itens[0].id = id;

      expect(codigos(await lote.validar())).toEqual(["ID_MALFORMADO", "ID_AUSENTE"]);
    },
  );

  it("CA-IMG-04: rejeita categoria incompatível com o identificador", async () => {
    const lote = await montarLote();
    lote.item("TI-0005").categoria = "Notebook";

    expect(codigos(await lote.validar())).toEqual(["CATEGORIA_INCOMPATIVEL"]);
  });

  it("CA-IMG-04: não abre arquivos quando os identificadores são inválidos", async () => {
    const lote = await montarLote();
    lote.manifesto.itens.pop();

    const relatorio = await lote.validar();

    expect(relatorio.resumo.arquivos_verificados).toBe(0);
  });
});

describe("CA-IMG-05: arquivos finais", () => {
  it("CA-IMG-05: mede JPEG válido de 800 × 600 pela decodificação", async () => {
    const lote = await montarLote();
    const item = lote.item("TI-0001");

    const medido = await inspecionarImagemFinal(
      path.join(lote.diretorio, item.arquivo.nome_relativo),
    );

    expect(medido).toEqual({
      formato: "jpeg",
      largura: 800,
      altura: 600,
      sha256: item.arquivo.sha256,
    });
  });

  it("CA-IMG-05: rejeita imagem de 799 × 600", async () => {
    const lote = await montarLote();
    await lote.trocarImagem("TI-0001", await jpeg(0, 799, 600));

    expect(codigos(await lote.validar())).toEqual(["DIMENSAO_INVALIDA"]);
  });

  it("CA-IMG-05: rejeita JPEG com orientação que altera a exibição", async () => {
    const lote = await montarLote();
    const bytes = await sharp(await jpeg(0))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    await lote.trocarImagem("TI-0001", bytes);

    expect(codigos(await lote.validar())).toEqual(["DIMENSAO_INVALIDA"]);
  });

  it("CA-IMG-05: rejeita PNG renomeado para .jpg", async () => {
    const lote = await montarLote();
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    await lote.trocarImagem("TI-0001", png);

    expect(codigos(await lote.validar())).toEqual(["FORMATO_INCORRETO"]);
  });

  it("CA-IMG-05: rejeita arquivo com bytes que não são imagem", async () => {
    const lote = await montarLote();
    await lote.trocarImagem("TI-0001", Buffer.from("isto não é uma imagem"));

    expect(codigos(await lote.validar())).toEqual(["ARQUIVO_CORROMPIDO"]);
  });

  it("CA-IMG-05: rejeita JPEG truncado", async () => {
    const lote = await montarLote();
    const bytes = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        noise: { type: "gaussian", mean: 128, sigma: 40 },
      },
    })
      .jpeg()
      .toBuffer();
    await lote.trocarImagem("TI-0001", bytes.subarray(0, Math.floor(bytes.length / 2)));

    expect(codigos(await lote.validar())).toEqual(["ARQUIVO_CORROMPIDO"]);
  });

  it("CA-IMG-05: rejeita arquivo ausente", async () => {
    const lote = await montarLote();
    await unlink(path.join(lote.diretorio, lote.item("TI-0001").arquivo.nome_relativo));

    expect(codigos(await lote.validar())).toEqual(["ARQUIVO_AUSENTE"]);
  });

  it("CA-IMG-05: rejeita arquivo acima do limite de tamanho sem decodificá-lo", async () => {
    const lote = await montarLote();
    await lote.trocarImagem("TI-0001", Buffer.alloc(LIMITE_BYTES_IMAGEM + 1));

    expect(codigos(await lote.validar())).toEqual(["ARQUIVO_GRANDE_DEMAIS"]);
  });

  it("CA-IMG-05: rejeita diretório permitido inexistente", async () => {
    const lote = await montarLote();
    await lote.salvar();

    const relatorio = await validarManifesto({
      caminhoManifesto: lote.caminhoManifesto,
      diretorio: path.join(lote.raiz, "nao-existe"),
      estado: "final_revisao",
    });

    expect(codigos(relatorio)).toEqual(["DIRETORIO_INVALIDO"]);
  });
});

describe("CA-IMG-05: caminhos fora do diretório permitido", () => {
  it.each(["../fora.jpg", "sub/../../fora.jpg", "..\\fora.jpg"])(
    "CA-IMG-05: rejeita caminho que sai do diretório: %s",
    async (nome) => {
      const lote = await montarLote();
      await writeFile(path.join(lote.raiz, "fora.jpg"), await jpeg(0));
      lote.item("TI-0001").arquivo.nome_relativo = nome;
      delete lote.item("TI-0001").storage;

      const relatorio = await lote.validar();

      expect(codigos(relatorio)).toContain("CAMINHO_FORA_DO_DIRETORIO");
      expect(relatorio.resumo.arquivos_verificados).toBe(11);
    },
  );

  it.each(["/etc/passwd", "C:\\Windows\\win.ini", "C:fora.jpg", "\\\\servidor\\fora.jpg"])(
    "CA-IMG-05: rejeita caminho absoluto: %s",
    async (nome) => {
      const lote = await montarLote();
      const raiz = await raizDoDiretorio(lote.diretorio);

      await expect(localizarArquivo(raiz, nome)).rejects.toMatchObject({
        codigo: "CAMINHO_FORA_DO_DIRETORIO",
      });
    },
  );

  it("CA-IMG-05: rejeita pasta ligada para fora do diretório", async () => {
    const lote = await montarLote();
    const fora = path.join(lote.raiz, "externa");
    await mkdir(fora);
    await writeFile(path.join(fora, "foto.jpg"), await jpeg(0));
    await symlink(fora, path.join(lote.diretorio, "atalho"), "junction");
    const raiz = await raizDoDiretorio(lote.diretorio);

    await expect(localizarArquivo(raiz, "atalho/foto.jpg")).rejects.toMatchObject({
      codigo: "CAMINHO_FORA_DO_DIRETORIO",
    });
  });

  it("CA-IMG-05: rejeita arquivo que é link simbólico", async ({ skip }) => {
    const lote = await montarLote();
    const fora = path.join(lote.raiz, "fora.jpg");
    await writeFile(fora, await jpeg(0));
    const raiz = await raizDoDiretorio(lote.diretorio);
    const link = path.join(lote.diretorio, "link.jpg");

    try {
      await symlink(fora, link, "file");
    } catch (erro) {
      // Windows sem modo de desenvolvedor não cria link de arquivo; o CI em Linux cobre o caso.
      if (erro.code === "EPERM") skip();
      throw erro;
    }

    await expect(localizarArquivo(raiz, "link.jpg")).rejects.toMatchObject({
      codigo: "LINK_SIMBOLICO",
    });
  });
});

describe("CA-IMG-06: duplicatas", () => {
  it("CA-IMG-06: rejeita duas imagens com o mesmo hash", async () => {
    const lote = await montarLote();
    await lote.trocarImagem("TI-0002", await jpeg(0));

    const relatorio = await lote.validar();

    expect(codigos(relatorio)).toEqual(["DUPLICATA_SHA256"]);
    expect(relatorio.problemas[0].item).toBe("TI-0002");
  });

  it("CA-IMG-06: rejeita o mesmo ID de origem em equipamentos diferentes", async () => {
    const lote = await montarLote();
    const origem = lote.item("TI-0002").origem;
    origem.pixabay_id = lote.item("TI-0001").origem.pixabay_id;
    origem.url_pagina = lote.item("TI-0001").origem.url_pagina;

    expect(codigos(await lote.validar())).toEqual(["DUPLICATA_PIXABAY_ID"]);
  });

  it("CA-IMG-06: rejeita nome de arquivo repetido", async () => {
    const lote = await montarLote();
    lote.item("TI-0002").arquivo.nome_relativo = lote.item("TI-0001").arquivo.nome_relativo;

    expect(codigos(await lote.validar())).toContain("DUPLICATA_NOME");
  });

  it("CA-IMG-06: rejeita destino de Storage repetido", async () => {
    const lote = await montarLote();
    lote.item("TI-0002").storage.destino_planejado = lote.item("TI-0001").storage.destino_planejado;

    expect(codigos(await lote.validar())).toContain("DUPLICATA_DESTINO");
  });

  it("CA-IMG-06: avisa que hashes diferentes não comprovam distinção visual", async () => {
    const relatorio = await (await montarLote()).validar();

    expect(relatorio.aprovado).toBe(true);
    expect(relatorio.avisos.join(" ")).toContain("não comprovam");
  });
});

describe("CA-IMG-07: coerência do manifesto", () => {
  it("CA-IMG-07: rejeita SHA-256 divergente", async () => {
    const lote = await montarLote();
    const arquivo = lote.item("TI-0001").arquivo;
    const ultimo = arquivo.sha256.endsWith("0") ? "1" : "0";
    arquivo.sha256 = `${arquivo.sha256.slice(0, 63)}${ultimo}`;

    expect(codigos(await lote.validar())).toEqual(["HASH_DIVERGENTE"]);
  });

  it("CA-IMG-07: rejeita nome que não corresponde ao item", async () => {
    const lote = await montarLote();
    const item = lote.item("TI-0001");
    item.arquivo.nome_relativo = item.arquivo.nome_relativo.replace("TI-0001", "TI-0002");
    item.storage.destino_planejado = `equipamentos/${item.arquivo.nome_relativo}`;

    expect(codigos(await lote.validar())).toContain("NOME_ARQUIVO_DIVERGENTE");
  });

  it("CA-IMG-07: rejeita nome fora do padrão sem abrir o arquivo", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").arquivo.nome_relativo = "foto.jpg";
    lote.item("TI-0001").storage.destino_planejado = "equipamentos/foto.jpg";

    const relatorio = await lote.validar();

    expect(codigos(relatorio)).toEqual(["NOME_ARQUIVO_INVALIDO"]);
    expect(relatorio.resumo.arquivos_verificados).toBe(11);
  });

  it("CA-IMG-07: rejeita destino que não corresponde ao arquivo", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").storage.destino_planejado = "outro-bucket/foto.jpg";

    expect(codigos(await lote.validar())).toEqual(["DESTINO_DIVERGENTE"]);
  });

  it("CA-IMG-07: rejeita campo não previsto no esquema", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").campo_extra = "valor";

    expect(codigos(await lote.validar())).toEqual(["ESQUEMA_INVALIDO"]);
  });

  it("CA-IMG-07: rejeita dimensões finais declaradas diferentes de 800 × 600", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").arquivo.dimensoes_finais.largura = 799;

    expect(codigos(await lote.validar())).toEqual(["ESQUEMA_INVALIDO"]);
  });
});

describe("CA-IMG-08: procedência e licença", () => {
  it.each([
    ["autor", (origem) => delete origem.autor],
    ["licença", (origem) => delete origem.licenca],
    ["data de obtenção", (origem) => delete origem.obtida_em],
    ["fonte diferente", (origem) => (origem.fonte = "Outra")],
  ])("CA-IMG-08: rejeita procedência incompleta: %s", async (_nome, alterar) => {
    const lote = await montarLote();
    alterar(lote.item("TI-0001").origem);

    expect(codigos(await lote.validar())).toContain("ESQUEMA_INVALIDO");
  });

  it("CA-IMG-08: aceita dimensões originais desconhecidas somente como null", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").origem.dimensoes_originais = null;

    expect((await lote.validar()).aprovado).toBe(true);
  });

  it("CA-IMG-08: rejeita URL de origem que não traz o ID da fotografia", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").origem.url_pagina = "https://pixabay.com/photos/foto-99999/";

    expect(codigos(await lote.validar())).toEqual(["ORIGEM_URL_INVALIDA"]);
  });

  it("CA-IMG-08: rejeita URL de origem em outro host", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").origem.url_pagina = "https://exemplo.com/photos/foto-1000/";

    expect(codigos(await lote.validar())).toEqual(["ORIGEM_URL_INVALIDA"]);
  });

  it.each(["<autor>", "TODO", "desconhecido", "N/A"])(
    "CA-IMG-08: rejeita valor fictício no autor: %s",
    async (autor) => {
      const lote = await montarLote();
      lote.item("TI-0001").origem.autor = autor;

      expect(codigos(await lote.validar())).toEqual(["TEXTO_FICTICIO"]);
    },
  );

  it("CA-IMG-08: registra candidatos rejeitados separados das imagens selecionadas", async () => {
    const lote = await montarLote();
    lote.manifesto.rejeicoes.push({
      id_equipamento: "TI-0001",
      pixabay_id: 5000,
      url_pagina: "https://pixabay.com/photos/outra-5000/",
      motivos: ["MARCA", "PESSOA"],
      rejeitada_em: "2026-11-10",
    });

    const relatorio = await lote.validar();

    expect(relatorio.aprovado).toBe(true);
    expect(relatorio.resumo).toMatchObject({ selecionados: 12, rejeicoes: 1 });
  });

  it("CA-IMG-08: rejeita rejeição sem motivo", async () => {
    const lote = await montarLote();
    lote.manifesto.rejeicoes.push({
      id_equipamento: "TI-0001",
      pixabay_id: 5000,
      motivos: [],
      rejeitada_em: "2026-11-10",
    });

    expect(codigos(await lote.validar())).toEqual(["ESQUEMA_INVALIDO"]);
  });

  it("CA-IMG-08: rejeita candidato ao mesmo tempo selecionado e rejeitado", async () => {
    const lote = await montarLote();
    lote.manifesto.rejeicoes.push({
      id_equipamento: "TI-0001",
      pixabay_id: lote.item("TI-0001").origem.pixabay_id,
      motivos: ["MARCA"],
      rejeitada_em: "2026-11-10",
    });

    expect(codigos(await lote.validar())).toEqual(["CANDIDATO_SELECIONADO_E_REJEITADO"]);
  });
});

describe("CA-IMG-07: estados do manifesto", () => {
  it("CA-IMG-07: aceita itens explicitamente pendentes no modo preparação", async () => {
    const lote = await montarLote("preparacao");
    tornarPendente(lote, "TI-0001");
    delete lote.item("TI-0002").arquivo;
    delete lote.item("TI-0002").storage;

    const relatorio = await lote.validar("preparacao");

    expect(relatorio.aprovado).toBe(true);
    expect(relatorio.resumo).toMatchObject({ selecionados: 11, arquivos_verificados: 10 });
  });

  it("CA-IMG-07: confere arquivos já declarados mesmo em preparação", async () => {
    const lote = await montarLote("preparacao");
    await unlink(path.join(lote.diretorio, lote.item("TI-0001").arquivo.nome_relativo));

    expect(codigos(await lote.validar("preparacao"))).toEqual(["ARQUIVO_AUSENTE"]);
  });

  it("CA-IMG-07: rejeita manifesto em preparação no modo final", async () => {
    const lote = await montarLote("preparacao");
    tornarPendente(lote, "TI-0001");

    expect(codigos(await lote.validar("final_revisao"))).toEqual([
      "ESTADO_INSUFICIENTE",
      "ITEM_SEM_FOTOGRAFIA",
    ]);
  });

  it("CA-IMG-07: rejeita manifesto final validado no modo preparação", async () => {
    const lote = await montarLote("final_revisao");

    expect(codigos(await lote.validar("preparacao"))).toEqual(["ESTADO_DIVERGENTE"]);
  });

  it("CA-IMG-07: rejeita manifesto incompleto no modo final", async () => {
    const lote = await montarLote();
    tornarPendente(lote, "TI-0001");
    delete lote.item("TI-0002").arquivo;
    delete lote.item("TI-0003").revisao_visual;
    delete lote.item("TI-0004").storage;

    const relatorio = await lote.validar();

    expect(relatorio.aprovado).toBe(false);
    expect(codigos(relatorio)).toEqual([
      "ITEM_SEM_FOTOGRAFIA",
      "METADADO_AUSENTE",
      "METADADO_AUSENTE",
      "METADADO_AUSENTE",
    ]);
  });

  it("CA-IMG-07: rejeita revisão visual não aceita no modo final", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").revisao_visual.resultado = "reprovada";

    expect(codigos(await lote.validar())).toEqual(["REVISAO_NAO_ACEITA"]);
  });

  it("CA-IMG-07: aceita o modo aprovado com aprovação humana e semelhança registradas", async () => {
    const relatorio = await (await montarLote("aprovado")).validar();

    expect(relatorio.problemas).toEqual([]);
    expect(relatorio.aprovado).toBe(true);
  });

  it("CA-IMG-07: rejeita aprovação humana ausente no modo aprovado", async () => {
    const lote = await montarLote("aprovado");
    delete lote.item("TI-0001").aprovacao_humana;

    const relatorio = await lote.validar();

    expect(codigos(relatorio)).toEqual(["APROVACAO_AUSENTE"]);
    expect(relatorio.problemas[0].categoria).toBe("pendencia");
  });

  it("CA-IMG-07: rejeita aprovação de outro arquivo", async () => {
    const lote = await montarLote("aprovado");
    lote.item("TI-0001").aprovacao_humana.sha256_aprovado = lote.item("TI-0002").arquivo.sha256;

    expect(codigos(await lote.validar())).toEqual(["APROVACAO_DIVERGENTE"]);
  });

  it("CA-IMG-07: rejeita o modo aprovado sem checagem de semelhança visual", async () => {
    const lote = await montarLote("aprovado");
    lote.manifesto.semelhanca_visual = { situacao: "nao_verificada" };

    expect(codigos(await lote.validar())).toEqual(["SEMELHANCA_NAO_VERIFICADA"]);
  });

  it("CA-IMG-07: rejeita manifesto de revisão no modo aprovado", async () => {
    const lote = await montarLote("final_revisao");

    expect(codigos(await lote.validar("aprovado"))).toContain("ESTADO_INSUFICIENTE");
  });

  it("CA-IMG-07: aceita o registro completo no modo publicado e avisa que a rede não foi acessada", async () => {
    const relatorio = await (await montarLote("publicado")).validar();

    expect(relatorio.problemas).toEqual([]);
    expect(relatorio.avisos.join(" ")).toContain("não foram acessadas");
  });

  it("CA-IMG-07: rejeita URL pública ausente no modo publicado", async () => {
    const lote = await montarLote("publicado");
    delete lote.item("TI-0001").publicacao;

    const relatorio = await lote.validar();

    expect(codigos(relatorio)).toEqual(["PUBLICACAO_AUSENTE"]);
    expect(relatorio.problemas[0].categoria).toBe("pendencia");
  });

  it("CA-IMG-07: rejeita URL pública registrada antes do estado publicado", async () => {
    const lote = await montarLote("aprovado");
    const { nome_relativo: nome, sha256 } = lote.item("TI-0001").arquivo;
    lote.item("TI-0001").publicacao = {
      url_publica: `https://abc123.supabase.co/storage/v1/object/public/equipamentos/${nome}`,
      verificada_em: "2026-11-12",
      sha256_verificado: sha256,
    };

    expect(codigos(await lote.validar())).toEqual(["PUBLICACAO_PREMATURA"]);
  });

  it.each([
    ["host diferente", "https://exemplo.com/storage/v1/object/public/equipamentos/foto.jpg"],
    ["destino diferente", "https://abc123.supabase.co/storage/v1/object/public/outro/foto.jpg"],
    ["sem HTTPS", "http://abc123.supabase.co/storage/v1/object/public/equipamentos/foto.jpg"],
  ])("CA-IMG-07: rejeita URL pública inválida: %s", async (_nome, url) => {
    const lote = await montarLote("publicado");
    lote.item("TI-0001").publicacao.url_publica = url;

    expect(codigos(await lote.validar())).toEqual(["URL_PUBLICA_INVALIDA"]);
  });

  it("CA-IMG-07: rejeita verificação pública de outro arquivo", async () => {
    const lote = await montarLote("publicado");
    lote.item("TI-0001").publicacao.sha256_verificado = lote.item("TI-0002").arquivo.sha256;

    expect(codigos(await lote.validar())).toEqual(["PUBLICACAO_DIVERGENTE"]);
  });

  it("CA-IMG-07: rejeita verificação pública anterior à aprovação", async () => {
    const lote = await montarLote("publicado");
    lote.item("TI-0001").publicacao.verificada_em = "2026-11-10";

    expect(codigos(await lote.validar())).toEqual(["PUBLICACAO_ANTERIOR_A_APROVACAO"]);
  });
});

describe("CA-IMG-07: linha de comando", () => {
  it("CA-IMG-07: sai com 0 e informa o estado verificado", async () => {
    const resultado = await executarLote(await montarLote());

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain("Estado verificado: final_revisao");
    expect(resultado.stdout).toContain("Validação aprovada para o estado final_revisao.");
  });

  it("CA-IMG-07: sai com 0 na ajuda", () => {
    const resultado = executar("--ajuda");

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain("--manifesto");
  });

  it.each([
    ["sem argumentos", []],
    ["estado desconhecido", ["--manifesto", "a.json", "--diretorio", "b", "--estado", "qualquer"]],
    ["sem diretório", ["--manifesto", "a.json", "--estado", "preparacao"]],
  ])("CA-IMG-07: sai com 2 em uso incorreto: %s", (_nome, argumentos) => {
    expect(executar(...argumentos).status).toBe(2);
  });

  it("CA-IMG-11: sai com 2 em opção desconhecida sem repetir o valor recebido", () => {
    const resultado = executar("--chave=SENTINELA-DE-TESTE");

    expect(resultado.status).toBe(2);
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain("SENTINELA-DE-TESTE");
  });

  it("CA-IMG-07: sai com 3 em erro de estrutura", async () => {
    const lote = await montarLote();
    lote.manifesto.itens.pop();

    const resultado = await executarLote(lote);

    expect(resultado.status).toBe(3);
    expect(resultado.stdout).toContain("Erros de estrutura (1):");
    expect(resultado.stdout).toContain("[ID_AUSENTE] TI-0012");
  });

  it("CA-IMG-07: sai com 4 em erro de arquivo", async () => {
    const lote = await montarLote();
    await unlink(path.join(lote.diretorio, lote.item("TI-0001").arquivo.nome_relativo));

    const resultado = await executarLote(lote);

    expect(resultado.status).toBe(4);
    expect(resultado.stdout).toContain("Erros de arquivo (1):");
  });

  it("CA-IMG-07: sai com 5 em inconsistência de metadados", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").origem.url_pagina = "https://exemplo.com/foto-1000/";

    const resultado = await executarLote(lote);

    expect(resultado.status).toBe(5);
    expect(resultado.stdout).toContain("Inconsistências de metadados (1):");
  });

  it("CA-IMG-07: sai com 6 em pendência de aprovação", async () => {
    const lote = await montarLote("aprovado");
    delete lote.item("TI-0001").aprovacao_humana;

    const resultado = await executarLote(lote);

    expect(resultado.status).toBe(6);
    expect(resultado.stdout).toContain("Pendências de aprovação/publicação (1):");
  });

  it("CA-IMG-07: prioriza o erro mais grave no código de saída", () => {
    const relatorio = {
      problemas: [{ categoria: "pendencia" }, { categoria: "metadados" }, { categoria: "arquivo" }],
    };

    expect(codigoDeSaida(relatorio)).toBe(4);
  });

  it("CA-IMG-11: não repete valores do manifesto nos erros", async () => {
    const lote = await montarLote();
    lote.item("TI-0001").origem.url_pagina =
      "https://pixabay.com/photos/foto-1000/?key=SENTINELA-DE-TESTE";
    lote.item("TI-0002").arquivo.nome_relativo = "../SENTINELA-DE-TESTE.jpg";

    const resultado = await executarLote(lote);

    expect(resultado.status).toBe(4);
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain("SENTINELA-DE-TESTE");
  });

  it("CA-IMG-11: não repete o conteúdo de JSON inválido", async () => {
    const lote = await montarLote();
    await writeFile(lote.caminhoManifesto, "SENTINELA-DE-TESTE=valor");

    const resultado = executar(
      "--manifesto",
      lote.caminhoManifesto,
      "--diretorio",
      lote.diretorio,
      "--estado",
      "final_revisao",
    );

    expect(resultado.status).toBe(3);
    expect(resultado.stdout).toContain("MANIFESTO_JSON_INVALIDO");
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain("SENTINELA-DE-TESTE");
  });

  it("CA-IMG-11: recusa manifesto que não seja .json", async () => {
    const lote = await montarLote();
    const outro = path.join(lote.raiz, "credenciais.txt");
    await writeFile(outro, "SENTINELA-DE-TESTE");

    const resultado = executar(
      "--manifesto",
      outro,
      "--diretorio",
      lote.diretorio,
      "--estado",
      "preparacao",
    );

    expect(resultado.status).toBe(3);
    expect(resultado.stdout).toContain("MANIFESTO_INVALIDO");
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain("SENTINELA-DE-TESTE");
  });
});
