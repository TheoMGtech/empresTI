import { Laptop, Monitor, Usb, VideoCamera, type Icon } from "@phosphor-icons/react";

import type { SaidasRouter } from "@/trpc/tipos";

export type ItemCatalogo = SaidasRouter["equipamentos"]["listar"]["itens"][number];
export type CategoriaCatalogo = ItemCatalogo["categoria"];
export type Disponibilidade = ItemCatalogo["disponibilidade"];

// Ícones do layout §5.11. Cabo usa `ph-usb`.
export const ICONE_CATEGORIA: Record<CategoriaCatalogo, Icon> = {
  notebook: Laptop,
  monitor: Monitor,
  cabo: Usb,
  camera: VideoCamera,
};

export const ROTULO_CATEGORIA: Record<CategoriaCatalogo, string> = {
  notebook: "Notebook",
  monitor: "Monitor",
  cabo: "Cabo",
  camera: "Câmera",
};
