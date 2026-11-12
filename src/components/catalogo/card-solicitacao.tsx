"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { TRPCClientError } from "@trpc/client";
import Link from "next/link";
import { useState } from "react";

import { bloqueioDoResumo, useMeuResumo } from "@/components/emprestimos/resumo";
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
import { formatarDataCurta } from "@/lib/datas";
import { trpc } from "@/trpc/cliente";
import type { SaidasRouter } from "@/trpc/tipos";

type DetalheEquipamento = SaidasRouter["equipamentos"]["detalhar"];

export const MENSAGEM_FALHA_INCERTA =
  "Não foi possível confirmar o resultado. Atualize antes de tentar de novo.";

// Recusas de `emprestimos.solicitar` por `error.data.motivo` (RF-SOLIC-06, RF-REGRAS-04).
const RECUSAS: Record<string, string> = {
  EQUIPAMENTO_INDISPONIVEL: "Este equipamento acabou de ser emprestado.",
  EQUIPAMENTO_EM_MANUTENCAO: "Este equipamento está em manutenção.",
  EQUIPAMENTO_NAO_ENCONTRADO: "Equipamento não encontrado.",
  LIMITE_ATINGIDO: "Limite de 3 itens atingido. Devolva um item para solicitar outro.",
  ITEM_EM_ATRASO: "Você tem item em atraso. Devolva antes de solicitar outro.",
};

type Recusa = { mensagem: string; definitiva: boolean };

function recusaDe(erro: unknown): Recusa {
  if (!(erro instanceof TRPCClientError) || !erro.data) {
    // Sem resposta do servidor: o empréstimo pode ter sido criado.
    return { mensagem: MENSAGEM_FALHA_INCERTA, definitiva: false };
  }

  const motivo = typeof erro.data.motivo === "string" ? erro.data.motivo : undefined;
  if (motivo && RECUSAS[motivo]) return { mensagem: RECUSAS[motivo], definitiva: true };

  return { mensagem: "Não foi possível solicitar. Tente novamente.", definitiva: false };
}

function notaIndisponivel(detalhe: DetalheEquipamento) {
  const { disponibilidade } = detalhe;
  switch (disponibilidade.estado) {
    case "emprestado":
      return `Emprestado · devolve ${formatarDataCurta(disponibilidade.devolverAte)}.`;
    case "manutencao":
      return "Em manutenção. Indisponível para empréstimo.";
    case "fora_de_uso":
      return "Fora de uso. Indisponível para empréstimo.";
    default:
      return null;
  }
}

function Linha({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <dt className="text-(--text-dim)">{rotulo}</dt>
      <dd className={destaque ? "font-semibold text-(--accent-300)" : "text-(--color-text)"}>
        {valor}
      </dd>
    </div>
  );
}

/** Card "Solicitar empréstimo" da tela 03 e o diálogo de confirmação (RF-SOLIC-02 e 03). */
export function CardSolicitacao({ detalhe }: { detalhe: DetalheEquipamento }) {
  const utilitarios = trpc.useUtils();
  const solicitar = trpc.emprestimos.solicitar.useMutation();
  const { data: resumo } = useMeuResumo();
  const [aberto, setAberto] = useState(false);
  const [recusa, setRecusa] = useState<Recusa | null>(null);
  const [registrado, setRegistrado] = useState<string | null>(null);

  const disponivel = detalhe.disponibilidade.estado === "disponivel";
  const bloqueio = bloqueioDoResumo(resumo);
  const podeSolicitar = disponivel && !bloqueio;
  const prazo = formatarDataCurta(detalhe.devolverAtePrevisto);
  const nota =
    notaIndisponivel(detalhe) ?? bloqueio?.nota ?? "A retirada é registrada ao confirmar.";
  // RF-REGRAS-03: aviso quando esta solicitação leva ao último item permitido.
  const chegaAoLimite = resumo ? resumo.itensAbertos + 1 === resumo.limite : false;

  function mudarAbertura(proximo: boolean) {
    if (solicitar.isPending) return;
    setAberto(proximo);
    if (!proximo) setRecusa(null);
  }

  async function confirmar() {
    setRecusa(null);

    try {
      const emprestimo = await solicitar.mutateAsync({ equipamentoId: detalhe.id });
      setRegistrado(emprestimo.devolverAte);
      setAberto(false);
    } catch (erro) {
      setRecusa(recusaDe(erro));
    } finally {
      // Sucesso, recusa ou falha de rede: a tela volta a mostrar o estado real (RF-SOLIC-04).
      await Promise.all([
        utilitarios.equipamentos.detalhar.invalidate({ patrimonio: detalhe.patrimonio }),
        utilitarios.equipamentos.listar.invalidate(),
        utilitarios.emprestimos.meuResumo.invalidate(),
        utilitarios.emprestimos.meus.invalidate(),
      ]);
    }
  }

  return (
    <section
      aria-labelledby="titulo-solicitacao"
      className="flex flex-col gap-4 rounded-[12px] border border-(--border-card) bg-(--color-surface) p-5"
    >
      <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-solicitacao">
        Solicitar empréstimo
      </h2>

      <dl className="flex flex-col gap-[10px]">
        <Linha rotulo="Retirada" valor="Ao confirmar" />
        <Linha rotulo="Prazo padrão" valor="14 dias corridos" />
        {podeSolicitar ? <Linha destaque rotulo="Devolver até" valor={prazo} /> : null}
      </dl>

      {registrado ? (
        <div className="flex flex-col gap-1">
          <p className="text-[12.5px] text-[#5FD3AA]" role="status">
            Empréstimo registrado. Devolva até {formatarDataCurta(registrado)}.
          </p>
          <Link className="text-[12.5px]" href="/meus-emprestimos">
            Ver meus empréstimos
          </Link>
        </div>
      ) : null}

      <Dialogo onOpenChange={mudarAbertura} open={aberto}>
        <Botao className="w-full" disabled={!podeSolicitar} onClick={() => mudarAbertura(true)}>
          Solicitar empréstimo
          <ArrowRight aria-hidden="true" size={16} />
        </Botao>
        <ConteudoDialogo>
          <TituloDialogo>Confirmar empréstimo</TituloDialogo>
          <DescricaoDialogo>
            {detalhe.nome} · {detalhe.patrimonio}
          </DescricaoDialogo>
          <ConsequenciaDialogo>
            Devolver até {prazo}. A retirada é registrada agora.
            {chegaAoLimite && resumo ? (
              <>
                {" "}
                Com este item você chega a {resumo.limite} de {resumo.limite}.
              </>
            ) : null}
          </ConsequenciaDialogo>
          <div aria-live="assertive" role="alert">
            {recusa ? <p className="text-[12.5px] text-[#F0A0A5]">{recusa.mensagem}</p> : null}
          </div>
          <AcoesDialogo>
            <FecharDialogo asChild>
              <Botao disabled={solicitar.isPending} tamanho="dialogo" variante="secundario">
                Cancelar
              </Botao>
            </FecharDialogo>
            <Botao
              disabled={solicitar.isPending || recusa?.definitiva === true}
              onClick={confirmar}
              tamanho="dialogo"
              variante="confirmacao"
            >
              {solicitar.isPending ? "Solicitando..." : "Confirmar"}
            </Botao>
          </AcoesDialogo>
        </ConteudoDialogo>
      </Dialogo>

      <p
        className={
          disponivel && bloqueio
            ? "text-[11.5px] text-[#F0A0A5]"
            : "text-[11.5px] text-(--text-faint)"
        }
      >
        {nota}
      </p>
    </section>
  );
}
