"use client";

import type { ReactNode } from "react";

import { AvisoAcesso } from "@/components/shell/aviso-acesso";
import { useSessaoAplicacao } from "@/components/shell/sessao";

export const MENSAGEM_RESTRITO_OPERACOES = "Acesso restrito a Operações.";

/**
 * RF-SESSAO-11: `colaborador` em `/operacoes/*` vê o aviso, dentro do shell. Só interface: os
 * procedimentos de Operações recusam no servidor (`adminProcedure`).
 */
export function GuardaOperacoes({ children }: { children: ReactNode }) {
  const sessao = useSessaoAplicacao();

  if (sessao.papel !== "operacoes") {
    return (
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-7">
        <AvisoAcesso titulo={MENSAGEM_RESTRITO_OPERACOES} />
      </div>
    );
  }

  return <>{children}</>;
}
