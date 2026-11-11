"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TRPCClientError } from "@trpc/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { MENSAGEM_FALHA_INCERTA } from "@/components/catalogo/card-solicitacao";
import { ROTULO_CATEGORIA } from "@/components/catalogo/categorias";
import { CartaoEquipamento } from "@/components/catalogo/cartao-equipamento";
import {
  disponibilidadeDaSituacao,
  OPCOES_SITUACAO,
  type SituacaoEquipamento,
} from "@/components/operacoes/situacoes";
import { CabecalhoPagina, ConteudoPagina } from "@/components/shell/pagina";
import { Trilha } from "@/components/shell/trilha";
import { Botao } from "@/components/ui/botao";
import {
  AreaTexto,
  CampoFormulario,
  Entrada,
  ligacoesDoCampo,
  Selecao,
} from "@/components/ui/campo";
import { ControleSegmentado } from "@/components/ui/controle-segmentado";
import { formatarInstanteCurto } from "@/lib/datas";
import {
  esquemaCadastroEquipamento,
  type CadastroEquipamento,
  type EntradaCadastroEquipamento,
} from "@/lib/esquemas/equipamentos";
import { trpc } from "@/trpc/cliente";

export const MENSAGEM_PATRIMONIO_DUPLICADO = "Já existe equipamento com este patrimônio.";
export const MENSAGEM_CATEGORIA_OBRIGATORIA = "Escolha a categoria.";

type CampoCadastro = keyof EntradaCadastroEquipamento;

const VALORES_INICIAIS: Partial<EntradaCadastroEquipamento> = {
  nome: "",
  patrimonio: "",
  numeroSerie: "",
  local: "",
  situacao: "ativo",
  observacoes: "",
};

const CATEGORIAS = Object.entries(ROTULO_CATEGORIA) as [
  EntradaCadastroEquipamento["categoria"],
  string,
][];

