// Situação operacional inicial de cada patrimônio, conforme a tabela "Carga inicial" da spec 002.
// É a única origem desse valor: `item.situacao` do manifesto descreve a seleção da fotografia.

export type SituacaoInicial = "ativo" | "em_manutencao";

export const SITUACOES_INICIAIS: Readonly<Record<string, SituacaoInicial>> = {
  "TI-0001": "ativo",
  "TI-0002": "ativo",
  "TI-0003": "ativo",
  "TI-0004": "em_manutencao",
  "TI-0005": "ativo",
  "TI-0006": "ativo",
  "TI-0007": "em_manutencao",
  "TI-0008": "ativo",
  "TI-0009": "ativo",
  "TI-0010": "ativo",
  "TI-0011": "ativo",
  "TI-0012": "ativo",
};
