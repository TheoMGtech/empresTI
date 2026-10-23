import { z } from "zod";

const esquemaPublico = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((url) => url.endsWith(".supabase.co"), {
    message: "NEXT_PUBLIC_SUPABASE_URL deve apontar para um projeto Supabase.",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const esquemaServidor = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  SUPABASE_PROJECT_REF: z.string().regex(/^[a-z]{20}$/),
});

const esquemaBanco = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://"),
});

export function lerAmbientePublico() {
  return esquemaPublico.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wdudlqacomnasnrxgbni.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function lerAmbienteServidor() {
  return esquemaServidor.parse({
    NODE_ENV: process.env.NODE_ENV ?? "development",
    SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF ?? "wdudlqacomnasnrxgbni",
  });
}

export function lerAmbienteBanco() {
  return esquemaBanco.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}
