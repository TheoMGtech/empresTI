"use client";

import { useState } from "react";

import { ICONE_CATEGORIA, type CategoriaCatalogo } from "@/components/catalogo/categorias";

type PropsMiniatura = { categoria: CategoriaCatalogo; imagemUrl: string | null };

/**
 * RF-CATALOGO-03: a fotografia de 40×40 ocupa o lugar do ícone. Sem ela, ou se não carregar, o
 * card usa o ícone da categoria. A imagem é decorativa: o nome do item está ao lado.
 */
export function MiniaturaEquipamento({ categoria, imagemUrl }: PropsMiniatura) {
  const [falhou, setFalhou] = useState(false);
  const Icone = ICONE_CATEGORIA[categoria];
  const usarFoto = Boolean(imagemUrl) && !falhou;

  return (
    <span
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-(--surface-sunken)"
      data-miniatura={usarFoto ? "foto" : "icone"}
    >
      {usarFoto ? (
        // O host do Storage vem da API; `next/image` exigiria configurar domínios no deploy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          height={40}
          loading="lazy"
          onError={() => setFalhou(true)}
          src={imagemUrl ?? undefined}
          width={40}
        />
      ) : (
        <Icone aria-hidden="true" className="text-(--accent-400)" size={20} />
      )}
    </span>
  );
}
