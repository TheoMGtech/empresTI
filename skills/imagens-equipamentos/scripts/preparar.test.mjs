// @vitest-environment node
// Usa imagens sintéticas e respostas simuladas. O fetch global falha se for chamado.
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buscarCandidatos } from "./buscar.mjs";
import { calcularSha256, CATEGORIA_POR_ID, codigoDeSaida, validarManifesto } from "./nucleo.mjs";
import {
  baixarImagem,
  codigoDeSaidaDaFalha,
  concluirPreparacao,
  iniciarManifesto,
  processarImagem,
  registrarRejeicao,
  registrarRevisao,
  selecionarCandidato,
} from "./preparar.mjs";

const CLI_PREPARAR = fileURLToPath(new URL("./preparar.mjs", import.meta.url));
const CLI_VALIDAR = fileURLToPath(new URL("./validar.mjs", import.meta.url));
const CHAVE_FALSA = "CHAVE-FALSA-DE-TESTE-123456";
const INSTANTE = Date.UTC(2026, 10, 10, 12);
const IDS = [...CATEGORIA_POR_ID.keys()];
const URL_VALIDA = "https://pixabay.com/get/grande_1280.jpg";
const pastas = [];
let fetchReal;

beforeEach(() => {
  fetchReal = vi.fn(() => {
    throw new Error("chamada HTTP real em teste");
  });
  vi.stubGlobal("fetch", fetchReal);
});

afterEach(async () => {
  expect(fetchReal).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  await Promise.all(pastas.splice(0).map((pasta) => rm(pasta, { recursive: true, force: true })));
});

function imagem(indice = 0, largura = 1600, altura = 1200, formato = "jpeg") {
  const background = { r: (indice * 19) % 256, g: 255 - indice * 19, b: 60 };
  return sharp({ create: { width: largura, height: altura, channels: 3, background } })
    .toFormat(formato)
    .toBuffer();
}

function respostaImagem(bytes, { status = 200, headers = {} } = {}) {
  return new Response(bytes, { status, headers: { "content-type": "image/jpeg", ...headers } });
}

function fetchSimulado(...respostas) {
  return vi.fn(async () => {
    const proxima = respostas.shift();
    if (proxima === undefined) throw new Error("sem resposta simulada");
    if (proxima instanceof Error) throw proxima;
    return proxima;
  });
}

function hit(indice) {
  const id = 2000 + indice;
  return {
    id,
    pageURL: `https://pixabay.com/photos/foto-${id}/`,
    type: "photo",
    tags: "equipamento",
    largeImageURL: `https://pixabay.com/get/grande${id}_1280.jpg`,
    imageWidth: 1920,
    imageHeight: 1440,
    user: `autor${indice}`,
  };
}

async function capturarFalha(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("era esperada uma falha");
}

async function preparoComLote(quantosCandidatos = 12) {
  const diretorioTrabalho = await mkdtemp(path.join(tmpdir(), "imagens-preparar-"));
  pastas.push(diretorioTrabalho);
  const caminhoManifesto = path.join(diretorioTrabalho, "docs", "manifesto.json");
  const caminhoLote = path.join(diretorioTrabalho, "lote.json");
  await writeFile(
    caminhoLote,
    JSON.stringify(
      IDS.map((id) => ({
        id,
        equipamento: `Equipamento ${id}`,
        categoria: CATEGORIA_POR_ID.get(id),
      })),
    ),
  );
  await iniciarManifesto({ caminhoManifesto, caminhoLote, diretorioTrabalho });

  for (const [indice, id] of IDS.slice(0, quantosCandidatos).entries()) {
    await buscarCandidatos({
      id,
      termo: `termo ${id}`,
      diretorioTrabalho,
      obterChave: async () => CHAVE_FALSA,
      fetch: fetchSimulado(
        new Response(JSON.stringify({ total: 1, totalHits: 1, hits: [hit(indice)] })),
      ),
      agora: () => INSTANTE,
    });
  }

  const pastaFinal = path.join(diretorioTrabalho, "publicar");
  return {
    diretorioTrabalho,
    caminhoManifesto,
    caminhoLote,
    pastaFinal,
    lerManifesto: async () => JSON.parse(await readFile(caminhoManifesto, "utf8")),
    selecionar: (id, pixabayId, bytes, extras = {}) =>
      selecionarCandidato({
        caminhoManifesto,
        diretorioTrabalho,
        id,
        pixabayId,
        licencaConsultadaEm: "2026-11-09",
        agora: () => INSTANTE,
        fetch: fetchSimulado(respostaImagem(bytes)),
        ...extras,
      }),
    validar: (estado) => validarManifesto({ caminhoManifesto, diretorio: pastaFinal, estado }),
  };
}

async function arquivosEm(pasta) {
  try {
    return (await readdir(pasta)).sort();
  } catch {
    return [];
  }
}

