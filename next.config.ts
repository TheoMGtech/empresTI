import type { NextConfig } from "next";

import { cabecalhosFixos } from "./src/server/seguranca/cabecalhos";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  // Cabeçalhos fixos de segurança (Spec 009, RF-SEG-04 e RF-SEG-05). A CSP com nonce é do proxy.
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosFixos(process.env.VERCEL_ENV) }];
  },
};

export default nextConfig;
