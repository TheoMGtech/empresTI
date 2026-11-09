// Busca candidatos na API da Pixabay, um equipamento e um termo por execução.
// A chave só existe em memória, é lida no arquivo local aprovado e entra apenas na URL enviada
// à Pixabay. Mensagens são fixas: nenhum erro de biblioteca é repassado, porque pode conter a URL.
import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { z } from "zod";

import { ALTURA_FINAL, CATEGORIA_POR_ID, LARGURA_FINAL, urlDePaginaValida } from "./nucleo.mjs";

export const ENDPOINT = "https://pixabay.com/api/";
export const VALIDADE_DO_CACHE_MS = 24 * 60 * 60 * 1000;
export const LIMITE_PADRAO_DE_CANDIDATOS = 20;
export const LIMITE_MINIMO_DE_CANDIDATOS = 3;
export const LIMITE_MAXIMO_DE_CANDIDATOS = 50;
export const ESPERA_MAXIMA_S = 120;
export const DIRETORIO_PADRAO = fileURLToPath(
  new URL("../../../.artefatos/imagens-equipamentos/", import.meta.url),
);

const CAMINHO_PADRAO_DA_CHAVE = fileURLToPath(
  new URL("../../../.env.pixabay.local", import.meta.url),
);
const HOSTS_DE_DOWNLOAD = new Set(["pixabay.com", "cdn.pixabay.com"]);
const LIMITE_BYTES_DA_RESPOSTA = 5 * 1024 * 1024;
const TEMPO_LIMITE_PADRAO_MS = 15_000;
const ESPERA_ANTES_DE_REPETIR_MS = 1_000;
const IDIOMAS = new Set(
  "cs da de en es fr id it hu nl no pl pt ro sk fi sv tr vi th bg ru el ja ko zh".split(" "),
);

