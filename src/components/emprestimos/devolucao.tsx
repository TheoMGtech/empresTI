"use client";

import { TRPCClientError } from "@trpc/client";
import { useState } from "react";

import { MENSAGEM_FALHA_INCERTA } from "@/components/catalogo/card-solicitacao";
import { Botao } from "@/components/ui/botao";
import {
  AcoesDialogo,
  ConsequenciaDialogo,
  ConteudoDialogo,
  DescricaoDialogo,
  Dialogo,
  FecharDialogo,
  TituloDialogo,
} from "@/components/ui/dialogo";
import { mensagemDeLimite } from "@/lib/mensagens-limite";
import { trpc } from "@/trpc/cliente";

export type AlvoDevolucao = { id: string; nome: string; patrimonio: string };

type Recusa = { mensagem: string; definitiva: boolean };

export const MENSAGEM_JA_ENCERRADO = "Este empréstimo já foi encerrado.";

function recusaDe(erro: unknown): Recusa {
  // RF-SEG-13: com 429 ou 503 nada foi gravado, e dá para tentar de novo depois.
  const limite = mensagemDeLimite(erro);
  if (limite) return { mensagem: limite, definitiva: false };

  if (!(erro instanceof TRPCClientError) || !erro.data) {
    return { mensagem: MENSAGEM_FALHA_INCERTA, definitiva: false };
  }
  if (erro.data.motivo === "EMPRESTIMO_JA_ENCERRADO") {
    return { mensagem: MENSAGEM_JA_ENCERRADO, definitiva: true };
  }
  if (erro.data.code === "NOT_FOUND") {
    return { mensagem: "Empréstimo não encontrado.", definitiva: true };
  }
  return {
    mensagem: "Não foi possível registrar a devolução. Tente novamente.",
    definitiva: false,
  };
}

/**
 * Depois de devolver (pela pessoa ou no balcão), todas as telas que mostram empréstimos ou
 * disponibilidade voltam a consultar o servidor.
 */
export function useInvalidarAposDevolucao() {
  const utilitarios = trpc.useUtils();

  return () =>
    Promise.all([
      utilitarios.emprestimos.meus.invalidate(),
      utilitarios.emprestimos.historico.invalidate(),
      utilitarios.emprestimos.meuResumo.invalidate(),
      utilitarios.equipamentos.listar.invalidate(),
      utilitarios.equipamentos.detalhar.invalidate(),
      utilitarios.operacoes.invalidate(),
    ]);
}

type PropsDialogo = {
  alvo: AlvoDevolucao | null;
  aoFechar: () => void;
  /** Chama o procedimento de devolução (`emprestimos.devolver` ou `operacoes.registrarDevolucao`). */
  devolver: (emprestimoId: string) => Promise<unknown>;
  pendente: boolean;
  aoConcluir: (alvo: AlvoDevolucao) => void;
  consequencia?: string;
};

/** RF-DEVOL-06 e DF-4: devolução com confirmação em diálogo, encerrada na hora. */
export function DialogoDevolucao({
  alvo,
  aoFechar,
  devolver,
  pendente,
  aoConcluir,
  consequencia = "O empréstimo é encerrado agora, e o item volta ao catálogo se estiver ativo.",
}: PropsDialogo) {
  const invalidar = useInvalidarAposDevolucao();
  const [recusa, setRecusa] = useState<Recusa | null>(null);

  function mudarAbertura(aberto: boolean) {
    if (pendente || aberto) return;
    setRecusa(null);
    aoFechar();
  }

  async function confirmar() {
    if (!alvo) return;
    setRecusa(null);

    try {
      await devolver(alvo.id);
      aoConcluir(alvo);
      aoFechar();
    } catch (erro) {
      setRecusa(recusaDe(erro));
    } finally {
      await invalidar();
    }
  }

  return (
    <Dialogo onOpenChange={mudarAbertura} open={alvo !== null}>
      {alvo ? (
        <ConteudoDialogo>
          <TituloDialogo>Confirmar devolução</TituloDialogo>
          <DescricaoDialogo>
            {alvo.nome} · {alvo.patrimonio}
          </DescricaoDialogo>
          <ConsequenciaDialogo>{consequencia}</ConsequenciaDialogo>
          <div aria-live="assertive" role="alert">
            {recusa ? <p className="text-[12.5px] text-[#F0A0A5]">{recusa.mensagem}</p> : null}
          </div>
          <AcoesDialogo>
            <FecharDialogo asChild>
              <Botao disabled={pendente} tamanho="dialogo" variante="secundario">
                Cancelar
              </Botao>
            </FecharDialogo>
            <Botao
              disabled={pendente || recusa?.definitiva === true}
              onClick={confirmar}
              tamanho="dialogo"
              variante="confirmacao"
            >
              {pendente ? "Devolvendo..." : "Devolver"}
            </Botao>
          </AcoesDialogo>
        </ConteudoDialogo>
      ) : null}
    </Dialogo>
  );
}
