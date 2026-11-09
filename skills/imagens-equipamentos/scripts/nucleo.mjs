// Núcleo da skill imagens-equipamentos: contrato do manifesto e validação determinística.
// Sem rede, sem credenciais e sem escrita: só lê o manifesto e as imagens do diretório indicado.
// Mensagens de erro nunca repetem valores vindos do manifesto ou dos arquivos.
import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { z } from "zod";

export const ESTADOS = ["preparacao", "final_revisao", "aprovado", "publicado"];

export const CATEGORIA_POR_ID = new Map([
  ["TI-0001", "Notebook"],
  ["TI-0002", "Notebook"],
  ["TI-0003", "Notebook"],
  ["TI-0004", "Notebook"],
  ["TI-0005", "Monitor"],
  ["TI-0006", "Monitor"],
  ["TI-0007", "Monitor"],
  ["TI-0008", "Cabo"],
  ["TI-0009", "Cabo"],
  ["TI-0010", "Cabo"],
  ["TI-0011", "Câmera"],
  ["TI-0012", "Câmera"],
]);

export const LARGURA_FINAL = 800;
export const ALTURA_FINAL = 600;
export const BUCKET_PLANEJADO = "equipamentos";
export const LIMITE_BYTES_IMAGEM = 5 * 1024 * 1024;
export const LIMITE_BYTES_MANIFESTO = 2 * 1024 * 1024;
const LIMITE_PIXELS = 4096 * 4096;

export const MOTIVOS_DE_REJEICAO = [
  "OBJETO_ERRADO",
  "PESSOA",
  "MARCA",
  "MARCA_DAGUA",
  "TEXTO",
  "TELA_COM_CONTEUDO",
  "INDICIO_IA",
  "RESOLUCAO",
  "RECORTE",
  "DUPLICADA",
  "QUALIDADE",
];

const FORMATO_ID = /^TI-\d{4}$/;
const FORMATO_NOME = /^(TI-\d{4})-([0-9a-f]{8})\.jpg$/;
const TEXTO_FICTICIO =
  /^(<.*>|todo|tbd|n\/?a|desconhecid[oa]|a preencher|placeholder|fict[ií]ci[oa])$/i;

const ORDEM_DOS_ESTADOS = new Map(ESTADOS.map((estado, indice) => [estado, indice]));
const ORDEM_DE_GRAVIDADE = ["estrutura", "arquivo", "metadados", "pendencia"];
const SAIDA_POR_CATEGORIA = { estrutura: 3, arquivo: 4, metadados: 5, pendencia: 6 };

const texto = z.string().trim().min(1).max(500);
const data = z.iso.date();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const dimensoes = z.strictObject({
  largura: z.number().int().positive(),
  altura: z.number().int().positive(),
});

const origemSchema = z.strictObject({
  fonte: z.literal("Pixabay"),
  pixabay_id: z.number().int().positive(),
  url_pagina: z.string().max(2048),
  autor: texto,
  licenca: z.strictObject({ referencia: texto, consultada_em: data }),
  obtida_em: data,
  dimensoes_originais: dimensoes.nullable(),
});

const arquivoSchema = z.strictObject({
  nome_relativo: z.string().max(260),
  dimensoes_finais: z.strictObject({
    largura: z.literal(LARGURA_FINAL),
    altura: z.literal(ALTURA_FINAL),
  }),
  sha256,
});

const camposDoEquipamento = {
  id: z.string().max(32),
  equipamento: texto,
  categoria: z.enum(["Notebook", "Monitor", "Cabo", "Câmera"]),
};

const itemPendenteSchema = z.strictObject({
  ...camposDoEquipamento,
  situacao: z.literal("pendente"),
  observacao: texto.optional(),
});

const itemSelecionadoSchema = z.strictObject({
  ...camposDoEquipamento,
  situacao: z.literal("selecionada"),
  origem: origemSchema,
  arquivo: arquivoSchema.optional(),
  revisao_visual: z
    .strictObject({
      resultado: z.enum(["pendente", "aceita_agente", "reprovada"]),
      observacao: texto.optional(),
    })
    .optional(),
  aprovacao_humana: z
    .strictObject({
      decisao: z.literal("aprovada"),
      responsavel: texto,
      aprovada_em: data,
      sha256_aprovado: sha256,
    })
    .optional(),
  storage: z.strictObject({ destino_planejado: z.string().max(300) }).optional(),
  publicacao: z
    .strictObject({
      url_publica: z.string().max(2048),
      verificada_em: data,
      sha256_verificado: sha256,
    })
    .optional(),
});