function UltimosCadastros() {
  const consulta = trpc.operacoes.ultimosCadastros.useQuery();

  return (
    <section
      aria-labelledby="titulo-ultimos"
      className="flex flex-col gap-3 rounded-[12px] border border-(--border-card) bg-(--color-surface) p-5"
    >
      <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-ultimos">
        Últimos cadastros
      </h2>
      {consulta.isPending ? <p className="text-[12.5px] text-(--text-muted)">Carregando</p> : null}
      {consulta.isError ? (
        <p className="text-[12.5px] text-(--text-muted)">Não foi possível carregar.</p>
      ) : null}
      {consulta.data?.length === 0 ? (
        <p className="text-[12.5px] text-(--text-muted)">Nenhum cadastro ainda.</p>
      ) : null}
      {consulta.data && consulta.data.length > 0 ? (
        <ul className="flex flex-col">
          {consulta.data.map((item) => (
            <li
              className="flex items-baseline justify-between gap-3 border-t border-(--border-row) py-2 text-[13px] first:border-t-0"
              key={item.patrimonio}
            >
              <span className="min-w-0 truncate text-(--color-text)">
                {item.nome} <span className="text-(--text-dim)">· {item.patrimonio}</span>
              </span>
              <span className="shrink-0 text-[12px] text-(--text-faint)">
                {formatarInstanteCurto(item.criadoEm)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Tela 06 · Cadastrar equipamento (RF-OPER-05 e 06). */
export function TelaCadastro() {
  const roteador = useRouter();
  const utilitarios = trpc.useUtils();
  const cadastrar = trpc.equipamentos.cadastrar.useMutation();
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
  } = useForm<EntradaCadastroEquipamento, unknown, CadastroEquipamento>({
    defaultValues: VALORES_INICIAIS,
    // RF-OPER-05: o mesmo esquema Zod do procedimento valida o formulário.
    resolver: zodResolver(esquemaCadastroEquipamento),
  });

  const [nome, patrimonio, categoria, situacao] = useWatch({
    control,
    name: ["nome", "patrimonio", "categoria", "situacao"],
  });

  async function enviar(dados: CadastroEquipamento, continuar: boolean) {
    setAviso(null);
    setErroGeral(null);

    try {
      const criado = await cadastrar.mutateAsync(dados);
      await Promise.all([
        utilitarios.equipamentos.listar.invalidate(),
        utilitarios.operacoes.ultimosCadastros.invalidate(),
        utilitarios.operacoes.resumo.invalidate(),
      ]);

      if (!continuar) {
        roteador.push(`/catalogo/${encodeURIComponent(criado.patrimonio)}`);
        return;
      }

      reset({
        ...VALORES_INICIAIS,
        categoria: dados.categoria,
        local: dados.local ?? "",
        situacao: dados.situacao,
      });
      setAviso(`Equipamento ${criado.patrimonio} cadastrado.`);
      setFocus("nome");
    } catch (erro) {
      if (!(erro instanceof TRPCClientError) || !erro.data) {
        setErroGeral(MENSAGEM_FALHA_INCERTA);
        return;
      }
      if (erro.data.motivo === "PATRIMONIO_DUPLICADO") {
        setError("patrimonio", { message: MENSAGEM_PATRIMONIO_DUPLICADO }, { shouldFocus: true });
        return;
      }
      const campos = erro.data.campos as Record<string, string[] | undefined> | null;
      if (campos && Object.keys(campos).length > 0) {
        for (const [campo, mensagens] of Object.entries(campos)) {
          setError(campo as CampoCadastro, { message: mensagens?.[0] ?? "Valor inválido." });
        }
        return;
      }
      setErroGeral("Não foi possível cadastrar. Tente novamente.");
    }
  }

  const ocupado = isSubmitting || cadastrar.isPending;
  const erroCategoria = errors.categoria ? MENSAGEM_CATEGORIA_OBRIGATORIA : undefined;
  const situacaoPrevia = (situacao ?? "ativo") as SituacaoEquipamento;

  return (
    <>
      <CabecalhoPagina>
        <Trilha
          itens={[
            { rotulo: "Operações", href: "/operacoes/emprestimos" },
            { rotulo: "Cadastrar equipamento" },
          ]}
        />
      </CabecalhoPagina>
      <ConteudoPagina>
        <div
          className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]"
          data-screen-label="06 Cadastrar equipamento"
        >
          <form
            className="flex max-w-[620px] min-w-0 flex-col gap-6"
            noValidate
            onSubmit={handleSubmit((dados) => enviar(dados, false))}
          >
            <div className="flex flex-col gap-1">
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-(--color-text)">
                Cadastrar equipamento
              </h1>
              <p className="text-[13px] text-(--text-muted)">Um registro por unidade física.</p>
            </div>

            <div className="grid gap-[18px] sm:grid-cols-2">
              <CampoFormulario
                className="sm:col-span-2"
                erro={errors.nome?.message}
                id="nome"
                rotulo="Nome"
              >
                <Entrada {...ligacoesDoCampo("nome", errors.nome?.message)} {...register("nome")} />
              </CampoFormulario>

              <CampoFormulario erro={erroCategoria} id="categoria" rotulo="Categoria">
                <Selecao
                  {...ligacoesDoCampo("categoria", erroCategoria)}
                  defaultValue=""
                  {...register("categoria")}
                >
                  <option disabled value="">
                    Selecione
                  </option>
                  {CATEGORIAS.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </Selecao>
              </CampoFormulario>

              <CampoFormulario
                erro={errors.patrimonio?.message}
                id="patrimonio"
                rotulo="Patrimônio"
              >
                <Entrada
                  {...ligacoesDoCampo("patrimonio", errors.patrimonio?.message)}
                  autoComplete="off"
                  placeholder="TI-0000"
                  {...register("patrimonio")}
                />
              </CampoFormulario>

              <CampoFormulario
                erro={errors.numeroSerie?.message}
                id="numeroSerie"
                opcional
                rotulo="Número de série"
              >
                <Entrada
                  {...ligacoesDoCampo("numeroSerie", errors.numeroSerie?.message)}
                  autoComplete="off"
                  {...register("numeroSerie")}
                />
              </CampoFormulario>

              <CampoFormulario
                erro={errors.local?.message}
                id="local"
                opcional
                rotulo="Local de retirada"
              >
                <Entrada
                  {...ligacoesDoCampo("local", errors.local?.message)}
                  {...register("local")}
                />
              </CampoFormulario>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-[12px] text-(--text-nav)" id="rotulo-situacao">
                  Situação inicial
                </span>
                <Controller
                  control={control}
                  name="situacao"
                  render={({ field }) => (
                    <ControleSegmentado
                      aoMudar={field.onChange}
                      descricaoId="nota-situacao"
                      nome="situacao"
                      opcoes={OPCOES_SITUACAO}
                      rotulo="Situação inicial"
                      valor={field.value ?? "ativo"}
                    />
                  )}
                />
                <p className="text-[11.5px] text-(--text-faint)" id="nota-situacao">
                  Em manutenção aparece no catálogo, mas não pode ser solicitado. Fora de uso fica
                  oculto para colaboradores.
                </p>
              </div>

              <CampoFormulario
                className="sm:col-span-2"
                erro={errors.observacoes?.message}
                id="observacoes"
                opcional
                rotulo="Observações"
              >
                <AreaTexto
                  {...ligacoesDoCampo("observacoes", errors.observacoes?.message)}
                  {...register("observacoes")}
                />
              </CampoFormulario>
            </div>

            <div aria-live="assertive" role="alert">
              {erroGeral ? <p className="text-[12.5px] text-[#F0A0A5]">{erroGeral}</p> : null}
            </div>
            {aviso ? (
              <p className="text-[12.5px] text-[#5FD3AA]" role="status">
                {aviso}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Botao disabled={ocupado} type="submit">
                {ocupado ? "Cadastrando..." : "Cadastrar"}
              </Botao>
              <Botao
                disabled={ocupado}
                onClick={handleSubmit((dados) => enviar(dados, true))}
                variante="secundario"
              >
                Cadastrar e adicionar outro
              </Botao>
            </div>
          </form>

          <aside aria-label="Prévia e últimos cadastros" className="flex flex-col gap-4">
            <section aria-labelledby="titulo-previa" className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-(--color-text)" id="titulo-previa">
                Prévia no catálogo
              </h2>
              <CartaoEquipamento
                abreIndisponivel={false}
                item={{
                  patrimonio: patrimonio?.trim() || "TI-0000",
                  nome: nome?.trim() || "Nome do equipamento",
                  // Sem categoria escolhida, o select devolve "": a prévia usa a primeira.
                  categoria: categoria || "notebook",
                  imagemUrl: null,
                  disponibilidade: disponibilidadeDaSituacao(situacaoPrevia),
                }}
                semAcao
              />
            </section>
            <UltimosCadastros />
            <Link className="text-[12.5px]" href="/catalogo">
              Ver o catálogo
            </Link>
          </aside>
        </div>
      </ConteudoPagina>
    </>
  );
}
