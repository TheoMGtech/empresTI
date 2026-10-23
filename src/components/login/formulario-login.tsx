"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { esquemaEntrada, type DadosEntrada } from "@/lib/esquemas/autenticacao";
import { trpc } from "@/trpc/cliente";

export const MENSAGEM_CREDENCIAIS_INVALIDAS = "Não foi possível entrar. Confira e-mail e senha.";
export const MENSAGEM_FALHA_INESPERADA = "Não foi possível concluir o acesso. Tente novamente.";

function mensagemDeErro(erro: unknown) {
  if (erro instanceof TRPCClientError && erro.data?.code === "UNAUTHORIZED") {
    return MENSAGEM_CREDENCIAIS_INVALIDAS;
  }

  return MENSAGEM_FALHA_INESPERADA;
}

const classeCampo =
  "h-[42px] rounded-[8px] border border-(--border-strong) bg-(--surface-sunken) px-3 text-[14px] text-(--color-text) aria-invalid:border-[#E08A90]";

export function FormularioLogin() {
  const utilitarios = trpc.useUtils();
  const entrar = trpc.autenticacao.entrar.useMutation();
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<DadosEntrada>({
    defaultValues: { email: "", senha: "" },
    resolver: zodResolver(esquemaEntrada),
  });

  const enviar = handleSubmit(async (dados) => {
    setErroEnvio(null);

    try {
      await entrar.mutateAsync(dados);
      utilitarios.autenticacao.sessao.setData(undefined, { autenticado: true });
    } catch (erro) {
      setErroEnvio(mensagemDeErro(erro));
    }
  });

  return (
    <form className="flex flex-col gap-[18px]" method="post" noValidate onSubmit={enviar}>
      <div className="flex flex-col gap-2">
        <label className="text-[12px] text-[#9AA3BC]" htmlFor="email">
          E-mail
        </label>
        <input
          aria-describedby={errors.email ? "email-erro" : undefined}
          aria-invalid={errors.email ? true : undefined}
          autoComplete="email"
          className={classeCampo}
          id="email"
          inputMode="email"
          type="email"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-[12px] text-[#F0A0A5]" id="email-erro">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] text-[#9AA3BC]" htmlFor="senha">
          Senha
        </label>
        <input
          aria-describedby={errors.senha ? "senha-erro" : undefined}
          aria-invalid={errors.senha ? true : undefined}
          autoComplete="current-password"
          className={classeCampo}
          id="senha"
          type="password"
          {...register("senha")}
        />
        {errors.senha ? (
          <p className="text-[12px] text-[#F0A0A5]" id="senha-erro">
            {errors.senha.message}
          </p>
        ) : null}
      </div>

      <div aria-live="assertive" role="alert">
        {erroEnvio ? <p className="text-[12.5px] text-[#F0A0A5]">{erroEnvio}</p> : null}
      </div>

      <button
        className="flex h-11 items-center justify-center gap-2 rounded-[8px] border border-(--accent-500) bg-transparent px-5 text-[14px] font-semibold text-(--accent-300) transition-[background-color,color,transform] duration-[140ms] ease-out hover:enabled:bg-[rgba(91,127,224,0.12)] hover:enabled:text-(--accent-100) active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:translate-y-0"
        disabled={entrar.isPending}
        type="submit"
      >
        {entrar.isPending ? "Entrando..." : "Entrar"}
        <span aria-hidden="true" className="text-[16px]">
          →
        </span>
      </button>
    </form>
  );
}
