// @vitest-environment node
// Toda resposta HTTP é simulada: o fetch global é trocado por um que falha se for chamado.
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buscarCandidatos,
  candidatoSchema,
  carregarChave,
  ENDPOINT,
  falhaDeRede,
  formatarResultado,
  lerCandidatos,
  urlDeDownloadPermitida,
  VALIDADE_DO_CACHE_MS,
} from "./buscar.mjs";
import { urlDePaginaValida } from "./nucleo.mjs";

const CLI = fileURLToPath(new URL("./buscar.mjs", import.meta.url));
const CHAVE_FALSA = "CHAVE-FALSA-DE-TESTE-123456";
const INSTANTE = Date.UTC(2026, 10, 10, 12);
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

async function criarTrabalho() {
  const pasta = await mkdtemp(path.join(tmpdir(), "imagens-buscar-"));
  pastas.push(pasta);
  return pasta;
}

function hit(indice = 0, extras = {}) {
  const id = 2000 + indice;
  return {
    id,
    pageURL: `https://pixabay.com/photos/foto-${id}/`,
    type: "photo",
    tags: "laptop, desk, computer",
    previewURL: `https://cdn.pixabay.com/photo/2016/foto${id}_150.jpg`,
    webformatURL: `https://pixabay.com/get/media${id}_640.jpg`,
    largeImageURL: `https://pixabay.com/get/grande${id}_1280.jpg`,
    imageWidth: 1920,
    imageHeight: 1280,
    user: `autor${indice}`,
    campo_novo_da_api: "ignorado",
    ...extras,
  };
}

function respostaJson(hits, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify({ total: hits.length, totalHits: hits.length, hits }), {
    status,
    headers,
  });
}

function fetchSimulado(...respostas) {
  return vi.fn(async () => {
    const proxima = respostas.shift();
    if (proxima === undefined) throw new Error("sem resposta simulada");
    if (proxima instanceof Error) throw proxima;
    return proxima;
  });
}

async function opcoes(extras = {}) {
  return {
    id: "TI-0001",
    termo: "laptop white desk",
    diretorioTrabalho: await criarTrabalho(),
    obterChave: vi.fn(async () => CHAVE_FALSA),
    dormir: vi.fn(async () => {}),
    agora: () => INSTANTE,
    ...extras,
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

async function conteudoDe(pasta) {
  const entradas = await readdir(pasta, { recursive: true, withFileTypes: true });
  const arquivos = entradas.filter((entrada) => entrada.isFile());
  const textos = await Promise.all(
    arquivos.map((arquivo) => readFile(path.join(arquivo.parentPath, arquivo.name), "utf8")),
  );
  return textos.join("\n");
}

describe("CA-IMG-13: busca válida e parâmetros", () => {
  it("CA-IMG-13: envia os parâmetros obrigatórios ao endpoint oficial, sem repetir nem paginar", async () => {
    const buscarHttp = fetchSimulado(respostaJson([hit()]));

    await buscarCandidatos(await opcoes({ fetch: buscarHttp, limite: 5 }));

    expect(buscarHttp).toHaveBeenCalledTimes(1);
    const [url, init] = buscarHttp.mock.calls[0];
    expect(`${url.origin}${url.pathname}`).toBe(ENDPOINT);
    expect(url.protocol).toBe("https:");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      key: CHAVE_FALSA,
      q: "laptop white desk",
      lang: "en",
      image_type: "photo",
      orientation: "horizontal",
      safesearch: "true",
      min_width: "800",
      min_height: "600",
      per_page: "5",
      page: "1",
    });
    expect(init).toMatchObject({ method: "GET", redirect: "manual" });
  });

  it("CA-IMG-13: retorna candidatos sem nenhuma marca de aprovação", async () => {
    const resultado = await buscarCandidatos(
      await opcoes({ fetch: fetchSimulado(respostaJson([hit(0), hit(1)])) }),
    );

    expect(resultado.de_cache).toBe(false);
    expect(resultado.candidatos).toHaveLength(2);
    expect(JSON.stringify(resultado)).not.toMatch(/aprov|revisao/i);
    expect(formatarResultado(resultado)).toContain("Nenhuma imagem foi aprovada");
  });

  it("CA-IMG-13: trata resposta vazia sem falhar", async () => {
    const resultado = await buscarCandidatos(
      await opcoes({ fetch: fetchSimulado(respostaJson([])) }),
    );

    expect(resultado.candidatos).toEqual([]);
    expect(resultado.total_disponivel).toBe(0);
  });

  it.each([
    ["equipamento fora do lote", { id: "TI-0013" }],
    ["termo vazio", { termo: "  " }],
    ["termo longo demais", { termo: "x".repeat(101) }],
    ["idioma desconhecido", { idioma: "xx" }],
    ["limite pequeno", { limite: 2 }],
    ["limite grande", { limite: 51 }],
    ["limite fracionário", { limite: 4.5 }],
  ])("CA-IMG-13: recusa pedido inválido sem chamar a API: %s", async (_nome, extras) => {
    const buscarHttp = fetchSimulado();
    const base = await opcoes({ fetch: buscarHttp, ...extras });

    const falha = await capturarFalha(buscarCandidatos(base));

    expect(falha.codigo).toBe("ENTRADA_INVALIDA");
    expect(base.obterChave).not.toHaveBeenCalled();
    expect(buscarHttp).not.toHaveBeenCalled();
  });
});

