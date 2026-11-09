// Baixa candidatos já selecionados, gera o JPEG final e mantém o manifesto coerente.
// Não usa credencial, não publica e nunca marca revisão, aprovação ou semelhança como concluídas
// por conta própria: a revisão visual nasce "pendente" e depende de comando explícito.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import sharp from "sharp";
import { z } from "zod";

import {
  DIRETORIO_PADRAO,
  ehExecucaoDireta,
  falhaDeRede,
  FalhaOperacional,
  lerCandidatos,
  lerCorpoLimitado,
  urlDeDownloadPermitida,
  VALIDADE_DO_CACHE_MS,
} from "./buscar.mjs";
import {
  ALTURA_FINAL,
  BUCKET_PLANEJADO,
  calcularSha256,
  CATEGORIA_POR_ID,
  LARGURA_FINAL,
  MOTIVOS_DE_REJEICAO,
  validarManifesto,
} from "./nucleo.mjs";

export const LIMITE_BYTES_DOWNLOAD = 20 * 1024 * 1024;
export const REFERENCIA_DA_LICENCA =
  "Licença de Conteúdo Pixabay, conforme https://pixabay.com/service/terms/";
export const ENQUADRAMENTOS = ["centre", "top", "bottom", "left", "right"];

const LIMITE_PIXELS_ORIGEM = 64_000_000;
const TEMPO_LIMITE_DOWNLOAD_MS = 30_000;
const MAXIMO_DE_REDIRECIONAMENTOS = 2;
const FORMATOS_DE_ORIGEM = new Set(["jpeg", "png", "webp"]);

const dataSchema = z.iso.date();
const loteSchema = z
  .array(
    z.strictObject({
      id: z.string().max(32),
      equipamento: z.string().trim().min(1).max(500),
      categoria: z.enum(["Notebook", "Monitor", "Cabo", "Câmera"]),
    }),
  )
  .max(100);

const falha = (codigo, mensagem, detalhes) => new FalhaOperacional(codigo, mensagem, detalhes);
const entradaInvalida = (mensagem) => falha("ENTRADA_INVALIDA", mensagem);
const pastaFinal = (diretorioTrabalho) => path.join(diretorioTrabalho, "publicar");

function exigirEquipamento(id) {
  if (!CATEGORIA_POR_ID.has(id)) throw entradaInvalida("identificador de equipamento fora do lote");
}

function exigirIdPixabay(pixabayId) {
  if (!Number.isInteger(pixabayId) || pixabayId <= 0) {
    throw entradaInvalida("identificador da Pixabay inválido");
  }
}

export async function baixarImagem(
  urlInicial,
  {
    fetch: buscarHttp = globalThis.fetch,
    tempoLimiteMs = TEMPO_LIMITE_DOWNLOAD_MS,
    limiteBytes = LIMITE_BYTES_DOWNLOAD,
  } = {},
) {
  if (!urlDeDownloadPermitida(urlInicial)) {
    throw falha("URL_NAO_PERMITIDA", "a URL de download não pertence aos hosts permitidos");
  }

  const grandeDemais = () =>
    falha("ARQUIVO_GRANDE_DEMAIS", "o download excede o limite de tamanho");
  let atual = urlInicial;

  for (let saltos = 0; saltos <= MAXIMO_DE_REDIRECIONAMENTOS; saltos += 1) {
    let resposta;
    try {
      resposta = await buscarHttp(atual, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(tempoLimiteMs),
      });
    } catch (erro) {
      throw falhaDeRede(erro);
    }

    if (resposta.status >= 300 && resposta.status < 400) {
      const destino = resposta.headers.get("location");
      let proximo;
      try {
        proximo = new URL(destino ?? "", atual).href;
      } catch {
        proximo = undefined;
      }
      if (destino === null || proximo === undefined || !urlDeDownloadPermitida(proximo)) {
        throw falha(
          "REDIRECIONAMENTO_NAO_PERMITIDO",
          "redirecionamento para destino não permitido",
        );
      }
      atual = proximo;
      continue;
    }

    if (resposta.status !== 200) {
      throw falha(
        "DOWNLOAD_RECUSADO",
        "o servidor recusou o download; refaça a busca do candidato",
        {
          status: resposta.status,
        },
      );
    }

    const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!tipo.startsWith("image/")) {
      throw falha("CONTEUDO_NAO_IMAGEM", "a resposta não declara conteúdo de imagem");
    }

    try {
      return await lerCorpoLimitado(resposta, limiteBytes, grandeDemais);
    } catch (erro) {
      if (erro instanceof FalhaOperacional) throw erro;
      throw falhaDeRede(erro);
    }
  }

  throw falha("REDIRECIONAMENTO_NAO_PERMITIDO", "redirecionamentos em excesso");
}

