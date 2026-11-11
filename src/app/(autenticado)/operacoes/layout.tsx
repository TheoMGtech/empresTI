import type { ReactNode } from "react";

import { GuardaOperacoes } from "@/components/shell/guarda-operacoes";

export default function LayoutOperacoes({ children }: Readonly<{ children: ReactNode }>) {
  return <GuardaOperacoes>{children}</GuardaOperacoes>;
}