describe("CA-IMG-13: normalização", () => {
  it("CA-IMG-13: normaliza os metadados e ignora campos novos da API", async () => {
    const [candidato] = (
      await buscarCandidatos(await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) }))
    ).candidatos;

    expect(candidato).toEqual({
      pixabay_id: 2000,
      url_pagina: "https://pixabay.com/photos/foto-2000/",
      autor: "autor0",
      tipo: "photo",
      tags: ["laptop", "desk", "computer"],
      dimensoes_originais: { largura: 1920, altura: 1280 },
      url_download: "https://pixabay.com/get/grande2000_1280.jpg",
      url_previa: "https://pixabay.com/get/media2000_640.jpg",
    });
    expect(candidatoSchema.safeParse(candidato).success).toBe(true);
  });

  it("CA-IMG-13: gera URL de origem aceita pelo contrato da T3", async () => {
    const [candidato] = (
      await buscarCandidatos(await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) }))
    ).candidatos;

    expect(urlDePaginaValida(candidato.url_pagina, candidato.pixabay_id)).toBe(true);
  });

  it.each([
    ["TIPO_NAO_FOTO", { type: "illustration" }],
    ["DIMENSOES_INSUFICIENTES", { imageWidth: 799 }],
    ["DIMENSOES_INSUFICIENTES", { imageHeight: 599 }],
    ["AUTOR_AUSENTE", { user: "  " }],
    ["URL_ORIGEM_INVALIDA", { pageURL: "https://exemplo.com/foto-2000/" }],
    ["URL_DOWNLOAD_NAO_PERMITIDA", { largeImageURL: "https://exemplo.com/foto.jpg" }],
    ["URL_DOWNLOAD_NAO_PERMITIDA", { largeImageURL: "http://pixabay.com/get/foto.jpg" }],
  ])("CA-IMG-12: descarta candidato com %s", async (motivo, extras) => {
    const resultado = await buscarCandidatos(
      await opcoes({ fetch: fetchSimulado(respostaJson([hit(0, extras)])) }),
    );

    expect(resultado.candidatos).toEqual([]);
    expect(resultado.descartados).toEqual([{ pixabay_id: 2000, motivo }]);
  });

  it("CA-IMG-13: rejeita resposta sem campo obrigatório", async () => {
    const incompleto = hit();
    delete incompleto.largeImageURL;
    const falha = await capturarFalha(
      buscarCandidatos(await opcoes({ fetch: fetchSimulado(respostaJson([incompleto])) })),
    );

    expect(falha.codigo).toBe("RESPOSTA_INVALIDA");
  });

  it("CA-IMG-13: rejeita JSON inválido", async () => {
    const falha = await capturarFalha(
      buscarCandidatos(await opcoes({ fetch: fetchSimulado(new Response("<html>erro</html>")) })),
    );

    expect(falha.codigo).toBe("RESPOSTA_INVALIDA");
  });

  it("CA-IMG-13: rejeita corpo acima do limite", async () => {
    const resposta = new Response("{}", { headers: { "content-length": String(6 * 1024 * 1024) } });
    const falha = await capturarFalha(
      buscarCandidatos(await opcoes({ fetch: fetchSimulado(resposta) })),
    );

    expect(falha.codigo).toBe("RESPOSTA_INVALIDA");
  });

  it("CA-IMG-12: permite download apenas em HTTPS nos hosts da Pixabay", () => {
    expect(urlDeDownloadPermitida("https://pixabay.com/get/foto.jpg")).toBe(true);
    expect(urlDeDownloadPermitida("https://cdn.pixabay.com/photo/foto.jpg")).toBe(true);
    for (const url of [
      "http://pixabay.com/get/foto.jpg",
      "https://pixabay.com.exemplo.com/foto.jpg",
      "https://localhost/foto.jpg",
      "https://127.0.0.1/foto.jpg",
      "https://169.254.169.254/latest",
      "https://usuario:senha@pixabay.com/foto.jpg",
      "https://pixabay.com:8443/foto.jpg",
      "https://pixabay.com/get/foto.jpg?key=abc",
      "file:///etc/passwd",
      "nao-e-url",
    ]) {
      expect(urlDeDownloadPermitida(url)).toBe(false);
    }
  });
});

