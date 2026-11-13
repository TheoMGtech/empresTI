"use client";

import { TRPCClientError } from "@trpc/client";
import { useState } from "react";

import { MENSAGEM_FALHA_INCERTA } from "@/components/catalogo/card-solicitacao";
import {
  OPCOES_SITUACAO,
  situacaoDaDisponibilidade,
  type SituacaoEquipamento,
} from "@/components/operacoes/situacoes";
import { Botao } from "@/components/ui/botao";
import { ControleSegmentado } from "@/components/ui/controle-segmentado";
import { mensagemDeLimite } from "@/lib/mensagens-limite";
import { trpc } from "@/trpc/cliente";
import type { SaidasRouter } from "@/trpc/tipos";

type DetalheEquipamento = SaidasRouter["equipamentos"]["detalhar"];

export const MENSAGEM_EMPRESTIMO_EM_ABERTO =
  "Não é possível alterar: o equipamento tem empréstimo em aberto.";

/**
 * DF-7 e RF-OPER-07: Operações altera a situação no detalhe, inclusive para tirar da
 * manutenção. Com empréstimo em aberto, o servidor recusa com `EMPRESTIMO_EM_ABERTO`.
 */
export function ControleSituacao({ detalhe }: { detalhe: DetalheEquipamento }) {
  const utilitarios = trpc.useUtils();
  const alterar = trpc.equipamentos.alterarSituacao.useMutation();
  const atual = situacaoDaDisponibilidade(detalhe.disponibilidade);
  const [escolhida, setEscolhida] = useState<SituacaoEquipamento>(atual);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function salvar() {
    setMensagem(null);

    try {
      await alterar.mutateAsync({ equipamentoId: detalhe.id, situacao: escolhida });
      setMensagem({ texto: "Situação atualizada.", erro: false });
    } catch (erro) {
      // RF-SEG-13: limite excedido (429) e contador indisponível (503) têm mensagem própria.
      const limite = mensagemDeLimite(erro);
      if (limite) {
        setMensagem({ texto: limite, erro: true });
      } else if (!(erro instanceof TRPCClientError) || !erro.data) {
        setMensagem({ texto: MENSAGEM_FALHA_INCERTA, erro: true });
      } else if (erro.data.motivo === "EMPRESTIMO_EM_ABERTO") {
        setMensagem({ texto: MENSAGEM_EMPRESTIMO_EM_ABERTO, erro: true });
        setEscolhida(atual);
      } else {
        setMensagem({ texto: "Não foi possível alterar a situação. Tente novamente.", erro: true });
      }
    } finally {
      await Promise.all([
        utilitarios.equipamentos.detalhar.invalidate({ patrimonio: detalhe.patrimonio }),
        utilitarios.equipamentos.listar.invalidate(),
        utilitarios.operacoes.resumo.invalidate(),
      ]);
    }
  }

  return (
    <section
      aria-labelledby="titulo-situacao"
      className="flex flex-col gap-3 rounded-[12px] border border-(--border-card) bg-(--color-surface) p-5"
    >
      <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-situacao">
        Situação do equipamento
      </h2>
      <ControleSegmentado
        aoMudar={setEscolhida}
        desabilitado={alterar.isPending}
        nome="situacao-equipamento"
        opcoes={OPCOES_SITUACAO}
        rotulo="Situação do equipamento"
        valor={escolhida}
      />
      <div aria-live="polite">
        {mensagem ? (
          <p
            className={
              mensagem.erro ? "text-[12.5px] text-[#F0A0A5]" : "text-[12.5px] text-[#5FD3AA]"
            }
            role={mensagem.erro ? "alert" : "status"}
          >
            {mensagem.texto}
          </p>
        ) : null}
      </div>
      <Botao
        disabled={alterar.isPending || escolhida === atual}
        onClick={salvar}
        tamanho="dialogo"
        variante="secundario"
      >
        {alterar.isPending ? "Salvando..." : "Salvar situação"}
      </Botao>
    </section>
  );
}
