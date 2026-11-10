// Linha de comando do validador. Toda a regra fica em nucleo.mjs; aqui só há entrada e saída.
import path from "node:path";
import { parseArgs } from "node:util";

import { codigoDeSaida, ESTADOS, validarManifesto } from "./nucleo.mjs";

const AJUDA = `Valida o manifesto de imagens de equipamentos. Não acessa rede nem credenciais.

Uso:
  node validar.mjs --manifesto <arquivo.json> --diretorio <pasta> --estado <estado>

Estados:
  preparacao      aceita itens explicitamente pendentes
  final_revisao   exige os 12 arquivos preparados e metadados completos
  aprovado        exige também a aprovação humana e a checagem de semelhança
  publicado       exige também o registro das URLs públicas verificadas

Códigos de saída:
  0  validação aprovada
  1  falha inesperada
  2  uso incorreto
  3  erros de estrutura
  4  erros de arquivo
  5  inconsistências de metadados
  6  pendências de aprovação ou publicação
`;

const SECOES = [
  ["estrutura", "Erros de estrutura"],
  ["arquivo", "Erros de arquivo"],
  ["metadados", "Inconsistências de metadados"],
  ["pendencia", "Pendências de aprovação/publicação"],
];

function encerrarPorUso(mensagem) {
  process.stderr.write(`${mensagem} Use --ajuda.\n`);
  process.exitCode = 2;
}

function lerArgumentos() {
  try {
    return parseArgs({
      options: {
        manifesto: { type: "string" },
        diretorio: { type: "string" },
        estado: { type: "string" },
        ajuda: { type: "boolean", short: "h" },
      },
    }).values;
  } catch {
    // A mensagem original repete o argumento recebido, que nunca deve aparecer na saída.
    return undefined;
  }
}

function imprimir(relatorio, caminhoManifesto) {
  const linhas = [
    `Estado verificado: ${relatorio.estado}`,
    `Manifesto: ${path.basename(caminhoManifesto)}`,
  ];
  const { itens, selecionados, arquivos_verificados: arquivos, rejeicoes } = relatorio.resumo;
  linhas.push(
    `Itens: ${itens} · selecionados: ${selecionados} · arquivos verificados: ${arquivos} · rejeições: ${rejeicoes}`,
  );

  for (const [categoria, titulo] of SECOES) {
    const problemas = relatorio.problemas.filter((item) => item.categoria === categoria);
    if (problemas.length === 0) continue;
    linhas.push("", `${titulo} (${problemas.length}):`);
    for (const { codigo, item, campo, mensagem } of problemas) {
      const local = [item, campo].filter(Boolean).join(" · ");
      linhas.push(`  - [${codigo}]${local ? ` ${local}:` : ""} ${mensagem}`);
    }
  }

  if (relatorio.avisos.length > 0) {
    linhas.push("", "Avisos:", ...relatorio.avisos.map((aviso) => `  - ${aviso}`));
  }

  linhas.push(
    "",
    relatorio.aprovado
      ? `Validação aprovada para o estado ${relatorio.estado}.`
      : "Validação reprovada.",
  );
  process.stdout.write(`${linhas.join("\n")}\n`);
}

async function principal() {
  const argumentos = lerArgumentos();
  if (argumentos === undefined) {
    encerrarPorUso("Argumento não reconhecido.");
    return;
  }
  if (argumentos.ajuda) {
    process.stdout.write(AJUDA);
    return;
  }

  const { manifesto, diretorio, estado } = argumentos;
  if (!manifesto || !diretorio || !estado) {
    encerrarPorUso("Informe --manifesto, --diretorio e --estado.");
    return;
  }
  if (!ESTADOS.includes(estado)) {
    encerrarPorUso("Estado desconhecido.");
    return;
  }

  const relatorio = await validarManifesto({ caminhoManifesto: manifesto, diretorio, estado });
  imprimir(relatorio, manifesto);
  process.exitCode = codigoDeSaida(relatorio);
}

try {
  await principal();
} catch {
  // Sem detalhes do erro: eles podem conter caminhos ou conteúdo de arquivo.
  process.stderr.write("Falha inesperada na validação.\n");
  process.exitCode = 1;
}