const rejeicaoSchema = z.strictObject({
  id_equipamento: z.string().max(32),
  pixabay_id: z.number().int().positive(),
  url_pagina: z.string().max(2048).optional(),
  motivos: z.array(z.enum(MOTIVOS_DE_REJEICAO)).min(1),
  observacao: texto.optional(),
  rejeitada_em: data,
});

// Espaço reservado para a checagem de semelhança da etapa de seleção. Hash diferente não
// comprova imagem visualmente diferente, por isso o estado "aprovado" exige este registro.
const semelhancaSchema = z.discriminatedUnion("situacao", [
  z.strictObject({ situacao: z.literal("nao_verificada") }),
  z.strictObject({
    situacao: z.literal("verificada"),
    metodo: texto,
    responsavel: texto,
    verificada_em: data,
  }),
]);

export const manifestoSchema = z.strictObject({
  versao: z.literal(1),
  estado: z.enum(ESTADOS),
  semelhanca_visual: semelhancaSchema,
  itens: z
    .array(z.discriminatedUnion("situacao", [itemPendenteSchema, itemSelecionadoSchema]))
    .max(100),
  rejeicoes: z.array(rejeicaoSchema).max(5000),
});

const DESCRICAO_DO_ERRO_DE_ESQUEMA = {
  invalid_type: "tipo inválido ou campo ausente",
  unrecognized_keys: "campo não permitido",
  invalid_value: "valor não permitido",
  invalid_union: "formato não reconhecido",
  invalid_format: "formato inválido",
  too_small: "valor abaixo do mínimo",
  too_big: "valor acima do máximo",
};

export class FalhaDeArquivo extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.codigo = codigo;
  }
}

export function calcularSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// Checagem léxica feita antes de qualquer acesso ao disco.
export function nomeRelativoSeguro(relativo) {
  if (typeof relativo !== "string" || relativo === "" || relativo.includes("\0")) return false;
  if (path.posix.isAbsolute(relativo) || path.win32.isAbsolute(relativo)) return false;
  if (/^[a-zA-Z]:/.test(relativo)) return false;
  return !relativo.split(/[\\/]/).includes("..");
}

export async function raizDoDiretorio(diretorio) {
  try {
    const raiz = await realpath(diretorio);
    if ((await stat(raiz)).isDirectory()) return raiz;
  } catch {
    // Tratado abaixo: o motivo não é repetido para não expor o caminho.
  }
  throw new FalhaDeArquivo(
    "DIRETORIO_INVALIDO",
    "o diretório permitido não existe ou não é uma pasta",
  );
}

function estaDentro(raiz, caminho) {
  const relativo = path.relative(raiz, caminho);
  return (
    relativo !== "" &&
    relativo !== ".." &&
    !relativo.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativo)
  );
}

export async function localizarArquivo(raiz, relativo) {
  const fora = new FalhaDeArquivo(
    "CAMINHO_FORA_DO_DIRETORIO",
    "o caminho não pertence ao diretório permitido",
  );
  if (!nomeRelativoSeguro(relativo)) throw fora;

  const alvo = path.resolve(raiz, relativo);
  if (!estaDentro(raiz, alvo)) throw fora;

  let informacoes;
  let real;
  try {
    informacoes = await lstat(alvo);
    if (informacoes.isSymbolicLink()) {
      throw new FalhaDeArquivo("LINK_SIMBOLICO", "o arquivo é um link simbólico");
    }
    real = await realpath(alvo);
  } catch (erro) {
    if (erro instanceof FalhaDeArquivo) throw erro;
    if (erro.code === "ENOENT") throw new FalhaDeArquivo("ARQUIVO_AUSENTE", "o arquivo não existe");
    throw new FalhaDeArquivo("ARQUIVO_ILEGIVEL", "o arquivo não pôde ser lido");
  }

  if (!estaDentro(raiz, real)) throw fora;
  if (!informacoes.isFile())
    throw new FalhaDeArquivo("ARQUIVO_INVALIDO", "o caminho não é um arquivo comum");
  if (informacoes.size > LIMITE_BYTES_IMAGEM) {
    throw new FalhaDeArquivo("ARQUIVO_GRANDE_DEMAIS", "o arquivo excede o limite de tamanho");
  }
  return real;
}