describe("CA-IMG-13: cache de 24 horas", () => {
  it("CA-IMG-13: reutiliza cache válido sem rede e sem ler a chave", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) });
    await buscarCandidatos(base);

    const buscarHttp = fetchSimulado();
    const obterChave = vi.fn();
    const segunda = await buscarCandidatos({
      ...base,
      fetch: buscarHttp,
      obterChave,
      agora: () => INSTANTE + VALIDADE_DO_CACHE_MS - 1,
    });

    expect(segunda.de_cache).toBe(true);
    expect(segunda.candidatos).toHaveLength(1);
    expect(buscarHttp).not.toHaveBeenCalled();
    expect(obterChave).not.toHaveBeenCalled();
  });

  it("CA-IMG-13: consulta novamente quando o cache expira", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit(0)])) });
    await buscarCandidatos(base);

    const buscarHttp = fetchSimulado(respostaJson([hit(1)]));
    const segunda = await buscarCandidatos({
      ...base,
      fetch: buscarHttp,
      agora: () => INSTANTE + VALIDADE_DO_CACHE_MS,
    });

    expect(segunda.de_cache).toBe(false);
    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: ignora cache corrompido e consulta a API", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) });
    await buscarCandidatos(base);
    const pastaCache = path.join(base.diretorioTrabalho, "cache");
    for (const nome of await readdir(pastaCache)) {
      await writeFile(path.join(pastaCache, nome), "{corrompido");
    }

    const buscarHttp = fetchSimulado(respostaJson([hit()]));
    const segunda = await buscarCandidatos({ ...base, fetch: buscarHttp });

    expect(segunda.de_cache).toBe(false);
  });

  it("CA-IMG-13: acumula candidatos por equipamento e preserva a data da consulta", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit(0)])) });
    await buscarCandidatos(base);
    await buscarCandidatos({
      ...base,
      termo: "outro termo",
      fetch: fetchSimulado(respostaJson([hit(1)])),
    });

    const registrados = await lerCandidatos(base.diretorioTrabalho, "TI-0001");

    expect(registrados.candidatos.map((c) => c.pixabay_id)).toEqual([2000, 2001]);
    expect(registrados.candidatos[0]).toMatchObject({
      consultado_em: INSTANTE,
      termo: "laptop white desk",
    });
  });
});