export async function processarImagem(bytes, { enquadramento = "centre" } = {}) {
  if (!ENQUADRAMENTOS.includes(enquadramento)) throw entradaInvalida("enquadramento desconhecido");

  const naoImagem = () =>
    falha("CONTEUDO_NAO_IMAGEM", "o conteúdo baixado não é uma imagem válida");
  const opcoes = { failOn: "warning", limitInputPixels: LIMITE_PIXELS_ORIGEM };

  let metadados;
  try {
    metadados = await sharp(bytes, opcoes).metadata();
  } catch {
    throw naoImagem();
  }

  if (!FORMATOS_DE_ORIGEM.has(metadados.format)) {
    throw falha("FORMATO_NAO_PERMITIDO", "formato de origem não permitido");
  }

  const girada = (metadados.orientation ?? 1) >= 5;
  const largura = girada ? metadados.height : metadados.width;
  const altura = girada ? metadados.width : metadados.height;
  if (largura < LARGURA_FINAL || altura < ALTURA_FINAL) {
    throw falha("ORIGEM_PEQUENA_DEMAIS", "a imagem é menor que 800 × 600 e não será ampliada");
  }

  try {
    // Sem withMetadata: EXIF, XMP e perfis são descartados pelo sharp.
    return await sharp(bytes, opcoes)
      .autoOrient()
      .resize(LARGURA_FINAL, ALTURA_FINAL, {
        fit: "cover",
        position: enquadramento,
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw naoImagem();
  }
}

async function carregarManifestoCoerente(caminhoManifesto, diretorioTrabalho) {
  await mkdir(pastaFinal(diretorioTrabalho), { recursive: true });

  let dados;
  try {
    dados = JSON.parse((await readFile(caminhoManifesto, "utf8")).replace(/^﻿/, ""));
  } catch {
    throw falha("MANIFESTO_ILEGIVEL", "o manifesto não existe ou não é um JSON válido");
  }

  const relatorio = await validarManifesto({
    caminhoManifesto,
    diretorio: pastaFinal(diretorioTrabalho),
    estado: dados?.estado,
  });
  if (!relatorio.aprovado) {
    throw falha("MANIFESTO_INCONSISTENTE", "manifesto e arquivos divergem; nada foi alterado", {
      problemas: relatorio.problemas.map(({ codigo, item }) => ({ codigo, item })),
    });
  }
  return dados;
}

// Grava só depois de o validador da T3 aceitar o conteúdo completo.
async function substituirManifesto(caminhoManifesto, manifesto, diretorioTrabalho) {
  const temporario = `${caminhoManifesto}.${randomUUID()}.tmp.json`;
  try {
    await writeFile(temporario, `${JSON.stringify(manifesto, null, 2)}\n`, { flag: "wx" });
    const relatorio = await validarManifesto({
      caminhoManifesto: temporario,
      diretorio: pastaFinal(diretorioTrabalho),
      estado: manifesto.estado,
    });
    if (!relatorio.aprovado) {
      throw falha(
        "MANIFESTO_REPROVADO",
        "o manifesto resultante foi reprovado; nada foi alterado",
        {
          problemas: relatorio.problemas.map(({ codigo, item }) => ({ codigo, item })),
        },
      );
    }
    await rename(temporario, caminhoManifesto);
  } finally {
    await rm(temporario, { force: true });
  }
}

async function gravarImagemFinal(diretorioTrabalho, nome, bytes) {
  const destino = path.join(pastaFinal(diretorioTrabalho), nome);

  let existente;
  try {
    existente = await readFile(destino);
  } catch (erro) {
    if (erro.code !== "ENOENT")
      throw falha("ARQUIVO_ILEGIVEL", "o arquivo existente não pôde ser lido");
  }
  if (existente) {
    if (calcularSha256(existente) !== calcularSha256(bytes)) {
      throw falha("ARQUIVO_CONFLITANTE", "já existe arquivo com este nome e conteúdo diferente");
    }
    return false;
  }

  const pastaTemporaria = path.join(diretorioTrabalho, "tmp");
  await mkdir(pastaTemporaria, { recursive: true });
  const temporario = path.join(pastaTemporaria, `${randomUUID()}.tmp`);
  try {
    await writeFile(temporario, bytes, { flag: "wx" });
    await rename(temporario, destino);
  } finally {
    await rm(temporario, { force: true });
  }
  return true;
}

export async function iniciarManifesto({
  caminhoManifesto,
  caminhoLote,
  diretorioTrabalho = DIRETORIO_PADRAO,
}) {
  let lote;
  try {
    lote = loteSchema.parse(JSON.parse(await readFile(caminhoLote, "utf8")));
  } catch {
    throw falha("LOTE_INVALIDO", "o lote não existe ou está fora do formato esperado");
  }

  try {
    await readFile(caminhoManifesto);
    throw falha("MANIFESTO_JA_EXISTE", "o manifesto já existe e não será sobrescrito");
  } catch (erro) {
    if (erro instanceof FalhaOperacional) throw erro;
    if (erro.code !== "ENOENT") throw falha("MANIFESTO_ILEGIVEL", "o manifesto não pôde ser lido");
  }

  const manifesto = {
    versao: 1,
    estado: "preparacao",
    semelhanca_visual: { situacao: "nao_verificada" },
    itens: lote.map((item) => ({ ...item, situacao: "pendente" })),
    rejeicoes: [],
  };

  await mkdir(pastaFinal(diretorioTrabalho), { recursive: true });
  await mkdir(path.dirname(caminhoManifesto), { recursive: true });
  await substituirManifesto(caminhoManifesto, manifesto, diretorioTrabalho);
  return { situacao: "iniciado", itens: manifesto.itens.length };
}

export async function selecionarCandidato({
  caminhoManifesto,
  diretorioTrabalho = DIRETORIO_PADRAO,
  id,
  pixabayId,
  licencaConsultadaEm,
  enquadramento = "centre",
  fetch: buscarHttp = globalThis.fetch,
  agora = Date.now,
  tempoLimiteMs,
  limiteBytes,
}) {
  exigirEquipamento(id);
  exigirIdPixabay(pixabayId);
  if (!dataSchema.safeParse(licencaConsultadaEm).success) {
    throw entradaInvalida("informe a data real de consulta da licença");
  }

  const manifesto = await carregarManifestoCoerente(caminhoManifesto, diretorioTrabalho);
  const item = manifesto.itens.find((candidato) => candidato.id === id);

  if (item.situacao === "selecionada") {
    if (item.origem.pixabay_id === pixabayId && item.arquivo) {
      return {
        situacao: "ja_preparado",
        nome: item.arquivo.nome_relativo,
        sha256: item.arquivo.sha256,
      };
    }
    throw falha("CONFLITO_DE_SELECAO", "o equipamento já tem outra fotografia selecionada");
  }

  if (manifesto.estado !== "preparacao") {
    throw falha("ESTADO_NAO_PERMITE_ALTERACAO", "o manifesto não está em preparação");
  }
  if (manifesto.rejeicoes.some((r) => r.id_equipamento === id && r.pixabay_id === pixabayId)) {
    throw falha("CANDIDATO_REJEITADO", "este candidato já foi rejeitado para o equipamento");
  }
  if (manifesto.itens.some((outro) => outro.origem?.pixabay_id === pixabayId)) {
    throw falha("CANDIDATO_JA_USADO", "esta fotografia já está em outro equipamento");
  }

  const registrados = await lerCandidatos(diretorioTrabalho, id);
  const candidato = registrados?.candidatos.find((c) => c.pixabay_id === pixabayId);
  if (!candidato) {
    throw falha("CANDIDATO_NAO_SELECIONAVEL", "o candidato não consta na busca deste equipamento");
  }
  if (agora() - candidato.consultado_em >= VALIDADE_DO_CACHE_MS) {
    throw falha("CANDIDATO_EXPIRADO", "a URL do candidato pode ter expirado; refaça a busca");
  }

  const original = await baixarImagem(candidato.url_download, {
    fetch: buscarHttp,
    tempoLimiteMs,
    limiteBytes,
  });
  const final = await processarImagem(original, { enquadramento });
  const sha256 = calcularSha256(final);

  if (manifesto.itens.some((outro) => outro.arquivo?.sha256 === sha256)) {
    throw falha("DUPLICATA_SHA256", "a imagem final é idêntica à de outro equipamento");
  }

  const nome = `${id}-${sha256.slice(0, 8)}.jpg`;
  const criada = await gravarImagemFinal(diretorioTrabalho, nome, final);

  const novoItem = {
    id: item.id,
    equipamento: item.equipamento,
    categoria: item.categoria,
    situacao: "selecionada",
    origem: {
      fonte: "Pixabay",
      pixabay_id: candidato.pixabay_id,
      url_pagina: candidato.url_pagina,
      autor: candidato.autor,
      licenca: { referencia: REFERENCIA_DA_LICENCA, consultada_em: licencaConsultadaEm },
      obtida_em: new Date(agora()).toISOString().slice(0, 10),
      dimensoes_originais: candidato.dimensoes_originais,
    },
    arquivo: {
      nome_relativo: nome,
      dimensoes_finais: { largura: LARGURA_FINAL, altura: ALTURA_FINAL },
      sha256,
    },
    revisao_visual: { resultado: "pendente" },
    storage: { destino_planejado: `${BUCKET_PLANEJADO}/${nome}` },
  };
  const novo = {
    ...manifesto,
    itens: manifesto.itens.map((atual) => (atual.id === id ? novoItem : atual)),
  };

  try {
    await substituirManifesto(caminhoManifesto, novo, diretorioTrabalho);
  } catch (erro) {
    if (criada) await rm(path.join(pastaFinal(diretorioTrabalho), nome), { force: true });
    throw erro;
  }

  return { situacao: "preparado", nome, sha256 };
}

export async function registrarRejeicao({
  caminhoManifesto,
  diretorioTrabalho = DIRETORIO_PADRAO,
  id,
  pixabayId,
  motivos,
  observacao,
  agora = Date.now,
}) {
  exigirEquipamento(id);
  exigirIdPixabay(pixabayId);
  if (
    !Array.isArray(motivos) ||
    motivos.length === 0 ||
    !motivos.every((motivo) => MOTIVOS_DE_REJEICAO.includes(motivo))
  ) {
    throw entradaInvalida("informe ao menos um motivo de rejeição conhecido");
  }

  const manifesto = await carregarManifestoCoerente(caminhoManifesto, diretorioTrabalho);
  if (manifesto.rejeicoes.some((r) => r.id_equipamento === id && r.pixabay_id === pixabayId)) {
    return { situacao: "ja_registrada" };
  }
  if (!["preparacao", "final_revisao"].includes(manifesto.estado)) {
    throw falha("ESTADO_NAO_PERMITE_ALTERACAO", "o manifesto já passou da revisão");
  }

  const item = manifesto.itens.find((atual) => atual.id === id);
  const estavaSelecionado = item.origem?.pixabay_id === pixabayId;
  const registrados = await lerCandidatos(diretorioTrabalho, id);
  const urlPagina = estavaSelecionado
    ? item.origem.url_pagina
    : registrados?.candidatos.find((c) => c.pixabay_id === pixabayId)?.url_pagina;

  const novo = {
    ...manifesto,
    rejeicoes: [
      ...manifesto.rejeicoes,
      {
        id_equipamento: id,
        pixabay_id: pixabayId,
        ...(urlPagina ? { url_pagina: urlPagina } : {}),
        motivos,
        ...(observacao ? { observacao } : {}),
        rejeitada_em: new Date(agora()).toISOString().slice(0, 10),
      },
    ],
  };

  if (estavaSelecionado) {
    novo.estado = "preparacao";
    novo.itens = manifesto.itens.map((atual) =>
      atual.id === id
        ? {
            id: atual.id,
            equipamento: atual.equipamento,
            categoria: atual.categoria,
            situacao: "pendente",
          }
        : atual,
    );
  }

  await substituirManifesto(caminhoManifesto, novo, diretorioTrabalho);
  if (estavaSelecionado && item.arquivo) {
    await rm(path.join(pastaFinal(diretorioTrabalho), item.arquivo.nome_relativo), { force: true });
  }
  return { situacao: estavaSelecionado ? "rejeitada_e_item_reaberto" : "rejeitada" };
}

export async function registrarRevisao({
  caminhoManifesto,
  diretorioTrabalho = DIRETORIO_PADRAO,
  id,
  resultado,
  observacao,
}) {
  exigirEquipamento(id);
  if (!["aceita_agente", "reprovada"].includes(resultado)) {
    throw entradaInvalida("o resultado da revisão precisa ser aceita_agente ou reprovada");
  }

  const manifesto = await carregarManifestoCoerente(caminhoManifesto, diretorioTrabalho);
  const item = manifesto.itens.find((atual) => atual.id === id);
  if (item.situacao !== "selecionada" || !item.arquivo) {
    throw falha("ITEM_SEM_FOTOGRAFIA", "o item ainda não tem imagem preparada");
  }
  if (item.revisao_visual?.resultado === resultado) return { situacao: "sem_alteracao" };
  if (manifesto.estado !== "preparacao") {
    throw falha("ESTADO_NAO_PERMITE_ALTERACAO", "o manifesto não está em preparação");
  }

  const novo = {
    ...manifesto,
    itens: manifesto.itens.map((atual) =>
      atual.id === id
        ? { ...atual, revisao_visual: { resultado, ...(observacao ? { observacao } : {}) } }
        : atual,
    ),
  };
  await substituirManifesto(caminhoManifesto, novo, diretorioTrabalho);
  return { situacao: "registrada" };
}

export async function concluirPreparacao({
  caminhoManifesto,
  diretorioTrabalho = DIRETORIO_PADRAO,
}) {
  const manifesto = await carregarManifestoCoerente(caminhoManifesto, diretorioTrabalho);
  if (manifesto.estado === "final_revisao") return { situacao: "sem_alteracao" };
  if (manifesto.estado !== "preparacao") {
    throw falha("ESTADO_NAO_PERMITE_ALTERACAO", "o manifesto já passou da revisão");
  }

  await substituirManifesto(
    caminhoManifesto,
    { ...manifesto, estado: "final_revisao" },
    diretorioTrabalho,
  );
  return { situacao: "final_revisao" };
}

const AJUDA = `Prepara as imagens selecionadas e mantém o manifesto. Não usa credencial nem publica.

Uso:
  node preparar.mjs iniciar   --manifesto <m.json> --lote <lote.json>
  node preparar.mjs selecionar --manifesto <m.json> --id TI-0001 --pixabay-id <n>
                               --licenca-consultada-em AAAA-MM-DD [--enquadramento centre]
  node preparar.mjs rejeitar  --manifesto <m.json> --id TI-0001 --pixabay-id <n>
                               --motivos MARCA,PESSOA [--observacao <texto>]
  node preparar.mjs revisar   --manifesto <m.json> --id TI-0001
                               --resultado aceita_agente|reprovada [--observacao <texto>]
  node preparar.mjs concluir  --manifesto <m.json>

Os arquivos ficam em .artefatos/imagens-equipamentos/. Aprovação humana e publicação não são
registradas por este script.

Códigos de saída:
  0  concluído
  1  falha inesperada
  2  uso incorreto
  3  manifesto, seleção ou arquivo em conflito; operação interrompida
  4  download recusado ou inseguro
  5  imagem inválida ou insuficiente
`;

const CODIGOS_DE_DOWNLOAD = new Set([
  "URL_NAO_PERMITIDA",
  "REDIRECIONAMENTO_NAO_PERMITIDO",
  "DOWNLOAD_RECUSADO",
  "TEMPO_ESGOTADO",
  "REDE_INDISPONIVEL",
  "ARQUIVO_GRANDE_DEMAIS",
]);
const CODIGOS_DE_IMAGEM = new Set([
  "CONTEUDO_NAO_IMAGEM",
  "FORMATO_NAO_PERMITIDO",
  "ORIGEM_PEQUENA_DEMAIS",
]);

export function codigoDeSaidaDaFalha(codigo) {
  if (codigo === "ENTRADA_INVALIDA") return 2;
  if (CODIGOS_DE_DOWNLOAD.has(codigo)) return 4;
  if (CODIGOS_DE_IMAGEM.has(codigo)) return 5;
  return 3;
}

function usoIncorreto() {
  process.stderr.write("Argumentos inválidos. Use --ajuda.\n");
  process.exitCode = 2;
}

async function principal() {
  let argumentos;
  try {
    argumentos = parseArgs({
      allowPositionals: true,
      options: {
        manifesto: { type: "string" },
        lote: { type: "string" },
        id: { type: "string" },
        "pixabay-id": { type: "string" },
        "licenca-consultada-em": { type: "string" },
        enquadramento: { type: "string" },
        motivos: { type: "string" },
        observacao: { type: "string" },
        resultado: { type: "string" },
        ajuda: { type: "boolean", short: "h" },
      },
    });
  } catch {
    usoIncorreto();
    return;
  }

  const { values: v, positionals } = argumentos;
  if (v.ajuda) {
    process.stdout.write(AJUDA);
    return;
  }

  const comando = positionals.length === 1 ? positionals[0] : undefined;
  if (!v.manifesto) {
    usoIncorreto();
    return;
  }

  const base = { caminhoManifesto: v.manifesto };
  const pixabayId = Number(v["pixabay-id"]);
  const motivos = v.motivos?.split(",").map((motivo) => motivo.trim());

  const acoes = {
    iniciar: () => iniciarManifesto({ ...base, caminhoLote: v.lote ?? "" }),
    selecionar: () =>
      selecionarCandidato({
        ...base,
        id: v.id,
        pixabayId,
        licencaConsultadaEm: v["licenca-consultada-em"],
        enquadramento: v.enquadramento,
      }),
    rejeitar: () =>
      registrarRejeicao({ ...base, id: v.id, pixabayId, motivos, observacao: v.observacao }),
    revisar: () =>
      registrarRevisao({ ...base, id: v.id, resultado: v.resultado, observacao: v.observacao }),
    concluir: () => concluirPreparacao(base),
  };

  if (!Object.hasOwn(acoes, comando ?? "")) {
    usoIncorreto();
    return;
  }

  const resultado = await acoes[comando]();
  process.stdout.write(`Resultado: ${resultado.situacao}\n`);
  if (resultado.nome)
    process.stdout.write(`Arquivo: ${resultado.nome}\nSHA-256: ${resultado.sha256}\n`);
}

if (ehExecucaoDireta(import.meta.url)) {
  try {
    await principal();
  } catch (erro) {
    if (erro instanceof FalhaOperacional) {
      process.stderr.write(`[${erro.codigo}] ${erro.message}\n`);
      for (const { codigo, item } of erro.detalhes.problemas ?? []) {
        process.stderr.write(`  - [${codigo}]${item ? ` ${item}` : ""}\n`);
      }
      process.exitCode = codigoDeSaidaDaFalha(erro.codigo);
    } else {
      process.stderr.write("Falha inesperada na preparação.\n");
      process.exitCode = 1;
    }
  }
}
