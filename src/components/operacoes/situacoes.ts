import type { SaidasRouter } from "@/trpc/tipos";

type Disponibilidade = SaidasRouter["equipamentos"]["detalhar"]["disponibilidade"];
export type SituacaoEquipamento = "ativo" | "em_manutencao" | "fora_de_uso";

// RN-OPER-03: "Disponível" na interface grava `ativo`.
export const OPCOES_SITUACAO: { valor: SituacaoEquipamento; rotulo: string }[] = [
  { valor: "ativo", rotulo: "Disponível" },
  { valor: "em_manutencao", rotulo: "Em manutenção" },
  { valor: "fora_de_uso", rotulo: "Fora de uso" },
];

/** Situação gravada a partir da disponibilidade lida (emprestado é sempre `ativo`). */
export function situacaoDaDisponibilidade(disponibilidade: Disponibilidade): SituacaoEquipamento {
  switch (disponibilidade.estado) {
    case "manutencao":
      return "em_manutencao";
    case "fora_de_uso":
      return "fora_de_uso";
    default:
      return "ativo";
  }
}

/** Disponibilidade que a prévia do cadastro mostra para cada situação inicial. */
export function disponibilidadeDaSituacao(situacao: SituacaoEquipamento) {
  if (situacao === "em_manutencao") return { estado: "manutencao" } as const;
  if (situacao === "fora_de_uso") return { estado: "fora_de_uso" } as const;
  return { estado: "disponivel" } as const;
}