describe("CA-IMG-13: falhas e limites", () => {
  it.each([401, 403])("CA-IMG-13: não repete resposta %i", async (status) => {
    const buscarHttp = fetchSimulado(respostaJson([], { status }));
    const falha = await capturarFalha(buscarCandidatos(await opcoes({ fetch: buscarHttp })));

    expect(falha.codigo).toBe("CHAVE_RECUSADA");
    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: não repete resposta 400", async () => {
    const buscarHttp = fetchSimulado(respostaJson([], { status: 400 }));
    const falha = await capturarFalha(buscarCandidatos(await opcoes({ fetch: buscarHttp })));

    expect(falha.codigo).toBe("REQUISICAO_RECUSADA");
    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: recusa redirecionamento da API", async () => {
    const buscarHttp = fetchSimulado(
      respostaJson([], { status: 302, headers: { location: "https://exemplo.com/" } }),
    );
    const falha = await capturarFalha(buscarCandidatos(await opcoes({ fetch: buscarHttp })));

    expect(falha.codigo).toBe("REDIRECIONAMENTO_NAO_PERMITIDO");
    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: em 429 respeita Retry-After e repete uma vez", async () => {
    const base = await opcoes({
      fetch: fetchSimulado(
        respostaJson([], { status: 429, headers: { "retry-after": "7" } }),
        respostaJson([hit()]),
      ),
    });

    const resultado = await buscarCandidatos(base);

    expect(base.dormir).toHaveBeenCalledExactlyOnceWith(7000);
    expect(resultado.candidatos).toHaveLength(1);
  });

  it("CA-IMG-13: em 429 usa o maior valor entre Retry-After e X-RateLimit-Reset", async () => {
    const base = await opcoes({
      fetch: fetchSimulado(
        respostaJson([], {
          status: 429,
          headers: { "retry-after": "5", "x-ratelimit-reset": "9" },
        }),
        respostaJson([hit()]),
      ),
    });

    await buscarCandidatos(base);

    expect(base.dormir).toHaveBeenCalledExactlyOnceWith(9000);
  });

  it("CA-IMG-13: não cria ciclo quando o 429 persiste", async () => {
    const cabecalhos = { headers: { "retry-after": "1" }, status: 429 };
    const buscarHttp = fetchSimulado(respostaJson([], cabecalhos), respostaJson([], cabecalhos));
    const base = await opcoes({ fetch: buscarHttp });

    const falha = await capturarFalha(buscarCandidatos(base));

    expect(falha.codigo).toBe("LIMITE_EXCEDIDO");
    expect(buscarHttp).toHaveBeenCalledTimes(2);
    expect(base.dormir).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: não repete 429 com espera longa ou desconhecida", async () => {
    for (const headers of [{ "retry-after": "3600" }, {}]) {
      const buscarHttp = fetchSimulado(respostaJson([], { status: 429, headers }));
      const base = await opcoes({ fetch: buscarHttp });

      const falha = await capturarFalha(buscarCandidatos(base));

      expect(falha.codigo).toBe("LIMITE_EXCEDIDO");
      expect(buscarHttp).toHaveBeenCalledTimes(1);
      expect(base.dormir).not.toHaveBeenCalled();
    }
  });

  it("CA-IMG-13: não chama a API enquanto os cabeçalhos indicam limite esgotado", async () => {
    const base = await opcoes({
      fetch: fetchSimulado(
        respostaJson([hit()], {
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "30" },
        }),
      ),
    });
    await buscarCandidatos(base);

    const buscarHttp = fetchSimulado();
    const falha = await capturarFalha(
      buscarCandidatos({ ...base, termo: "outro termo", fetch: buscarHttp }),
    );

    expect(falha.codigo).toBe("LIMITE_EXCEDIDO");
    expect(falha.detalhes.aguardar_s).toBe(30);
    expect(buscarHttp).not.toHaveBeenCalled();
  });

  it("CA-IMG-13: volta a consultar depois que a janela de limite termina", async () => {
    const base = await opcoes({
      fetch: fetchSimulado(
        respostaJson([hit()], {
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "30" },
        }),
      ),
    });
    await buscarCandidatos(base);

    const buscarHttp = fetchSimulado(respostaJson([hit()]));
    await buscarCandidatos({
      ...base,
      termo: "outro termo",
      fetch: buscarHttp,
      agora: () => INSTANTE + 30_000,
    });

    expect(buscarHttp).toHaveBeenCalledTimes(1);
  });

  it("CA-IMG-13: repete uma vez em erro 5xx e depois para", async () => {
    const buscarHttp = fetchSimulado(
      respostaJson([], { status: 500 }),
      respostaJson([], { status: 503 }),
    );
    const falha = await capturarFalha(buscarCandidatos(await opcoes({ fetch: buscarHttp })));

    expect(falha.codigo).toBe("ERRO_DO_SERVIDOR");
    expect(buscarHttp).toHaveBeenCalledTimes(2);
  });

  it("CA-IMG-13: conclui quando o 5xx é transitório", async () => {
    const buscarHttp = fetchSimulado(respostaJson([], { status: 502 }), respostaJson([hit()]));

    const resultado = await buscarCandidatos(await opcoes({ fetch: buscarHttp }));

    expect(resultado.candidatos).toHaveLength(1);
  });

  it("CA-IMG-13: limita o timeout a uma única repetição", async () => {
    const buscarHttp = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolver, rejeitar) => {
          signal.addEventListener("abort", () => rejeitar(signal.reason));
        }),
    );
    const base = await opcoes({ fetch: buscarHttp, tempoLimiteMs: 5 });

    const falha = await capturarFalha(buscarCandidatos(base));

    expect(falha.codigo).toBe("TEMPO_ESGOTADO");
    expect(buscarHttp).toHaveBeenCalledTimes(2);
  });
});