export async function inspecionarImagemFinal(caminho) {
  const corrompido = new FalhaDeArquivo(
    "ARQUIVO_CORROMPIDO",
    "o arquivo não pôde ser decodificado",
  );
  const opcoes = { failOn: "warning", limitInputPixels: LIMITE_PIXELS };

  let bytes;
  try {
    bytes = await readFile(caminho);
  } catch {
    throw new FalhaDeArquivo("ARQUIVO_ILEGIVEL", "o arquivo não pôde ser lido");
  }

  let metadados;
  try {
    metadados = await sharp(bytes, opcoes).metadata();
  } catch {
    throw corrompido;
  }

  if (metadados.format !== "jpeg") {
    throw new FalhaDeArquivo("FORMATO_INCORRETO", "o conteúdo real do arquivo não é JPEG");
  }
  if (
    metadados.width !== LARGURA_FINAL ||
    metadados.height !== ALTURA_FINAL ||
    (metadados.orientation ?? 1) !== 1
  ) {
    throw new FalhaDeArquivo(
      "DIMENSAO_INVALIDA",
      `a imagem decodificada não mede ${LARGURA_FINAL} × ${ALTURA_FINAL} na orientação normal`,
    );
  }

  // metadata() lê só o cabeçalho; a decodificação completa é o que revela arquivo truncado.
  try {
    await sharp(bytes, opcoes).raw().toBuffer();
  } catch {
    throw corrompido;
  }

  return {
    formato: metadados.format,
    largura: metadados.width,
    altura: metadados.height,
    sha256: calcularSha256(bytes),
  };
}

async function lerManifesto(caminho, problema) {
  if (typeof caminho !== "string" || path.extname(caminho).toLowerCase() !== ".json") {
    problema("estrutura", "MANIFESTO_INVALIDO", "o manifesto precisa ser um arquivo .json");
    return undefined;
  }

  let conteudo;
  try {
    if ((await stat(caminho)).size > LIMITE_BYTES_MANIFESTO) {
      problema("estrutura", "MANIFESTO_GRANDE_DEMAIS", "o manifesto excede o limite de tamanho");
      return undefined;
    }
    conteudo = await readFile(caminho, "utf8");
  } catch {
    problema("estrutura", "MANIFESTO_ILEGIVEL", "o manifesto não existe ou não pôde ser lido");
    return undefined;
  }

  try {
    return JSON.parse(conteudo.replace(/^﻿/, ""));
  } catch {
    // A mensagem do JSON.parse repete trechos do conteúdo e por isso não é propagada.
    problema("estrutura", "MANIFESTO_JSON_INVALIDO", "o manifesto não é um JSON válido");
    return undefined;
  }
}

function verificarIdentificadores(manifesto, problema) {
  const vistos = new Set();

  manifesto.itens.forEach((item, indice) => {
    const local = { item: `itens[${indice}]` };
    if (!FORMATO_ID.test(item.id)) {
      problema("estrutura", "ID_MALFORMADO", "identificador fora do formato TI-0000", local);
    } else if (!CATEGORIA_POR_ID.has(item.id)) {
      problema("estrutura", "ID_EXTRA", "identificador fora do lote aprovado", local);
    } else if (vistos.has(item.id)) {
      problema("estrutura", "ID_DUPLICADO", "identificador repetido no lote", { item: item.id });
    } else {
      vistos.add(item.id);
      if (CATEGORIA_POR_ID.get(item.id) !== item.categoria) {
        problema("estrutura", "CATEGORIA_INCOMPATIVEL", "categoria diferente da esperada", {
          item: item.id,
        });
      }
    }
  });

  for (const id of CATEGORIA_POR_ID.keys()) {
    if (!vistos.has(id))
      problema("estrutura", "ID_AUSENTE", "identificador ausente no lote", { item: id });
  }
}