async function selecionarTodos(preparo) {
  for (const [indice, id] of IDS.entries()) {
    await preparo.selecionar(id, 2000 + indice, await imagem(indice));
  }
}

describe("CA-IMG-12: download seguro", () => {
  it("CA-IMG-12: baixa JPEG válido sem seguir redirecionamento automaticamente", async () => {
    const bytes = await imagem();
    const buscarHttp = fetchSimulado(respostaImagem(bytes));

    const recebido = await baixarImagem(URL_VALIDA, { fetch: buscarHttp });

    expect(calcularSha256(recebido)).toBe(calcularSha256(bytes));
    expect(buscarHttp.mock.calls[0][1]).toMatchObject({ method: "GET", redirect: "manual" });
  });

  it.each([
    "http://pixabay.com/get/foto.jpg",
    "https://exemplo.com/foto.jpg",
    "https://localhost/foto.jpg",
    "https://10.0.0.1/foto.jpg",
    "file:///etc/passwd",
  ])("CA-IMG-12: recusa URL não permitida sem chamar a rede: %s", async (url) => {
    const buscarHttp = fetchSimulado();

    const falha = await capturarFalha(baixarImagem(url, { fetch: buscarHttp }));

    expect(falha.codigo).toBe("URL_NAO_PERMITIDA");
    expect(buscarHttp).not.toHaveBeenCalled();
  });

  it("CA-IMG-12: segue redirecionamento validado dentro dos hosts permitidos", async () => {
    const bytes = await imagem();
    const buscarHttp = fetchSimulado(
      new Response(null, {
        status: 302,
        headers: { location: "https://cdn.pixabay.com/foto.jpg" },
      }),
      respostaImagem(bytes),
    );

    await baixarImagem(URL_VALIDA, { fetch: buscarHttp });

    expect(buscarHttp.mock.calls[1][0]).toBe("https://cdn.pixabay.com/foto.jpg");
  });

  it.each([
    ["host externo", "https://exemplo.com/foto.jpg"],
    ["rede interna", "https://169.254.169.254/latest"],
    ["sem HTTPS", "http://pixabay.com/foto.jpg"],
    ["localhost", "https://localhost/foto.jpg"],
  ])("CA-IMG-12: recusa redirecionamento indevido: %s", async (_nome, location) => {
    const buscarHttp = fetchSimulado(new Response(null, { status: 302, headers: { location } }));

    const falha = await capturarFalha(baixarImagem(URL_VALIDA, { fetch: buscarHttp }));

    expect(falha.codigo).toBe("REDIRECIONAMENTO_NAO_PERMITIDO");
    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-12: recusa redirecionamento sem destino", async () => {
    const falha = await capturarFalha(
      baixarImagem(URL_VALIDA, { fetch: fetchSimulado(new Response(null, { status: 302 })) }),
    );

    expect(falha.codigo).toBe("REDIRECIONAMENTO_NAO_PERMITIDO");
  });

  it("CA-IMG-12: limita a quantidade de redirecionamentos", async () => {
    const redirecionar = () =>
      new Response(null, { status: 302, headers: { location: URL_VALIDA } });
    const buscarHttp = fetchSimulado(
      redirecionar(),
      redirecionar(),
      redirecionar(),
      redirecionar(),
    );

    const falha = await capturarFalha(baixarImagem(URL_VALIDA, { fetch: buscarHttp }));

    expect(falha.codigo).toBe("REDIRECIONAMENTO_NAO_PERMITIDO");
    expect(buscarHttp).toHaveBeenCalledTimes(3);
  });

  it("CA-IMG-12: recusa resposta de erro", async () => {
    const falha = await capturarFalha(
      baixarImagem(URL_VALIDA, {
        fetch: fetchSimulado(respostaImagem(await imagem(), { status: 404 })),
      }),
    );

    expect(falha.codigo).toBe("DOWNLOAD_RECUSADO");
    expect(falha.detalhes.status).toBe(404);
  });

  it("CA-IMG-12: recusa resposta HTML", async () => {
    const resposta = new Response("<html></html>", { headers: { "content-type": "text/html" } });

    const falha = await capturarFalha(baixarImagem(URL_VALIDA, { fetch: fetchSimulado(resposta) }));

    expect(falha.codigo).toBe("CONTEUDO_NAO_IMAGEM");
  });

  it("CA-IMG-12: recusa arquivo declarado acima do limite", async () => {
    const resposta = respostaImagem(await imagem(), { headers: { "content-length": "101" } });

    const falha = await capturarFalha(
      baixarImagem(URL_VALIDA, { fetch: fetchSimulado(resposta), limiteBytes: 100 }),
    );

    expect(falha.codigo).toBe("ARQUIVO_GRANDE_DEMAIS");
  });

  it("CA-IMG-12: interrompe fluxo que ultrapassa o limite sem tamanho declarado", async () => {
    const corpo = new ReadableStream({
      pull(controle) {
        controle.enqueue(new Uint8Array(60));
      },
    });
    const resposta = new Response(corpo, { headers: { "content-type": "image/jpeg" } });

    const falha = await capturarFalha(
      baixarImagem(URL_VALIDA, { fetch: fetchSimulado(resposta), limiteBytes: 100 }),
    );

    expect(falha.codigo).toBe("ARQUIVO_GRANDE_DEMAIS");
  });

  it("CA-IMG-12: impõe tempo limite", async () => {
    const buscarHttp = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolver, rejeitar) => {
          signal.addEventListener("abort", () => rejeitar(signal.reason));
        }),
    );

    const falha = await capturarFalha(
      baixarImagem(URL_VALIDA, { fetch: buscarHttp, tempoLimiteMs: 5 }),
    );

    expect(falha.codigo).toBe("TEMPO_ESGOTADO");
  });
});

