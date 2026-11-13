import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { NonceEstilos } from "@/components/seguranca/nonce-estilos";
import { CABECALHO_NONCE } from "@/server/seguranca/csp";
import { ProvedorTRPC } from "@/trpc/provedor";

import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EmpresTI",
  description: "Acesso ao sistema de empréstimo interno.",
};

export default async function LayoutRaiz({ children }: Readonly<{ children: ReactNode }>) {
  // Renderização por requisição: página pré-renderizada no build não recebe o nonce da CSP
  // (Spec 009, RF-SEG-01).
  await connection();
  // O nonce que o proxy gerou para esta requisição (T-SEG-04a); nenhum outro é gerado.
  const nonce = (await headers()).get(CABECALHO_NONCE) ?? "";

  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body>
        <NonceEstilos nonce={nonce} />
        <ProvedorTRPC>{children}</ProvedorTRPC>
      </body>
    </html>
  );
}