function verificarEstadoDeclarado(manifesto, estado, problema) {
  const declarado = ORDEM_DOS_ESTADOS.get(manifesto.estado);
  const pedido = ORDEM_DOS_ESTADOS.get(estado);

  if (declarado < pedido) {
    problema(
      "pendencia",
      "ESTADO_INSUFICIENTE",
      "o manifesto declara um estado anterior ao verificado",
    );
  } else if (declarado > pedido) {
    problema(
      "metadados",
      "ESTADO_DIVERGENTE",
      "o manifesto declara um estado posterior ao verificado",
    );
  }
}

export function urlDePaginaValida(valor, pixabayId) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === "pixabay.com" &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    new RegExp(`[-/]${pixabayId}/?$`).test(url.pathname)
  );
}

function urlPublicaValida(valor, destino) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) &&
    url.port === "" &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    url.pathname === `/storage/v1/object/public/${destino}`
  );
}

function verificarTextosFicticios(item, problema) {
  const campos = [
    ["equipamento", item.equipamento],
    ["origem.autor", item.origem?.autor],
    ["origem.licenca.referencia", item.origem?.licenca.referencia],
    ["aprovacao_humana.responsavel", item.aprovacao_humana?.responsavel],
  ];

  for (const [campo, valor] of campos) {
    if (valor !== undefined && TEXTO_FICTICIO.test(valor)) {
      problema("metadados", "TEXTO_FICTICIO", "valor de preenchimento não é aceito", {
        item: item.id,
        campo,
      });
    }
  }
}

function verificarConsistenciaDoItem(item, estado, problema) {
  const local = { item: item.id };
  const { origem, arquivo, storage, publicacao } = item;
  const aprovacao = item.aprovacao_humana;

  if (!urlDePaginaValida(origem.url_pagina, origem.pixabay_id)) {
    problema(
      "metadados",
      "ORIGEM_URL_INVALIDA",
      "URL de origem inválida ou sem o identificador da foto",
      {
        ...local,
        campo: "origem.url_pagina",
      },
    );
  }

  if (arquivo && nomeRelativoSeguro(arquivo.nome_relativo)) {
    const partes = FORMATO_NOME.exec(arquivo.nome_relativo);
    if (!partes) {
      problema(
        "metadados",
        "NOME_ARQUIVO_INVALIDO",
        "nome fora do formato TI-0000-<sha8>.jpg",
        local,
      );
    } else if (partes[1] !== item.id || partes[2] !== arquivo.sha256.slice(0, 8)) {
      problema(
        "metadados",
        "NOME_ARQUIVO_DIVERGENTE",
        "nome não corresponde ao item ou ao SHA-256",
        local,
      );
    }

    if (storage && storage.destino_planejado !== `${BUCKET_PLANEJADO}/${arquivo.nome_relativo}`) {
      problema(
        "metadados",
        "DESTINO_DIVERGENTE",
        "destino planejado não corresponde ao arquivo",
        local,
      );
    }
  }

  if (aprovacao && aprovacao.sha256_aprovado !== arquivo?.sha256) {
    problema(
      "metadados",
      "APROVACAO_DIVERGENTE",
      "a aprovação não corresponde ao arquivo atual",
      local,
    );
  }

  if (publicacao) {
    if (estado !== "publicado") {
      problema(
        "metadados",
        "PUBLICACAO_PREMATURA",
        "URL pública registrada antes do estado publicado",
        local,
      );
    }
    if (!storage || !urlPublicaValida(publicacao.url_publica, storage.destino_planejado)) {
      problema(
        "metadados",
        "URL_PUBLICA_INVALIDA",
        "URL pública não corresponde ao destino planejado",
        local,
      );
    }
    if (publicacao.sha256_verificado !== arquivo?.sha256) {
      problema(
        "metadados",
        "PUBLICACAO_DIVERGENTE",
        "a verificação pública não corresponde ao arquivo",
        local,
      );
    }
    if (aprovacao && publicacao.verificada_em < aprovacao.aprovada_em) {
      problema(
        "metadados",
        "PUBLICACAO_ANTERIOR_A_APROVACAO",
        "verificação pública anterior à aprovação",
        local,
      );
    }
  }
}