describe("CA-IMG-05: processamento", () => {
  it("CA-IMG-05: gera JPEG de 800 × 600 em sRGB e sem metadados", async () => {
    const origem = await sharp(await imagem(0, 1920, 1280))
      .withExif({ IFD0: { Copyright: "Autor de teste" } })
      .jpeg()
      .toBuffer();

    const final = await processarImagem(origem);
    const medido = await sharp(final).metadata();

    expect(medido).toMatchObject({ format: "jpeg", width: 800, height: 600, space: "srgb" });
    expect(medido.exif).toBeUndefined();
    expect(medido.icc).toBeUndefined();
    expect(medido.orientation).toBeUndefined();
  });

  it("CA-IMG-05: recorta sem distorcer o objeto", async () => {
    const quadrado = await sharp({
      create: { width: 300, height: 300, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer();
    const origem = await sharp({
      create: { width: 1600, height: 900, channels: 3, background: "#000000" },
    })
      .composite([{ input: quadrado, gravity: "centre" }])
      .jpeg({ quality: 100 })
      .toBuffer();

    const final = await processarImagem(origem);
    const { data, info } = await sharp(final).raw().toBuffer({ resolveWithObject: true });
    const vermelho = (x, y) => data[(y * info.width + x) * info.channels] > 128;
    const larguraVermelha = Array.from({ length: 800 }, (_v, x) => vermelho(x, 300)).filter(
      Boolean,
    ).length;
    const alturaVermelha = Array.from({ length: 600 }, (_v, y) => vermelho(400, y)).filter(
      Boolean,
    ).length;

    expect(Math.abs(larguraVermelha - 200)).toBeLessThanOrEqual(4);
    expect(Math.abs(alturaVermelha - 200)).toBeLessThanOrEqual(4);
  });

  it("CA-IMG-05: respeita o enquadramento pedido", async () => {
    const topo = await sharp({
      create: { width: 1000, height: 400, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer();
    const origem = await sharp({
      create: { width: 1000, height: 1600, channels: 3, background: "#000000" },
    })
      .composite([{ input: topo, top: 0, left: 0 }])
      .jpeg()
      .toBuffer();

    const { data } = await sharp(await processarImagem(origem, { enquadramento: "top" }))
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(data[0]).toBeGreaterThan(128);
  });

  it("CA-IMG-05: normaliza a orientação EXIF", async () => {
    const origem = await sharp(await imagem(0, 1000, 800))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const medido = await sharp(await processarImagem(origem)).metadata();

    expect(medido).toMatchObject({ width: 800, height: 600 });
    expect(medido.orientation).toBeUndefined();
  });

  it("CA-IMG-05: mede a imagem depois de considerar a orientação", async () => {
    const origem = await sharp(await imagem(0, 900, 500))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    expect((await capturarFalha(processarImagem(origem))).codigo).toBe("ORIGEM_PEQUENA_DEMAIS");
  });

  it("CA-IMG-05: converte CMYK para sRGB", async () => {
    const origem = await sharp(await imagem(0))
      .toColourspace("cmyk")
      .jpeg()
      .toBuffer();

    expect(await sharp(await processarImagem(origem)).metadata()).toMatchObject({
      space: "srgb",
      channels: 3,
    });
  });

  it.each([
    ["largura", 799, 600],
    ["altura", 800, 599],
  ])("CA-IMG-05: não amplia imagem com %s insuficiente", async (_nome, largura, altura) => {
    expect((await capturarFalha(processarImagem(await imagem(0, largura, altura)))).codigo).toBe(
      "ORIGEM_PEQUENA_DEMAIS",
    );
  });

  it("CA-IMG-05: aceita exatamente 800 × 600 sem alterar o tamanho", async () => {
    expect(await sharp(await processarImagem(await imagem(0, 800, 600))).metadata()).toMatchObject({
      width: 800,
      height: 600,
    });
  });

  it("CA-IMG-12: recusa HTML que chega como imagem", async () => {
    expect((await capturarFalha(processarImagem(Buffer.from("<html></html>")))).codigo).toBe(
      "CONTEUDO_NAO_IMAGEM",
    );
  });

  it("CA-IMG-12: recusa formato real não permitido", async () => {
    const gif = await sharp({
      create: { width: 900, height: 700, channels: 3, background: "#123456" },
    })
      .gif()
      .toBuffer();

    expect((await capturarFalha(processarImagem(gif))).codigo).toBe("FORMATO_NAO_PERMITIDO");
  });

  it("CA-IMG-12: recusa imagem truncada", async () => {
    const bytes = await sharp({
      create: {
        width: 900,
        height: 700,
        channels: 3,
        noise: { type: "gaussian", mean: 128, sigma: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    expect((await capturarFalha(processarImagem(bytes.subarray(0, bytes.length / 2)))).codigo).toBe(
      "CONTEUDO_NAO_IMAGEM",
    );
  });

  it("CA-IMG-05: recusa enquadramento desconhecido", async () => {
    expect(
      (await capturarFalha(processarImagem(await imagem(), { enquadramento: "x" }))).codigo,
    ).toBe("ENTRADA_INVALIDA");
  });
});

describe("CA-IMG-14: seleção e idempotência", () => {
  it("CA-IMG-08: registra procedência, nome e SHA-256 sem aprovar nada", async () => {
    const preparo = await preparoComLote();

    const resultado = await preparo.selecionar("TI-0001", 2000, await imagem());
    const item = (await preparo.lerManifesto()).itens[0];
    const bytes = await readFile(path.join(preparo.pastaFinal, resultado.nome));

    expect(resultado.situacao).toBe("preparado");
    expect(resultado.nome).toBe(`TI-0001-${resultado.sha256.slice(0, 8)}.jpg`);
    expect(calcularSha256(bytes)).toBe(resultado.sha256);
    expect(item).toMatchObject({
      situacao: "selecionada",
      origem: {
        fonte: "Pixabay",
        pixabay_id: 2000,
        url_pagina: "https://pixabay.com/photos/foto-2000/",
        autor: "autor0",
        licenca: { consultada_em: "2026-11-09" },
        obtida_em: "2026-11-10",
        dimensoes_originais: { largura: 1920, altura: 1440 },
      },
      arquivo: { nome_relativo: resultado.nome, sha256: resultado.sha256 },
      revisao_visual: { resultado: "pendente" },
      storage: { destino_planejado: `equipamentos/${resultado.nome}` },
    });
    expect(item.aprovacao_humana).toBeUndefined();
    expect(item.publicacao).toBeUndefined();
    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
  });

  it("CA-IMG-14: repetição não baixa nem altera arquivos ou manifesto", async () => {
    const preparo = await preparoComLote();
    const primeira = await preparo.selecionar("TI-0001", 2000, await imagem());
    const manifestoAntes = await readFile(preparo.caminhoManifesto);
    const arquivo = path.join(preparo.pastaFinal, primeira.nome);
    const dataAntes = (await stat(arquivo)).mtimeMs;
    const buscarHttp = fetchSimulado();

    const segunda = await preparo.selecionar("TI-0001", 2000, Buffer.alloc(0), {
      fetch: buscarHttp,
    });

    expect(segunda).toEqual({
      situacao: "ja_preparado",
      nome: primeira.nome,
      sha256: primeira.sha256,
    });
    expect(buscarHttp).not.toHaveBeenCalled();
    expect((await readFile(preparo.caminhoManifesto)).equals(manifestoAntes)).toBe(true);
    expect((await stat(arquivo)).mtimeMs).toBe(dataAntes);
  });

  it("CA-IMG-14: interrompe quando o arquivo existente diverge do manifesto", async () => {
    const preparo = await preparoComLote();
    const { nome } = await preparo.selecionar("TI-0001", 2000, await imagem());
    const adulterado = await sharp(await imagem(5, 800, 600))
      .jpeg({ quality: 50 })
      .toBuffer();
    await writeFile(path.join(preparo.pastaFinal, nome), adulterado);
    const manifestoAntes = await readFile(preparo.caminhoManifesto);
    const buscarHttp = fetchSimulado();

    const falha = await capturarFalha(
      preparo.selecionar("TI-0002", 2001, Buffer.alloc(0), { fetch: buscarHttp }),
    );

    expect(falha.codigo).toBe("MANIFESTO_INCONSISTENTE");
    expect(falha.detalhes.problemas).toEqual([{ codigo: "HASH_DIVERGENTE", item: "TI-0001" }]);
    expect(buscarHttp).not.toHaveBeenCalled();
    expect((await readFile(preparo.caminhoManifesto)).equals(manifestoAntes)).toBe(true);
    expect((await readFile(path.join(preparo.pastaFinal, nome))).equals(adulterado)).toBe(true);
  });

  it("CA-IMG-14: interrompe quando o arquivo foi removido", async () => {
    const preparo = await preparoComLote();
    const { nome } = await preparo.selecionar("TI-0001", 2000, await imagem());
    await rm(path.join(preparo.pastaFinal, nome));

    const falha = await capturarFalha(preparo.selecionar("TI-0001", 2000, Buffer.alloc(0)));

    expect(falha.detalhes.problemas).toEqual([{ codigo: "ARQUIVO_AUSENTE", item: "TI-0001" }]);
  });

  it("CA-IMG-14: não sobrescreve arquivo existente com conteúdo divergente", async () => {
    const preparo = await preparoComLote();
    const origem = await imagem();
    const final = await processarImagem(origem);
    const nome = `TI-0001-${calcularSha256(final).slice(0, 8)}.jpg`;
    const manifestoAntes = await readFile(preparo.caminhoManifesto);
    await writeFile(path.join(preparo.pastaFinal, nome), "conteudo anterior");

    const falha = await capturarFalha(preparo.selecionar("TI-0001", 2000, origem));

    expect(falha.codigo).toBe("ARQUIVO_CONFLITANTE");
    expect(await readFile(path.join(preparo.pastaFinal, nome), "utf8")).toBe("conteudo anterior");
    expect((await readFile(preparo.caminhoManifesto)).equals(manifestoAntes)).toBe(true);
  });

  it("CA-IMG-14: reaproveita arquivo idêntico já existente", async () => {
    const preparo = await preparoComLote();
    const origem = await imagem();
    const final = await processarImagem(origem);
    const nome = `TI-0001-${calcularSha256(final).slice(0, 8)}.jpg`;
    await writeFile(path.join(preparo.pastaFinal, nome), final);

    expect((await preparo.selecionar("TI-0001", 2000, origem)).situacao).toBe("preparado");
    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
  });

  it("CA-IMG-14: não troca a fotografia já selecionada", async () => {
    const preparo = await preparoComLote();
    await preparo.selecionar("TI-0001", 2000, await imagem());

    expect((await capturarFalha(preparo.selecionar("TI-0001", 2001, await imagem(1)))).codigo).toBe(
      "CONFLITO_DE_SELECAO",
    );
  });

  it("CA-IMG-12: aceita somente candidatos registrados pela busca do equipamento", async () => {
    const preparo = await preparoComLote();
    const buscarHttp = fetchSimulado();

    const falha = await capturarFalha(
      preparo.selecionar("TI-0001", 2001, Buffer.alloc(0), { fetch: buscarHttp }),
    );

    expect(falha.codigo).toBe("CANDIDATO_NAO_SELECIONAVEL");
    expect(buscarHttp).not.toHaveBeenCalled();
  });

  it("CA-IMG-12: recusa candidato com busca vencida", async () => {
    const preparo = await preparoComLote();

    const falha = await capturarFalha(
      preparo.selecionar("TI-0001", 2000, await imagem(), {
        agora: () => INSTANTE + 24 * 60 * 60 * 1000,
      }),
    );

    expect(falha.codigo).toBe("CANDIDATO_EXPIRADO");
  });

  it("CA-IMG-12: recusa arquivo de candidatos com URL externa", async () => {
    const preparo = await preparoComLote();
    const caminho = path.join(preparo.diretorioTrabalho, "candidatos", "TI-0001.json");
    const registrados = JSON.parse(await readFile(caminho, "utf8"));
    registrados.candidatos[0].url_download = "https://exemplo.com/foto.jpg";
    await writeFile(caminho, JSON.stringify(registrados));
    const buscarHttp = fetchSimulado();

    const falha = await capturarFalha(
      preparo.selecionar("TI-0001", 2000, Buffer.alloc(0), { fetch: buscarHttp }),
    );

    expect(falha.codigo).toBe("URL_NAO_PERMITIDA");
    expect(buscarHttp).not.toHaveBeenCalled();
  });

  it("CA-IMG-06: recusa imagem final idêntica à de outro equipamento", async () => {
    const preparo = await preparoComLote();
    const origem = await imagem();
    await preparo.selecionar("TI-0001", 2000, origem);

    expect((await capturarFalha(preparo.selecionar("TI-0002", 2001, origem))).codigo).toBe(
      "DUPLICATA_SHA256",
    );
  });

  it.each([
    ["equipamento fora do lote", { id: "TI-0013" }],
    ["ID da Pixabay inválido", { pixabayId: -1 }],
    ["data de licença ausente", { licencaConsultadaEm: undefined }],
  ])("CA-IMG-12: recusa entrada inválida: %s", async (_nome, extras) => {
    const preparo = await preparoComLote();
    const buscarHttp = fetchSimulado();

    const falha = await capturarFalha(
      selecionarCandidato({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
        id: "TI-0001",
        pixabayId: 2000,
        licencaConsultadaEm: "2026-11-09",
        fetch: buscarHttp,
        ...extras,
      }),
    );

    expect(falha.codigo).toBe("ENTRADA_INVALIDA");
    expect(buscarHttp).not.toHaveBeenCalled();
  });
});

describe("CA-IMG-12: falha sem arquivo parcial", () => {
  const semArtefatos = async (preparo, manifestoAntes) => {
    expect(await arquivosEm(preparo.pastaFinal)).toEqual([]);
    expect(await arquivosEm(path.join(preparo.diretorioTrabalho, "tmp"))).toEqual([]);
    expect((await readFile(preparo.caminhoManifesto)).equals(manifestoAntes)).toBe(true);
  };

  it("CA-IMG-12: não deixa arquivo quando o fluxo cai no meio", async () => {
    const preparo = await preparoComLote();
    const manifestoAntes = await readFile(preparo.caminhoManifesto);
    const corpo = new ReadableStream({
      start(controle) {
        controle.error(new Error("conexão interrompida"));
      },
    });
    const resposta = new Response(corpo, { headers: { "content-type": "image/jpeg" } });

    const falha = await capturarFalha(
      preparo.selecionar("TI-0001", 2000, Buffer.alloc(0), { fetch: fetchSimulado(resposta) }),
    );

    expect(falha.codigo).toBe("REDE_INDISPONIVEL");
    await semArtefatos(preparo, manifestoAntes);
  });

  it("CA-IMG-12: não deixa arquivo quando a imagem é pequena demais", async () => {
    const preparo = await preparoComLote();
    const manifestoAntes = await readFile(preparo.caminhoManifesto);

    const falha = await capturarFalha(
      preparo.selecionar("TI-0001", 2000, await imagem(0, 640, 480)),
    );

    expect(falha.codigo).toBe("ORIGEM_PEQUENA_DEMAIS");
    await semArtefatos(preparo, manifestoAntes);
  });

  it("CA-IMG-12: não deixa arquivo quando o conteúdo não é imagem", async () => {
    const preparo = await preparoComLote();
    const manifestoAntes = await readFile(preparo.caminhoManifesto);

    await capturarFalha(preparo.selecionar("TI-0001", 2000, Buffer.from("<html></html>")));

    await semArtefatos(preparo, manifestoAntes);
  });
});

describe("CA-IMG-09: rejeições e revisão", () => {
  it("CA-IMG-09: registra candidato rejeitado com motivos, sem confundi-lo com selecionado", async () => {
    const preparo = await preparoComLote();

    const resultado = await registrarRejeicao({
      caminhoManifesto: preparo.caminhoManifesto,
      diretorioTrabalho: preparo.diretorioTrabalho,
      id: "TI-0001",
      pixabayId: 2000,
      motivos: ["MARCA", "PESSOA"],
      observacao: "Logotipo visível",
      agora: () => INSTANTE,
    });
    const manifesto = await preparo.lerManifesto();

    expect(resultado.situacao).toBe("rejeitada");
    expect(manifesto.rejeicoes).toEqual([
      {
        id_equipamento: "TI-0001",
        pixabay_id: 2000,
        url_pagina: "https://pixabay.com/photos/foto-2000/",
        motivos: ["MARCA", "PESSOA"],
        observacao: "Logotipo visível",
        rejeitada_em: "2026-11-10",
      },
    ]);
    expect(manifesto.itens[0].situacao).toBe("pendente");
    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
  });

  it("CA-IMG-09: impede selecionar candidato já rejeitado", async () => {
    const preparo = await preparoComLote();
    const rejeitar = () =>
      registrarRejeicao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
        id: "TI-0001",
        pixabayId: 2000,
        motivos: ["MARCA"],
        agora: () => INSTANTE,
      });
    await rejeitar();

    expect((await capturarFalha(preparo.selecionar("TI-0001", 2000, await imagem()))).codigo).toBe(
      "CANDIDATO_REJEITADO",
    );
    expect((await rejeitar()).situacao).toBe("ja_registrada");
    expect((await preparo.lerManifesto()).rejeicoes).toHaveLength(1);
  });

  it("CA-IMG-09: rejeitar a fotografia selecionada reabre o item e remove o arquivo", async () => {
    const preparo = await preparoComLote();
    const { nome } = await preparo.selecionar("TI-0001", 2000, await imagem());

    const resultado = await registrarRejeicao({
      caminhoManifesto: preparo.caminhoManifesto,
      diretorioTrabalho: preparo.diretorioTrabalho,
      id: "TI-0001",
      pixabayId: 2000,
      motivos: ["RECORTE"],
      agora: () => INSTANTE,
    });
    const manifesto = await preparo.lerManifesto();

    expect(resultado.situacao).toBe("rejeitada_e_item_reaberto");
    expect(manifesto.itens[0]).toEqual({
      id: "TI-0001",
      equipamento: "Equipamento TI-0001",
      categoria: "Notebook",
      situacao: "pendente",
    });
    expect(await arquivosEm(preparo.pastaFinal)).not.toContain(nome);
    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
  });

  it("CA-IMG-09: recusa rejeição sem motivo conhecido", async () => {
    const preparo = await preparoComLote();

    for (const motivos of [[], ["INVENTADO"], undefined]) {
      const falha = await capturarFalha(
        registrarRejeicao({
          caminhoManifesto: preparo.caminhoManifesto,
          diretorioTrabalho: preparo.diretorioTrabalho,
          id: "TI-0001",
          pixabayId: 2000,
          motivos,
        }),
      );
      expect(falha.codigo).toBe("ENTRADA_INVALIDA");
    }
  });

  it("CA-IMG-09: revisão visual exige comando explícito e não aprova o humano", async () => {
    const preparo = await preparoComLote();
    await preparo.selecionar("TI-0001", 2000, await imagem());
    const revisar = () =>
      registrarRevisao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
        id: "TI-0001",
        resultado: "aceita_agente",
      });

    expect((await revisar()).situacao).toBe("registrada");
    expect((await revisar()).situacao).toBe("sem_alteracao");
    const item = (await preparo.lerManifesto()).itens[0];
    expect(item.revisao_visual).toEqual({ resultado: "aceita_agente" });
    expect(item.aprovacao_humana).toBeUndefined();
  });

  it("CA-IMG-09: recusa resultados de revisão que representem aprovação humana", async () => {
    const preparo = await preparoComLote();

    for (const resultado of ["aprovada", "pendente", undefined]) {
      const falha = await capturarFalha(
        registrarRevisao({
          caminhoManifesto: preparo.caminhoManifesto,
          diretorioTrabalho: preparo.diretorioTrabalho,
          id: "TI-0001",
          resultado,
        }),
      );
      expect(falha.codigo).toBe("ENTRADA_INVALIDA");
    }
  });
});

describe("CA-IMG-14: compatibilidade com a T3", () => {
  const revisarTodos = async (preparo) => {
    for (const id of IDS) {
      await registrarRevisao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
        id,
        resultado: "aceita_agente",
      });
    }
  };

  it("CA-IMG-14: o manifesto inicial passa no validador em preparação", async () => {
    const preparo = await preparoComLote(0);
    const manifesto = await preparo.lerManifesto();

    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
    expect(manifesto.semelhanca_visual).toEqual({ situacao: "nao_verificada" });
    expect(manifesto.itens.every((item) => item.situacao === "pendente")).toBe(true);
  });

  it("CA-IMG-14: não sobrescreve manifesto existente", async () => {
    const preparo = await preparoComLote(0);
    const falha = await capturarFalha(
      iniciarManifesto({
        caminhoManifesto: preparo.caminhoManifesto,
        caminhoLote: preparo.caminhoLote,
        diretorioTrabalho: preparo.diretorioTrabalho,
      }),
    );

    expect(falha.codigo).toBe("MANIFESTO_JA_EXISTE");
  });

  it("CA-IMG-14: recusa concluir com item incompleto e mantém o manifesto", async () => {
    const preparo = await preparoComLote();
    await preparo.selecionar("TI-0001", 2000, await imagem());
    const manifestoAntes = await readFile(preparo.caminhoManifesto);

    const falha = await capturarFalha(
      concluirPreparacao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
      }),
    );

    expect(falha.codigo).toBe("MANIFESTO_REPROVADO");
    expect(falha.detalhes.problemas).toContainEqual({
      codigo: "ITEM_SEM_FOTOGRAFIA",
      item: "TI-0002",
    });
    expect((await readFile(preparo.caminhoManifesto)).equals(manifestoAntes)).toBe(true);
  });

  it("CA-IMG-14: recusa concluir com revisão visual pendente", async () => {
    const preparo = await preparoComLote();
    await selecionarTodos(preparo);

    const falha = await capturarFalha(
      concluirPreparacao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
      }),
    );

    expect(falha.detalhes.problemas).toContainEqual({
      codigo: "REVISAO_NAO_ACEITA",
      item: "TI-0001",
    });
  });

  it("CA-IMG-14: fluxo completo chega a final_revisao e passa no validar.mjs real", async () => {
    const preparo = await preparoComLote();
    await selecionarTodos(preparo);
    await revisarTodos(preparo);
    const concluir = () =>
      concluirPreparacao({
        caminhoManifesto: preparo.caminhoManifesto,
        diretorioTrabalho: preparo.diretorioTrabalho,
      });

    expect((await concluir()).situacao).toBe("final_revisao");
    expect((await concluir()).situacao).toBe("sem_alteracao");

    const manifesto = await preparo.lerManifesto();
    const validador = spawnSync(
      process.execPath,
      [
        CLI_VALIDAR,
        "--manifesto",
        preparo.caminhoManifesto,
        "--diretorio",
        preparo.pastaFinal,
        "--estado",
        "final_revisao",
      ],
      { encoding: "utf8" },
    );

    expect(validador.status).toBe(0);
    expect(validador.stdout).toContain("arquivos verificados: 12");
    expect(await arquivosEm(preparo.pastaFinal)).toHaveLength(12);
    expect(manifesto.estado).toBe("final_revisao");
  });

  it("CA-IMG-14: os scripts não fabricam os estados aprovado ou publicado", async () => {
    const preparo = await preparoComLote();
    await selecionarTodos(preparo);
    await revisarTodos(preparo);
    await concluirPreparacao({
      caminhoManifesto: preparo.caminhoManifesto,
      diretorioTrabalho: preparo.diretorioTrabalho,
    });

    const aprovado = await preparo.validar("aprovado");
    const publicado = await preparo.validar("publicado");
    const manifesto = await preparo.lerManifesto();

    expect(aprovado.aprovado).toBe(false);
    expect(aprovado.problemas.map((p) => p.codigo)).toContain("APROVACAO_AUSENTE");
    expect(aprovado.problemas.map((p) => p.codigo)).toContain("SEMELHANCA_NAO_VERIFICADA");
    expect(publicado.problemas.map((p) => p.codigo)).toContain("PUBLICACAO_AUSENTE");
    expect(codigoDeSaida(aprovado)).toBe(6);
    expect(manifesto.semelhanca_visual).toEqual({ situacao: "nao_verificada" });
    expect(manifesto.itens.some((item) => item.aprovacao_humana || item.publicacao)).toBe(false);
  });

  it("CA-IMG-09: reprovar na revisão final reabre o item e volta à preparação", async () => {
    const preparo = await preparoComLote();
    await selecionarTodos(preparo);
    await revisarTodos(preparo);
    await concluirPreparacao({
      caminhoManifesto: preparo.caminhoManifesto,
      diretorioTrabalho: preparo.diretorioTrabalho,
    });

    await registrarRejeicao({
      caminhoManifesto: preparo.caminhoManifesto,
      diretorioTrabalho: preparo.diretorioTrabalho,
      id: "TI-0003",
      pixabayId: 2002,
      motivos: ["MARCA"],
      agora: () => INSTANTE,
    });

    expect((await preparo.lerManifesto()).estado).toBe("preparacao");
    expect((await preparo.validar("preparacao")).aprovado).toBe(true);
  });

  it("CA-IMG-11: manifesto e artefatos não contêm a chave", async () => {
    const preparo = await preparoComLote();
    await selecionarTodos(preparo);
    const entradas = await readdir(preparo.diretorioTrabalho, {
      recursive: true,
      withFileTypes: true,
    });
    const arquivos = entradas.filter((entrada) => entrada.isFile());

    for (const arquivo of arquivos) {
      const bytes = await readFile(path.join(arquivo.parentPath, arquivo.name));
      expect(bytes.includes(CHAVE_FALSA)).toBe(false);
    }
    expect(arquivos.length).toBeGreaterThan(12);
  });
});

