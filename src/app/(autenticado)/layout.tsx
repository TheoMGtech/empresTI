import type { ReactNode } from "react";

import { AreaAutenticada } from "@/components/shell/area-autenticada";

export default function LayoutAutenticado({ children }: Readonly<{ children: ReactNode }>) {
  return <AreaAutenticada>{children}</AreaAutenticada>;
}