export class FalhaOperacional extends Error {
  constructor(codigo, mensagem, detalhes = {}) {
    super(mensagem);
    this.name = "FalhaOperacional";
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const hitSchema = z.object({
  id: z.number().int().positive(),
  pageURL: z.string().max(2048),
  type: z.string().max(50),
  tags: z.string().max(2048),
  previewURL: z.string().max(2048).optional(),
  webformatURL: z.string().max(2048).optional(),
  largeImageURL: z.string().max(2048),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  user: z.string().max(200),
});

const respostaSchema = z.object({
  total: z.number().int().nonnegative(),
  totalHits: z.number().int().nonnegative(),
  hits: z.array(hitSchema).max(200),
});

export const candidatoSchema = z.strictObject({
  pixabay_id: z.number().int().positive(),
  url_pagina: z.string().max(2048),
  autor: z.string().min(1).max(200),
  tipo: z.literal("photo"),
  tags: z.array(z.string().max(200)).max(100),
  dimensoes_originais: z.strictObject({
    largura: z.number().int().positive(),
    altura: z.number().int().positive(),
  }),
  url_download: z.string().max(2048),
  url_previa: z.string().max(2048).nullable(),
});

const entradaDeCacheSchema = z.strictObject({
  versao: z.literal(1),
  criado_em: z.number().int().nonnegative(),
  parametros: z.record(z.string(), z.string()),
  total: z.number().int().nonnegative(),
  candidatos: z.array(candidatoSchema).max(200),
  descartados: z
    .array(z.strictObject({ pixabay_id: z.number().int().positive(), motivo: z.string().max(60) }))
    .max(200),
});

const candidatoRegistradoSchema = candidatoSchema.extend({
  consultado_em: z.number().int().nonnegative(),
  termo: z.string().max(100),
});

const arquivoDeCandidatosSchema = z.strictObject({
  versao: z.literal(1),
  id_equipamento: z.string().max(32),
  candidatos: z.array(candidatoRegistradoSchema).max(500),
});

const limiteSchema = z.strictObject({
  restante: z.number().int().nonnegative(),
  reinicia_em: z.number().int().nonnegative(),
});

export function ehExecucaoDireta(urlDoModulo) {
  if (!process.argv[1]) return false;
  const normalizar = (caminho) => (process.platform === "win32" ? caminho.toLowerCase() : caminho);
  try {
    return normalizar(realpathSync(process.argv[1])) === normalizar(fileURLToPath(urlDoModulo));
  } catch {
    return false;
  }
}

export async function carregarChave(caminho = CAMINHO_PADRAO_DA_CHAVE) {
  const ausente = () =>
    new FalhaOperacional("CHAVE_AUSENTE", "a credencial local da Pixabay não está cadastrada");

  let conteudo;
  try {
    conteudo = await readFile(caminho, "utf8");
  } catch {
    throw ausente();
  }

  const achado = /^[ \t]*PIXABAY_API_KEY[ \t]*=[ \t]*(.*)$/m.exec(conteudo.replace(/^﻿/, ""));
  if (!achado) throw ausente();

  const valor = achado[1].trim().replace(/^(['"])(.*)\1$/, "$2");
  if (valor === "") throw ausente();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(valor)) {
    throw new FalhaOperacional("CHAVE_MALFORMADA", "a credencial local está em formato inválido");
  }
  return valor;
}

export function urlDeDownloadPermitida(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    HOSTS_DE_DOWNLOAD.has(url.hostname) &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    !url.searchParams.has("key")
  );
}

function garantirSemCredencial(conteudo, chave) {
  if (chave && (conteudo.includes(chave) || conteudo.includes(encodeURIComponent(chave)))) {
    throw new FalhaOperacional(
      "CONTEUDO_COM_CREDENCIAL",
      "o conteúdo não foi gravado: contém a credencial",
    );
  }
}

export async function gravarJson(caminho, dados, chave) {
  const conteudo = `${JSON.stringify(dados, null, 2)}\n`;
  garantirSemCredencial(conteudo, chave);

  await mkdir(path.dirname(caminho), { recursive: true });
  const temporario = `${caminho}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporario, conteudo, { flag: "wx" });
    await rename(temporario, caminho);
  } finally {
    await rm(temporario, { force: true });
  }
}

async function lerJsonOpcional(caminho, esquema) {
  let conteudo;
  try {
    conteudo = await readFile(caminho, "utf8");
  } catch {
    return undefined;
  }
  try {
    const analise = esquema.safeParse(JSON.parse(conteudo));
    return analise.success ? analise.data : undefined;
  } catch {
    return undefined;
  }
}

export async function lerCorpoLimitado(resposta, limiteBytes, criarFalha) {
  const declarado = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > limiteBytes) throw criarFalha();
  if (!resposta.body) return Buffer.alloc(0);

  const leitor = resposta.body.getReader();
  const partes = [];
  let total = 0;

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > limiteBytes) {
      await leitor.cancel().catch(() => {});
      throw criarFalha();
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

export function falhaDeRede(erro) {
  if (erro?.name === "TimeoutError" || erro?.name === "AbortError") {
    return new FalhaOperacional("TEMPO_ESGOTADO", "a requisição excedeu o tempo limite");
  }
  // Só um código de sistema passa adiante; a mensagem original pode conter a URL com a chave.
  const codigo = erro?.cause?.code;
  return new FalhaOperacional("REDE_INDISPONIVEL", "a requisição não pôde ser concluída", {
    ...(typeof codigo === "string" && /^[A-Z0-9_]{1,40}$/.test(codigo) ? { causa: codigo } : {}),
  });
}

function validarPedido({ id, termo, idioma, limite }) {
  const entradaInvalida = (mensagem) => new FalhaOperacional("ENTRADA_INVALIDA", mensagem);

  if (!CATEGORIA_POR_ID.has(id)) throw entradaInvalida("identificador de equipamento fora do lote");
  if (typeof termo !== "string" || termo.trim() === "" || termo.length > 100) {
    throw entradaInvalida("o termo de busca precisa ter de 1 a 100 caracteres");
  }
  if (!IDIOMAS.has(idioma)) throw entradaInvalida("idioma não aceito pela Pixabay");
  if (
    !Number.isInteger(limite) ||
    limite < LIMITE_MINIMO_DE_CANDIDATOS ||
    limite > LIMITE_MAXIMO_DE_CANDIDATOS
  ) {
    throw entradaInvalida(
      `o limite precisa estar entre ${LIMITE_MINIMO_DE_CANDIDATOS} e ${LIMITE_MAXIMO_DE_CANDIDATOS}`,
    );
  }
}

function montarParametros({ termo, idioma, limite }) {
  return {
    q: termo.trim(),
    lang: idioma,
    image_type: "photo",
    orientation: "horizontal",
    safesearch: "true",
    min_width: String(LARGURA_FINAL),
    min_height: String(ALTURA_FINAL),
    per_page: String(limite),
    page: "1",
  };
}

function normalizarHit(hit) {
  const descartar = (motivo) => ({ descarte: { pixabay_id: hit.id, motivo } });

  if (hit.type !== "photo") return descartar("TIPO_NAO_FOTO");
  if (hit.imageWidth < LARGURA_FINAL || hit.imageHeight < ALTURA_FINAL) {
    return descartar("DIMENSOES_INSUFICIENTES");
  }
  if (hit.user.trim() === "") return descartar("AUTOR_AUSENTE");
  if (!urlDePaginaValida(hit.pageURL, hit.id)) return descartar("URL_ORIGEM_INVALIDA");
  if (!urlDeDownloadPermitida(hit.largeImageURL)) return descartar("URL_DOWNLOAD_NAO_PERMITIDA");

  const previa = hit.webformatURL ?? hit.previewURL ?? null;
  return {
    candidato: {
      pixabay_id: hit.id,
      url_pagina: hit.pageURL,
      autor: hit.user.trim(),
      tipo: "photo",
      tags: hit.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      dimensoes_originais: { largura: hit.imageWidth, altura: hit.imageHeight },
      url_download: hit.largeImageURL,
      url_previa: previa !== null && urlDeDownloadPermitida(previa) ? previa : null,
    },
  };
}

function interpretarCorpo(bytes) {
  const invalida = new FalhaOperacional("RESPOSTA_INVALIDA", "a resposta da Pixabay é inválida");
  let dados;
  try {
    dados = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw invalida;
  }

  const analise = respostaSchema.safeParse(dados);
  if (!analise.success) throw invalida;

  const candidatos = [];
  const descartados = [];
  for (const hit of analise.data.hits) {
    const { candidato, descarte } = normalizarHit(hit);
    if (candidato) candidatos.push(candidato);
    else descartados.push(descarte);
  }
  return { total: analise.data.totalHits, candidatos, descartados };
}

function numeroNaoNegativo(valor) {
  if (valor === null || valor.trim() === "") return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : undefined;
}

function esperaDoLimite(cabecalhos, instante) {
  const retryAfter = cabecalhos.get("retry-after");
  let esperaRetry = numeroNaoNegativo(retryAfter);
  if (esperaRetry === undefined && retryAfter !== null) {
    const data = Date.parse(retryAfter);
    if (!Number.isNaN(data)) esperaRetry = Math.max(0, (data - instante) / 1000);
  }

  const esperas = [esperaRetry, numeroNaoNegativo(cabecalhos.get("x-ratelimit-reset"))].filter(
    (espera) => espera !== undefined,
  );
  return esperas.length > 0 ? Math.ceil(Math.max(...esperas)) : undefined;
}

async function registrarLimite(pastaCache, cabecalhos, instante) {
  const restante = numeroNaoNegativo(cabecalhos.get("x-ratelimit-remaining"));
  const reinicio = numeroNaoNegativo(cabecalhos.get("x-ratelimit-reset"));
  if (restante === undefined || reinicio === undefined) return;

  await gravarJson(path.join(pastaCache, "limite.json"), {
    restante: Math.floor(restante),
    reinicia_em: Math.ceil(instante + reinicio * 1000),
  });
}

async function exigirLimiteDisponivel(pastaCache, instante) {
  const limite = await lerJsonOpcional(path.join(pastaCache, "limite.json"), limiteSchema);
  if (limite && limite.restante === 0 && instante < limite.reinicia_em) {
    throw new FalhaOperacional(
      "LIMITE_EXCEDIDO",
      "o limite de requisições da Pixabay foi atingido",
      {
        aguardar_s: Math.ceil((limite.reinicia_em - instante) / 1000),
      },
    );
  }
}

async function requisitarApi({ url, buscarHttp, agora, dormir, tempoLimiteMs, pastaCache }) {
  for (let tentativa = 1; ; tentativa += 1) {
    const podeRepetir = tentativa === 1;
    let resposta;
    let bytes;

    try {
      resposta = await buscarHttp(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(tempoLimiteMs),
      });
      if (resposta.status === 200) {
        bytes = await lerCorpoLimitado(
          resposta,
          LIMITE_BYTES_DA_RESPOSTA,
          () => new FalhaOperacional("RESPOSTA_INVALIDA", "a resposta da Pixabay excede o limite"),
        );
      }
    } catch (erro) {
      if (erro instanceof FalhaOperacional) throw erro;
      const falha = falhaDeRede(erro);
      if (podeRepetir && falha.codigo === "TEMPO_ESGOTADO") {
        await dormir(ESPERA_ANTES_DE_REPETIR_MS);
        continue;
      }
      throw falha;
    }

    const instante = agora();
    await registrarLimite(pastaCache, resposta.headers, instante);
    const { status } = resposta;

    if (status === 200) return interpretarCorpo(bytes);

    if (status >= 300 && status < 400) {
      throw new FalhaOperacional(
        "REDIRECIONAMENTO_NAO_PERMITIDO",
        "a API respondeu com redirecionamento",
      );
    }
    if (status === 401 || status === 403) {
      throw new FalhaOperacional("CHAVE_RECUSADA", "a Pixabay recusou a autenticação", { status });
    }
    if (status === 429) {
      const espera = esperaDoLimite(resposta.headers, instante);
      if (espera !== undefined) {
        await gravarJson(path.join(pastaCache, "limite.json"), {
          restante: 0,
          reinicia_em: instante + espera * 1000,
        });
      }
      if (podeRepetir && espera !== undefined && espera <= ESPERA_MAXIMA_S) {
        await dormir(espera * 1000);
        continue;
      }
      throw new FalhaOperacional(
        "LIMITE_EXCEDIDO",
        "o limite de requisições da Pixabay foi atingido",
        {
          status,
          ...(espera !== undefined ? { aguardar_s: espera } : {}),
        },
      );
    }
    if (status >= 500) {
      if (podeRepetir) {
        await dormir(ESPERA_ANTES_DE_REPETIR_MS);
        continue;
      }
      throw new FalhaOperacional("ERRO_DO_SERVIDOR", "a Pixabay respondeu com erro interno", {
        status,
      });
    }
    throw new FalhaOperacional("REQUISICAO_RECUSADA", "a Pixabay recusou a requisição", { status });
  }
}

async function lerCache(caminho, instante) {
  const entrada = await lerJsonOpcional(caminho, entradaDeCacheSchema);
  if (!entrada) return undefined;
  const idade = instante - entrada.criado_em;
  return idade >= 0 && idade < VALIDADE_DO_CACHE_MS ? entrada : undefined;
}

export function caminhoDosCandidatos(diretorioTrabalho, id) {
  return path.join(diretorioTrabalho, "candidatos", `${id}.json`);
}

export function lerCandidatos(diretorioTrabalho, id) {
  return lerJsonOpcional(caminhoDosCandidatos(diretorioTrabalho, id), arquivoDeCandidatosSchema);
}

async function registrarCandidatos({ diretorioTrabalho, id, termo, entrada, chave }) {
  const existente = await lerCandidatos(diretorioTrabalho, id);
  const porId = new Map((existente?.candidatos ?? []).map((item) => [item.pixabay_id, item]));
  for (const candidato of entrada.candidatos) {
    porId.set(candidato.pixabay_id, { ...candidato, consultado_em: entrada.criado_em, termo });
  }

  const novo = { versao: 1, id_equipamento: id, candidatos: [...porId.values()] };
  if (JSON.stringify(novo) === JSON.stringify(existente)) return;
  await gravarJson(caminhoDosCandidatos(diretorioTrabalho, id), novo, chave);
}

const esperarDeVerdade = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export async function buscarCandidatos({
  id,
  termo,
  idioma = "en",
  limite = LIMITE_PADRAO_DE_CANDIDATOS,
  diretorioTrabalho = DIRETORIO_PADRAO,
  obterChave = carregarChave,
  fetch: buscarHttp = globalThis.fetch,
  agora = Date.now,
  dormir = esperarDeVerdade,
  tempoLimiteMs = TEMPO_LIMITE_PADRAO_MS,
}) {
  validarPedido({ id, termo, idioma, limite });

  const parametros = montarParametros({ termo, idioma, limite });
  const pastaCache = path.join(diretorioTrabalho, "cache");
  const identificador = createHash("sha256").update(JSON.stringify(parametros)).digest("hex");
  const caminhoCache = path.join(pastaCache, `${identificador}.json`);

  let entrada = await lerCache(caminhoCache, agora());
  const deCache = entrada !== undefined;
  let chave;

  if (!deCache) {
    await exigirLimiteDisponivel(pastaCache, agora());
    chave = await obterChave();

    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ key: chave, ...parametros }).toString();

    const resultado = await requisitarApi({
      url,
      buscarHttp,
      agora,
      dormir,
      tempoLimiteMs,
      pastaCache,
    });
    entrada = { versao: 1, criado_em: agora(), parametros, ...resultado };
    await gravarJson(caminhoCache, entrada, chave);
  }

  await registrarCandidatos({ diretorioTrabalho, id, termo: parametros.q, entrada, chave });

  return {
    id_equipamento: id,
    termo: parametros.q,
    de_cache: deCache,
    consultado_em: entrada.criado_em,
    total_disponivel: entrada.total,
    candidatos: entrada.candidatos,
    descartados: entrada.descartados,
  };
}

const AJUDA = `Busca candidatos a fotografia na Pixabay. Nunca aprova imagens.

Uso:
  node buscar.mjs --id TI-0001 --termo "laptop white desk" [--idioma en] [--limite 20]
  node buscar.mjs --verificar-chave

A credencial é lida somente do arquivo local aprovado e nunca é aceita por argumento.
Respostas ficam em cache local por 24 horas. O limite por busca vai de ${LIMITE_MINIMO_DE_CANDIDATOS} a ${LIMITE_MAXIMO_DE_CANDIDATOS}.

Códigos de saída:
  0  concluído
  1  falha inesperada
  2  uso incorreto
  3  credencial ausente, malformada ou recusada
  4  limite de requisições atingido
  5  falha de rede, tempo esgotado ou erro da Pixabay
  6  resposta inválida
`;

const SAIDA_POR_CODIGO = {
  ENTRADA_INVALIDA: 2,
  CHAVE_AUSENTE: 3,
  CHAVE_MALFORMADA: 3,
  CHAVE_RECUSADA: 3,
  LIMITE_EXCEDIDO: 4,
  RESPOSTA_INVALIDA: 6,
  CONTEUDO_COM_CREDENCIAL: 6,
};

export function formatarResultado(resultado) {
  const { id_equipamento: id, termo, de_cache: deCache, candidatos, descartados } = resultado;
  const linhas = [
    `Equipamento: ${id}`,
    `Termo: ${termo}`,
    `Origem: ${deCache ? "cache local" : "API da Pixabay"}`,
    `Candidatos: ${candidatos.length} · descartados: ${descartados.length} · total informado: ${resultado.total_disponivel}`,
  ];
  for (const candidato of candidatos) {
    const { largura, altura } = candidato.dimensoes_originais;
    linhas.push(
      `  - ${candidato.pixabay_id} · ${largura}×${altura} · ${candidato.autor} · ${candidato.tags.join(", ")} · ${candidato.url_pagina}`,
    );
  }
  linhas.push("", "Nenhuma imagem foi aprovada. Avalie cada candidato antes de selecionar.");
  return `${linhas.join("\n")}\n`;
}

function usoIncorreto() {
  process.stderr.write("Argumentos inválidos. Use --ajuda.\n");
  process.exitCode = 2;
}

async function principal() {
  let valores;
  try {
    ({ values: valores } = parseArgs({
      options: {
        id: { type: "string" },
        termo: { type: "string" },
        idioma: { type: "string" },
        limite: { type: "string" },
        "verificar-chave": { type: "boolean" },
        ajuda: { type: "boolean", short: "h" },
      },
    }));
  } catch {
    usoIncorreto();
    return;
  }

  if (valores.ajuda) {
    process.stdout.write(AJUDA);
    return;
  }
  if (valores["verificar-chave"]) {
    await carregarChave();
    process.stdout.write("Credencial local: presente\n");
    return;
  }
  if (!valores.id || !valores.termo) {
    usoIncorreto();
    return;
  }

  const limite =
    valores.limite === undefined ? LIMITE_PADRAO_DE_CANDIDATOS : Number(valores.limite);
  const resultado = await buscarCandidatos({
    id: valores.id,
    termo: valores.termo,
    idioma: valores.idioma ?? "en",
    limite,
  });
  process.stdout.write(formatarResultado(resultado));
}

if (ehExecucaoDireta(import.meta.url)) {
  try {
    await principal();
  } catch (erro) {
    if (erro instanceof FalhaOperacional) {
      process.stderr.write(`[${erro.codigo}] ${erro.message}\n`);
      if (erro.detalhes.aguardar_s !== undefined) {
        process.stderr.write(`Aguarde ${erro.detalhes.aguardar_s} s antes de tentar novamente.\n`);
      }
      process.exitCode = SAIDA_POR_CODIGO[erro.codigo] ?? 5;
    } else {
      process.stderr.write("Falha inesperada na busca.\n");
      process.exitCode = 1;
    }
  }
}
