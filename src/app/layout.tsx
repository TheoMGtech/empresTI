import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import type { ReactNode } from "react";

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

export default function LayoutRaiz({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body>
        <ProvedorTRPC>{children}</ProvedorTRPC>
      </body>
    </html>
  );
}