describe("CA-IMG-12: linha de comando", () => {
  const executar = (...argumentos) =>
    spawnSync(process.execPath, [CLI_PREPARAR, ...argumentos], { encoding: "utf8" });

  it("CA-IMG-12: mostra a ajuda e sai com 0", () => {
    const resultado = executar("--ajuda");

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain("selecionar");
    expect(resultado.stdout).not.toMatch(/aprovar|publicar /);
  });

  it.each([
    ["sem argumentos", []],
    ["comando desconhecido", ["aprovar", "--manifesto", "m.json"]],
    ["sem manifesto", ["concluir"]],
    ["opção desconhecida", ["concluir", "--manifesto", "m.json", "--chave=SENTINELA-DE-TESTE"]],
  ])("CA-IMG-12: sai com 2 em uso incorreto: %s", (_nome, argumentos) => {
    const resultado = executar(...argumentos);

    expect(resultado.status).toBe(2);
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain("SENTINELA-DE-TESTE");
  });

  it.each([
    ["ENTRADA_INVALIDA", 2],
    ["DOWNLOAD_RECUSADO", 4],
    ["REDIRECIONAMENTO_NAO_PERMITIDO", 4],
    ["ORIGEM_PEQUENA_DEMAIS", 5],
    ["CONTEUDO_NAO_IMAGEM", 5],
    ["MANIFESTO_INCONSISTENTE", 3],
    ["ARQUIVO_CONFLITANTE", 3],
  ])("CA-IMG-12: associa %s ao código de saída %i", (codigo, saida) => {
    expect(codigoDeSaidaDaFalha(codigo)).toBe(saida);
  });
});
