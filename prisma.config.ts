import { defineConfig } from "prisma/config";

const urlDireta = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: urlDireta ? { url: urlDireta } : undefined,
});
