// Postgres real e descartável para testes de integração (ADR-001 §8).
// Só aceita o container que ele mesmo sobe: nunca lê DATABASE_URL, DIRECT_URL ou arquivos .env.
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { GenericContainer, Wait } from "testcontainers";

export const IMAGEM_POSTGRES = "postgres:17.6-alpine";
export const PAPEL_DONO = "empresti_dono";

const PORTA_POSTGRES = 5432;
const SUPERUSUARIO = "postgres";
const BANCO_MODELO = "empresti_modelo";
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const PASTA_MIGRATIONS = fileURLToPath(new URL("../../prisma/migrations", import.meta.url));

export class ErroDockerIndisponivel extends Error {
  constructor() {
    super("Docker indisponível: os testes de banco real não podem ser ignorados. Inicie o Docker.");
    this.name = "ErroDockerIndisponivel";
  }
}

export class ErroHostNaoLocal extends Error {
  constructor() {
    super("O banco de teste precisa estar em host local.");
    this.name = "ErroHostNaoLocal";
  }
}

type ContainerIniciado = {
  getHost(): string;
  getMappedPort(porta: number): number;
  stop(): Promise<unknown>;
};

type FabricaContainer = (senha: string) => Promise<ContainerIniciado>;

export type BancoReal = {
  host: string;
  porta: number;
  /** Cria um banco novo, copiado do modelo com as migrations, e devolve a URL do papel dono. */
  criarBanco(): Promise<string>;
  encerrar(): Promise<void>;
};

export function garantirHostLocal(host: string) {
  if (!HOSTS_LOCAIS.has(host)) throw new ErroHostNaoLocal();
}

function subirContainer(senha: string): Promise<ContainerIniciado> {
  return new GenericContainer(IMAGEM_POSTGRES)
    .withEnvironment({ POSTGRES_USER: SUPERUSUARIO, POSTGRES_PASSWORD: senha })
    .withExposedPorts(PORTA_POSTGRES)
    .withTmpFs({ "/var/lib/postgresql/data": "rw" })
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();
}

async function comCliente<T>(url: string, acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

async function listarMigrations() {
  const entradas = await readdir(PASTA_MIGRATIONS, { withFileTypes: true });
  const pastas = entradas
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();

  return Promise.all(
    pastas.map((pasta) => readFile(path.join(PASTA_MIGRATIONS, pasta, "migration.sql"), "utf8")),
  );
}

// Reproduz o que a migration e os testes de RLS esperam encontrar no Supabase: os papéis
// `anon` e `authenticated`, com privilégios sobre as tabelas. Sem os privilégios, o teste
// pararia em "permissão negada" e não chegaria a exercitar a policy.
async function prepararPapeis(urlSuperusuario: string, senhaDono: string) {
  await comCliente(urlSuperusuario, async (cliente) => {
    await cliente.query("CREATE ROLE anon NOLOGIN");
    await cliente.query("CREATE ROLE authenticated NOLOGIN");
    await cliente.query(
      `CREATE ROLE ${PAPEL_DONO} LOGIN NOSUPERUSER CREATEDB PASSWORD '${senhaDono}'`,
    );
    await cliente.query(`GRANT anon, authenticated TO ${PAPEL_DONO}`);
    await cliente.query(`CREATE DATABASE ${BANCO_MODELO} OWNER ${PAPEL_DONO}`);
  });
}

async function prepararPrivilegios(urlSuperusuarioModelo: string) {
  await comCliente(urlSuperusuarioModelo, async (cliente) => {
    await cliente.query("GRANT USAGE ON SCHEMA public TO anon, authenticated");
    await cliente.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${PAPEL_DONO} IN SCHEMA public
       GRANT ALL ON TABLES TO anon, authenticated`,
    );
  });
}

async function aplicarMigrations(urlDonoModelo: string) {
  const migrations = await listarMigrations();
  await comCliente(urlDonoModelo, async (cliente) => {
    for (const sql of migrations) await cliente.query(sql);
  });
}

export async function iniciarBancoReal(
  fabrica: FabricaContainer = subirContainer,
): Promise<BancoReal> {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  const senhaSuperusuario = randomBytes(24).toString("hex");
  const senhaDono = randomBytes(24).toString("hex");

  let container: ContainerIniciado;
  try {
    container = await fabrica(senhaSuperusuario);
  } catch {
    // O erro original pode trazer detalhes do ambiente; a mensagem fixa basta para agir.
    throw new ErroDockerIndisponivel();
  }

  try {
    const host = container.getHost();
    garantirHostLocal(host);
    const porta = container.getMappedPort(PORTA_POSTGRES);

    const montarUrl = (usuario: string, senha: string, banco: string) =>
      `postgresql://${usuario}:${senha}@${host}:${porta}/${banco}`;
    const urlSuperusuario = (banco: string) => montarUrl(SUPERUSUARIO, senhaSuperusuario, banco);
    const urlDono = (banco: string) => montarUrl(PAPEL_DONO, senhaDono, banco);

    await prepararPapeis(urlSuperusuario(SUPERUSUARIO), senhaDono);
    await prepararPrivilegios(urlSuperusuario(BANCO_MODELO));
    await aplicarMigrations(urlDono(BANCO_MODELO));

    let sequencia = 0;

    return {
      host,
      porta,
      async criarBanco() {
        sequencia += 1;
        const nome = `empresti_teste_${sequencia}`;
        await comCliente(urlSuperusuario(SUPERUSUARIO), (cliente) =>
          cliente.query(`CREATE DATABASE ${nome} TEMPLATE ${BANCO_MODELO} OWNER ${PAPEL_DONO}`),
        );
        return urlDono(nome);
      },
      async encerrar() {
        await container.stop();
      },
    };
  } catch (erro) {
    await container.stop();
    throw erro;
  }
}
