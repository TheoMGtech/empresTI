"use client";

import { FormularioLogin } from "@/components/login/formulario-login";
import { SessaoAtiva } from "@/components/login/sessao-ativa";
import { trpc } from "@/trpc/cliente";

const REGUA_ESMAECIDA =
  "h-px w-full bg-[linear-gradient(to_right,rgba(230,234,246,0),#222C4A_48px,#222C4A_calc(100%-48px),rgba(230,234,246,0))]";

function PainelInstitucional() {
  return (
    <section className="flex flex-col justify-between gap-6 bg-[linear-gradient(160deg,#001449_0%,#00102F_60%,#080C1A_100%)] p-6 sm:p-10 lg:w-[560px] lg:shrink-0 lg:p-14">
      <div className="flex items-center gap-[10px]">
        <span
          aria-hidden="true"
          className="grid size-[34px] place-items-center rounded-[8px] bg-(--accent-900) text-[16px] font-semibold text-(--accent-300) shadow-[0_0_0_1px_#25408F]"
        >
          E
        </span>
        <span className="text-[16px] font-semibold tracking-[0.02em] text-(--color-text)">
          EmpresTI
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="max-w-[20ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.01em] text-pretty text-(--color-text) lg:text-[34px]">
          Acesso ao sistema de empréstimo interno.
        </h1>
        <p className="hidden max-w-[38ch] text-[14px] leading-[1.7] text-pretty text-[#93A0C6] lg:block">
          Centralize equipamentos, acompanhe prazos e mantenha a operação de tecnologia organizada.
        </p>
        <div className={`${REGUA_ESMAECIDA} mt-[10px] hidden lg:block`} />
        <dl className="mt-4 hidden gap-10 lg:flex">
          <div className="flex flex-col-reverse gap-1">
            <dt className="text-[12px] text-[#93A0C6]">itens por pessoa</dt>
            <dd className="text-[24px] font-semibold text-(--color-text)">3</dd>
          </div>
          <div className="flex flex-col-reverse gap-1">
            <dt className="text-[12px] text-[#93A0C6]">dias de prazo</dt>
            <dd className="text-[24px] font-semibold text-(--color-text)">14</dd>
          </div>
        </dl>
      </div>

      <p className="hidden text-[11px] tracking-[0.08em] text-[#93A0C6] uppercase lg:block">
        Operações · v1
      </p>
    </section>
  );
}

export function TelaLogin() {
  const sessao = trpc.autenticacao.sessao.useQuery(undefined, { retry: 1 });
  const autenticado = sessao.data?.autenticado === true;

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-(--page) p-3 sm:p-5"
      data-screen-label="01 Login"
    >
      <div className="flex min-h-[calc(100vh-24px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[14px] bg-(--color-bg) shadow-[0_0_0_1px_#222C4A,0_18px_44px_rgba(0,0,0,0.6)] sm:min-h-[min(820px,calc(100vh-40px))] lg:flex-row">
        <PainelInstitucional />

        <section className="flex flex-1 items-start justify-center p-6 sm:p-10 lg:items-center lg:p-14">
          <div className="flex w-full max-w-[372px] flex-col gap-7">
            {autenticado ? (
              <SessaoAtiva />
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-(--color-text)">
                    Entrar
                  </h2>
                  <p className="text-[13px] text-(--text-muted)">
                    Acesse sua conta para consultar e solicitar equipamentos.
                  </p>
                </div>
                <FormularioLogin />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