describe("CA-IMG-11: proteção da chave", () => {
  const armazenar = async (conteudo) => {
    const caminho = path.join(await criarTrabalho(), "credencial-de-teste");
    await writeFile(caminho, conteudo);
    return caminho;
  };

  it("CA-IMG-11: lê somente a variável aprovada do arquivo indicado", async () => {
    const caminho = await armazenar(`OUTRA=valor\r\nPIXABAY_API_KEY=${CHAVE_FALSA}\r\n`);

    await expect(carregarChave(caminho)).resolves.toBe(CHAVE_FALSA);
    expect(process.env.PIXABAY_API_KEY).toBeUndefined();
  });

  it("CA-IMG-11: aceita valor entre aspas", async () => {
    await expect(
      carregarChave(await armazenar(`PIXABAY_API_KEY="${CHAVE_FALSA}"\n`)),
    ).resolves.toBe(CHAVE_FALSA);
  });

  it("CA-IMG-11: produz erro controlado para chave ausente", async () => {
    const pasta = await criarTrabalho();
    for (const caminho of [
      path.join(pasta, "nao-existe"),
      await armazenar("OUTRA=valor\n"),
      await armazenar("PIXABAY_API_KEY=\n"),
    ]) {
      const falha = await capturarFalha(carregarChave(caminho));
      expect(falha.codigo).toBe("CHAVE_AUSENTE");
      expect(falha.message).not.toContain(pasta);
    }
  });

  it("CA-IMG-11: recusa chave malformada sem repetir o valor", async () => {
    const falha = await capturarFalha(
      carregarChave(await armazenar("PIXABAY_API_KEY=abc def&x=1\n")),
    );

    expect(falha.codigo).toBe("CHAVE_MALFORMADA");
    expect(falha.message).not.toContain("abc def");
  });

  it("CA-IMG-11: ausência da chave interrompe antes de chamar a API", async () => {
    const buscarHttp = fetchSimulado();
    const base = await opcoes({
      fetch: buscarHttp,
      obterChave: () => carregarChave(path.join(tmpdir(), "credencial-inexistente-de-teste")),
    });

    const falha = await capturarFalha(buscarCandidatos(base));

    expect(falha.codigo).toBe("CHAVE_AUSENTE");
    expect(buscarHttp).not.toHaveBeenCalled();
  });

  it("CA-IMG-11: cache e candidatos não contêm a chave", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) });
    await buscarCandidatos(base);

    const conteudo = await conteudoDe(base.diretorioTrabalho);

    expect(conteudo).toContain("laptop white desk");
    expect(conteudo).not.toContain(CHAVE_FALSA);
  });

  it("CA-IMG-11: recusa gravar resposta que repita a chave", async () => {
    const base = await opcoes({
      fetch: fetchSimulado(respostaJson([hit(0, { tags: `foto, ${CHAVE_FALSA}` })])),
    });

    const falha = await capturarFalha(buscarCandidatos(base));

    expect(falha.codigo).toBe("CONTEUDO_COM_CREDENCIAL");
    expect(await conteudoDe(base.diretorioTrabalho)).not.toContain(CHAVE_FALSA);
  });

  it("CA-IMG-11: erro de rede com a URL completa não expõe a chave", async () => {
    const erro = new TypeError(`falhou em ${ENDPOINT}?key=${CHAVE_FALSA}`, {
      cause: Object.assign(new Error(`?key=${CHAVE_FALSA}`), { code: "ECONNRESET" }),
    });

    const falha = await capturarFalha(
      buscarCandidatos(await opcoes({ fetch: fetchSimulado(erro) })),
    );

    expect(falha.codigo).toBe("REDE_INDISPONIVEL");
    expect(falha.detalhes).toEqual({ causa: "ECONNRESET" });
    expect(`${falha.message}${falha.stack}${JSON.stringify(falha)}`).not.toContain(CHAVE_FALSA);
  });

  it("CA-IMG-11: descarta causa que não seja código de sistema", () => {
    const falha = falhaDeRede(new TypeError("x", { cause: { code: `key=${CHAVE_FALSA}` } }));

    expect(falha.detalhes).toEqual({});
  });

  it.each([401, 429, 500])("CA-IMG-11: erro HTTP %i não expõe a chave", async (status) => {
    const resposta = () => new Response(`erro com ${CHAVE_FALSA}`, { status });
    const falha = await capturarFalha(
      buscarCandidatos(await opcoes({ fetch: fetchSimulado(resposta(), resposta()) })),
    );

    expect(`${falha.message}${falha.stack}${JSON.stringify(falha)}`).not.toContain(CHAVE_FALSA);
  });

  it("CA-IMG-11: resultado formatado não contém a chave", async () => {
    const resultado = await buscarCandidatos(
      await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) }),
    );

    expect(`${formatarResultado(resultado)}${JSON.stringify(resultado)}`).not.toContain(
      CHAVE_FALSA,
    );
  });
});

