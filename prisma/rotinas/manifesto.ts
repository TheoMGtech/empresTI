// Valida o manifesto aprovado de fotografias e devolve só o que a carga inicial precisa.
// Não acessa banco, rede nem os JPEGs, e não altera o manifesto. Não usa o validador da skill,
// que exige as imagens locais e depende de `sharp`, ausente fora do ambiente de desenvolvimento.
//
// `item.situacao` descreve a seleção da fotografia e nunca é devolvido: a situação operacional
// do equipamento vem da tabela de carga inicial.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const ESTADOS_ACEITOS = new Set(["aprovado", "publicado"]);
const BUCKET = "equipamentos";
const FORMATO_NOME = /^(TI-\d{4})-([0-9a-f]{8})\.jpg$/;

export const MANIFESTO_PADRAO = fileURLToPath(
  new URL("../../docs/imagens-equipamentos/manifesto.json", import.meta.url),
);

export const PATRIMONIOS_ESPERADOS = Array.from(
  { length: 12 },
  (_valor, indice) => `TI-${String(indice + 1).padStart(4, "0")}`,
);

const CATEGORIAS = {
  Notebook: "notebook",
  Monitor: "monitor",
  Cabo: "cabo",
  Câmera: "camera",
} as const;

const MENSAGENS = {
  ARQUIVO_ILEGIVEL: "O manifesto não existe ou não pôde ser lido.",
  JSON_INVALIDO: "O manifesto não é um JSON válido.",
  ESTRUTURA_INVALIDA: "O manifesto tem campo ausente ou inválido.",
  ESTADO_INVALIDO: "O manifesto não está aprovado.",
  PATRIMONIO_REPETIDO: "O manifesto repete um patrimônio.",
  PATRIMONIOS_DIVERGENTES: "O manifesto não tem exatamente os 12 patrimônios esperados.",
  NOME_ARQUIVO_DIVERGENTE: "O nome do arquivo não corresponde ao patrimônio ou ao SHA-256.",
  DESTINO_INCOERENTE: "O destino no Storage não corresponde ao nome do arquivo.",
  APROVACAO_DIVERGENTE: "A aprovação humana não corresponde ao SHA-256 do arquivo.",
} as const;

export type CodigoManifesto = keyof typeof MENSAGENS;

export class ErroManifestoInvalido extends Error {
  readonly codigo: CodigoManifesto;

  constructor(codigo: CodigoManifesto) {
    super(MENSAGENS[codigo]);
    this.name = "ErroManifestoInvalido";
    this.codigo = codigo;
  }
}

export type ItemManifesto = {
  patrimonio: string;
  nome: string;
  categoria: (typeof CATEGORIAS)[keyof typeof CATEGORIAS];
  imagemCaminho: string;
  imagemSha256: string;
};

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

const topoSchema = z.object({ estado: z.string(), itens: z.array(z.unknown()) });

const itemSchema = z.object({
  id: z.string().regex(/^TI-\d{4}$/),
  equipamento: z.string().trim().min(1),
  categoria: z.enum(["Notebook", "Monitor", "Cabo", "Câmera"]),
  situacao: z.literal("selecionada"),
  arquivo: z.object({ nome_relativo: z.string(), sha256 }),
  storage: z.object({ destino_planejado: z.string() }),
  aprovacao_humana: z.object({ decisao: z.literal("aprovada"), sha256_aprovado: sha256 }),
});

type ItemValidado = z.infer<typeof itemSchema>;

function exigirCoerencia(item: ItemValidado) {
  const partes = FORMATO_NOME.exec(item.arquivo.nome_relativo);
  if (!partes || partes[1] !== item.id || partes[2] !== item.arquivo.sha256.slice(0, 8)) {
    throw new ErroManifestoInvalido("NOME_ARQUIVO_DIVERGENTE");
  }
  if (item.storage.destino_planejado !== `${BUCKET}/${item.arquivo.nome_relativo}`) {
    throw new ErroManifestoInvalido("DESTINO_INCOERENTE");
  }
  if (item.aprovacao_humana.sha256_aprovado !== item.arquivo.sha256) {
    throw new ErroManifestoInvalido("APROVACAO_DIVERGENTE");
  }
}

function exigirPatrimonios(itens: readonly ItemValidado[]) {
  const ids = itens.map((item) => item.id);
  const unicos = new Set(ids);

  if (unicos.size !== ids.length) throw new ErroManifestoInvalido("PATRIMONIO_REPETIDO");
  if (
    unicos.size !== PATRIMONIOS_ESPERADOS.length ||
    !PATRIMONIOS_ESPERADOS.every((patrimonio) => unicos.has(patrimonio))
  ) {
    throw new ErroManifestoInvalido("PATRIMONIOS_DIVERGENTES");
  }
}

/** Valida dados já lidos. Lança antes de qualquer escrita se o manifesto for inválido. */
export function validarManifesto(dados: unknown): ItemManifesto[] {
  const topo = topoSchema.safeParse(dados);
  if (!topo.success) throw new ErroManifestoInvalido("ESTRUTURA_INVALIDA");
  if (!ESTADOS_ACEITOS.has(topo.data.estado)) throw new ErroManifestoInvalido("ESTADO_INVALIDO");

  const itens = topo.data.itens.map((bruto) => {
    const item = itemSchema.safeParse(bruto);
    if (!item.success) throw new ErroManifestoInvalido("ESTRUTURA_INVALIDA");
    return item.data;
  });

  exigirPatrimonios(itens);
  itens.forEach(exigirCoerencia);

  return itens.map((item) => ({
    patrimonio: item.id,
    nome: item.equipamento,
    categoria: CATEGORIAS[item.categoria],
    imagemCaminho: item.storage.destino_planejado,
    imagemSha256: item.arquivo.sha256,
  }));
}

/** Lê e valida o arquivo do manifesto, somente em leitura. */
export function lerManifesto(caminho: string = MANIFESTO_PADRAO): ItemManifesto[] {
  let conteudo: string;
  try {
    conteudo = readFileSync(caminho, "utf8");
  } catch {
    // A mensagem original repete o caminho recebido.
    throw new ErroManifestoInvalido("ARQUIVO_ILEGIVEL");
  }

  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    // A mensagem original repete trechos do conteúdo.
    throw new ErroManifestoInvalido("JSON_INVALIDO");
  }

  return validarManifesto(dados);
}