function verificarExigenciasDoEstado(item, estado, problema) {
  const local = { item: item.id };
  const exige = (minimo) => ORDEM_DOS_ESTADOS.get(estado) >= ORDEM_DOS_ESTADOS.get(minimo);

  if (!exige("final_revisao")) return;
  if (item.situacao === "pendente") {
    problema("metadados", "ITEM_SEM_FOTOGRAFIA", "item sem fotografia selecionada", local);
    return;
  }

  for (const campo of ["arquivo", "revisao_visual", "storage"]) {
    if (item[campo] === undefined) {
      problema("metadados", "METADADO_AUSENTE", "campo obrigatório neste estado", {
        ...local,
        campo,
      });
    }
  }
  if (item.revisao_visual && item.revisao_visual.resultado !== "aceita_agente") {
    problema("metadados", "REVISAO_NAO_ACEITA", "a revisão visual não aceitou a imagem", local);
  }

  if (exige("aprovado") && item.aprovacao_humana === undefined) {
    problema("pendencia", "APROVACAO_AUSENTE", "falta registro de aprovação humana", local);
  }
  if (estado === "publicado" && item.publicacao === undefined) {
    problema("pendencia", "PUBLICACAO_AUSENTE", "falta comprovação da URL pública", local);
  }
}

function verificarDuplicatasDeMetadados(selecionados, problema) {
  const criterios = [
    ["DUPLICATA_PIXABAY_ID", "identificador da Pixabay repetido", (item) => item.origem.pixabay_id],
    ["DUPLICATA_NOME", "nome de arquivo repetido", (item) => item.arquivo?.nome_relativo],
    ["DUPLICATA_DESTINO", "destino de Storage repetido", (item) => item.storage?.destino_planejado],
  ];

  for (const [codigo, mensagem, valorDe] of criterios) {
    const vistos = new Set();
    for (const item of selecionados) {
      const valor = valorDe(item);
      if (valor === undefined) continue;
      if (vistos.has(valor)) problema("metadados", codigo, mensagem, { item: item.id });
      vistos.add(valor);
    }
  }
}

function verificarRejeicoes(manifesto, selecionados, problema) {
  const escolhas = new Set(selecionados.map((item) => `${item.id}:${item.origem.pixabay_id}`));

  manifesto.rejeicoes.forEach((rejeicao, indice) => {
    const local = { item: `rejeicoes[${indice}]` };
    if (!CATEGORIA_POR_ID.has(rejeicao.id_equipamento)) {
      problema(
        "metadados",
        "REJEICAO_ID_DESCONHECIDO",
        "rejeição de equipamento fora do lote",
        local,
      );
    }
    if (
      rejeicao.url_pagina !== undefined &&
      !urlDePaginaValida(rejeicao.url_pagina, rejeicao.pixabay_id)
    ) {
      problema("metadados", "ORIGEM_URL_INVALIDA", "URL de origem inválida na rejeição", local);
    }
    if (escolhas.has(`${rejeicao.id_equipamento}:${rejeicao.pixabay_id}`)) {
      problema(
        "metadados",
        "CANDIDATO_SELECIONADO_E_REJEITADO",
        "candidato rejeitado e selecionado",
        local,
      );
    }
  });
}

async function verificarArquivos(selecionados, diretorio, problema) {
  let raiz;
  try {
    raiz = await raizDoDiretorio(diretorio);
  } catch (falha) {
    problema("arquivo", falha.codigo, falha.message);
    return 0;
  }

  let verificados = 0;
  const donosDoHash = new Map();

  for (const item of selecionados) {
    if (!item.arquivo) continue;
    const local = { item: item.id };
    const { nome_relativo: nome, sha256: declarado } = item.arquivo;

    // Nome fora do padrão já foi reportado como metadado e não chega a abrir arquivo.
    if (nomeRelativoSeguro(nome) && !FORMATO_NOME.test(nome)) continue;

    try {
      const medido = await inspecionarImagemFinal(await localizarArquivo(raiz, nome));
      verificados += 1;

      if (medido.sha256 !== declarado) {
        problema("arquivo", "HASH_DIVERGENTE", "SHA-256 do arquivo difere do manifesto", local);
      }
      if (donosDoHash.has(medido.sha256)) {
        problema("arquivo", "DUPLICATA_SHA256", "mesmos bytes em mais de um equipamento", local);
      }
      donosDoHash.set(medido.sha256, item.id);
    } catch (erro) {
      if (!(erro instanceof FalhaDeArquivo)) throw erro;
      problema("arquivo", erro.codigo, erro.message, local);
    }
  }

  return verificados;
}