describe("CA-IMG-11: linha de comando", () => {
  const executar = (...argumentos) =>
    spawnSync(process.execPath, [CLI, ...argumentos], { encoding: "utf8" });

  it("CA-IMG-13: mostra a ajuda e sai com 0", () => {
    const resultado = executar("--ajuda");

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain("--termo");
  });

  it("CA-IMG-13: sai com 2 sem argumentos", () => {
    expect(executar().status).toBe(2);
  });

  it("CA-IMG-11: não aceita chave por argumento nem repete o valor", () => {
    const resultado = executar("--key", CHAVE_FALSA, "--id", "TI-0001", "--termo", "laptop");

    expect(resultado.status).toBe(2);
    expect(`${resultado.stdout}${resultado.stderr}`).not.toContain(CHAVE_FALSA);
  });

  it("CA-IMG-13: valida o identificador antes de procurar a credencial", () => {
    const resultado = executar("--id", "TI-9999", "--termo", "laptop");

    expect(resultado.status).toBe(2);
    expect(resultado.stderr).toContain("ENTRADA_INVALIDA");
  });
});

describe("Estrutura da busca", () => {
  it("CA-IMG-13: não mantém candidatos em lugar nenhum além da pasta de trabalho indicada", async () => {
    const base = await opcoes({ fetch: fetchSimulado(respostaJson([hit()])) });
    await buscarCandidatos(base);

    const entradas = (await readdir(base.diretorioTrabalho)).sort();

    expect(entradas).toEqual(["cache", "candidatos"]);
  });
});
