import "@testing-library/jest-dom/vitest";

process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "chave-publica-de-teste-sem-credencial-real";
process.env.CHAVE_HMAC_LIMITES ??= "chave-hmac-de-teste-sem-valor-real-0123456789";