function descreverAvisos(manifesto, estado) {
  const avisos = [];
  if (manifesto.semelhanca_visual.situacao === "nao_verificada") {
    avisos.push("Hashes diferentes não comprovam que as imagens são visualmente distintas.");
  }
  if (estado === "publicado") {
    avisos.push(
      "As URLs públicas não foram acessadas: esta versão confere apenas o registro no manifesto.",
    );
  }
  return avisos;
}

export async function validarManifesto({ caminhoManifesto, diretorio, estado }) {
  const relatorio = {
    estado,
    aprovado: false,
    problemas: [],
    avisos: [],
    resumo: { itens: 0, selecionados: 0, arquivos_verificados: 0, rejeicoes: 0 },
  };
  const problema = (categoria, codigo, mensagem, local = {}) => {
    relatorio.problemas.push({ categoria, codigo, mensagem, ...local });
  };

  if (!ORDEM_DOS_ESTADOS.has(estado)) {
    problema("estrutura", "ESTADO_DESCONHECIDO", "estado de validação desconhecido");
    return relatorio;
  }

  const dados = await lerManifesto(caminhoManifesto, problema);
  if (dados === undefined) return relatorio;

  const analise = manifestoSchema.safeParse(dados);
  if (!analise.success) {
    for (const issue of analise.error.issues) {
      problema(
        "estrutura",
        "ESQUEMA_INVALIDO",
        DESCRICAO_DO_ERRO_DE_ESQUEMA[issue.code] ?? "valor inválido",
        {
          campo: issue.path.join("."),
        },
      );
    }
    return relatorio;
  }

  const manifesto = analise.data;
  relatorio.resumo.itens = manifesto.itens.length;
  relatorio.resumo.rejeicoes = manifesto.rejeicoes.length;

  // Identificadores inválidos encerram aqui, antes de qualquer arquivo ser aberto.
  verificarIdentificadores(manifesto, problema);
  if (relatorio.problemas.length > 0) return relatorio;

  verificarEstadoDeclarado(manifesto, estado, problema);

  const selecionados = manifesto.itens.filter((item) => item.situacao === "selecionada");
  relatorio.resumo.selecionados = selecionados.length;

  for (const item of manifesto.itens) {
    verificarTextosFicticios(item, problema);
    if (item.situacao === "selecionada") verificarConsistenciaDoItem(item, estado, problema);
    verificarExigenciasDoEstado(item, estado, problema);
  }

  const exigeAprovacao = ORDEM_DOS_ESTADOS.get(estado) >= ORDEM_DOS_ESTADOS.get("aprovado");
  if (exigeAprovacao && manifesto.semelhanca_visual.situacao !== "verificada") {
    problema(
      "pendencia",
      "SEMELHANCA_NAO_VERIFICADA",
      "falta registrar a checagem de semelhança visual",
    );
  }

  verificarDuplicatasDeMetadados(selecionados, problema);
  verificarRejeicoes(manifesto, selecionados, problema);
  relatorio.resumo.arquivos_verificados = await verificarArquivos(
    selecionados,
    diretorio,
    problema,
  );

  relatorio.avisos = descreverAvisos(manifesto, estado);
  relatorio.aprovado = relatorio.problemas.length === 0;
  return relatorio;
}

export function codigoDeSaida(relatorio) {
  for (const categoria of ORDEM_DE_GRAVIDADE) {
    if (relatorio.problemas.some((item) => item.categoria === categoria)) {
      return SAIDA_POR_CATEGORIA[categoria];
    }
  }
  return 0;
}
