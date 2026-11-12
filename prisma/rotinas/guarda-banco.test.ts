// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { type CodigoRecusa, ErroBancoNaoPermitido, garantirBancoPermitido } from "./guarda-banco";

// Valores fictícios: `.invalid` é reservado e nunca resolve.
const SENHA = "senha-ficticia-123";
const HOST_DIRETO = "db.exemplo.invalid";
const HOST_POOLER = "pooler.exemplo.invalid";
const url = (host: string, sufixo = "") => `postgresql://usuario:${SENHA}@${host}:5432/banco${sufixo}`;
const URL_LOCAL = url("localhost");
const URL_DIRETA = url(HOST_DIRETO);
const URL_POOLER = url(HOST_POOLER);
const confirmar = (hosts: string) => `--confirmar-remoto=${hosts}`;

function recusa(acao: () => unknown): ErroBancoNaoPermitido {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroBancoNaoPermitido) return erro;
    throw erro;
  }
  throw new Error("A guarda deveria ter recusado.");
}

function codigoDe(env: { DATABASE_URL?: string; DIRECT_URL?: string }, argumentos: string[] = []) {
  return recusa(() => garantirBancoPermitido({ env, argumentos })).codigo;
}

describe("destinos locais", () => {
  it.each([
    ["localhost", "localhost"],
    ["127.0.0.1", "127.0.0.1"],
    ["::1", "[::1]"],
    ["localhost em maiúsculas", "LOCALHOST"],
  ])("CA-DADOS-24 — aceita %s sem confirmação", (_nome, host) => {
    expect(garantirBancoPermitido({ env: { DIRECT_URL: url(host) }, argumentos: [] })).toEqual({
      tipo: "local",
    });
  });

  it("CA-DADOS-24 — aceita as duas URLs locais", () => {
    expect(
      garantirBancoPermitido({
        env: { DATABASE_URL: url("127.0.0.1"), DIRECT_URL: URL_LOCAL },
        argumentos: [],
      }),
    ).toEqual({ tipo: "local" });
  });

  it("CA-DADOS-24 — aceita o protocolo postgres e parâmetros de conexão conhecidos", () => {
    const valor = `postgres://usuario:${SENHA}@localhost:6543/banco?pgbouncer=true&connection_limit=1`;
    expect(garantirBancoPermitido({ env: { DATABASE_URL: valor }, argumentos: [] })).toEqual({
      tipo: "local",
    });
  });
});

describe("destinos remotos", () => {
  it.each([
    ["host remoto", HOST_DIRETO],
    ["IP externo", "203.0.113.10"],
    ["IP da rede interna", "10.0.0.5"],
    ["outro endereço de loopback", "127.0.0.2"],
    ["todas as interfaces", "0.0.0.0"],
    ["subdomínio imitando localhost", "localhost.exemplo.invalid"],
    ["prefixo imitando loopback", "127.0.0.1.exemplo.invalid"],
    ["host do Docker", "host.docker.internal"],
  ])("CA-DADOS-24 — recusa %s sem confirmação", (_nome, host) => {
    expect(codigoDe({ DIRECT_URL: url(host) })).toBe("REMOTO_SEM_CONFIRMACAO");
  });

  it("CA-DADOS-24 — não se engana com localhost no usuário da URL", () => {
    expect(codigoDe({ DIRECT_URL: `postgresql://localhost:${SENHA}@${HOST_DIRETO}/banco` })).toBe(
      "REMOTO_SEM_CONFIRMACAO",
    );
  });

  it("CA-DADOS-24 — aceita remoto com o host exato confirmado", () => {
    expect(
      garantirBancoPermitido({
        env: { DIRECT_URL: URL_DIRETA },
        argumentos: [confirmar(HOST_DIRETO)],
      }),
    ).toEqual({ tipo: "remoto" });
  });
});

describe("entradas inválidas", () => {
  it("CA-DADOS-24 — recusa quando nenhuma URL é informada", () => {
    expect(codigoDe({})).toBe("URL_AUSENTE");
  });

  it.each([
    ["vazia", ""],
    ["sem formato de URL", "nao-e-url"],
    ["protocolo http", `http://usuario:${SENHA}@localhost/banco`],
    ["sem host", "postgresql:///banco"],
    ["vários hosts", `postgresql://usuario:${SENHA}@localhost,${HOST_DIRETO}/banco`],
    ["host codificado", `postgresql://usuario:${SENHA}@local%68ost/banco`],
    ["espaço no início", ` ${URL_LOCAL}`],
    ["tabulação no host", `postgresql://usuario:${SENHA}@local\thost/banco`],
  ])("CA-DADOS-24 — recusa URL malformada: %s", (_nome, valor) => {
    expect(codigoDe({ DIRECT_URL: valor })).toBe("URL_MALFORMADA");
  });

  it.each(["host", "hostaddr", "service", "HOST", "parametro_desconhecido"])(
    "CA-DADOS-24 — recusa parâmetro que pode desviar o destino: %s",
    (parametro) => {
      expect(codigoDe({ DIRECT_URL: url("localhost", `?${parametro}=${HOST_DIRETO}`) })).toBe(
        "PARAMETRO_NAO_PERMITIDO",
      );
    },
  );

  it("CA-DADOS-24 — URL malformada não é salva pela outra URL válida", () => {
    expect(codigoDe({ DATABASE_URL: "nao-e-url", DIRECT_URL: URL_LOCAL })).toBe("URL_MALFORMADA");
  });
});

describe("parâmetros de confirmação", () => {
  it.each<[string, string[], CodigoRecusa]>([
    ["outro host", [confirmar("outro.exemplo.invalid")], "CONFIRMACAO_DIVERGENTE"],
    ["host parcial", [confirmar("exemplo.invalid")], "CONFIRMACAO_DIVERGENTE"],
    ["curinga", [confirmar("*")], "CONFIRMACAO_INVALIDA"],
    ["vazia", [confirmar("")], "CONFIRMACAO_INVALIDA"],
    ["sem valor", ["--confirmar-remoto"], "CONFIRMACAO_INVALIDA"],
    ["valor separado por espaço", ["--confirmar-remoto", HOST_DIRETO], "CONFIRMACAO_INVALIDA"],
    ["repetida", [confirmar(HOST_DIRETO), confirmar(HOST_DIRETO)], "CONFIRMACAO_INVALIDA"],
    ["lista com item vazio", [confirmar(`${HOST_DIRETO},`)], "CONFIRMACAO_INVALIDA"],
    ["opção parecida", ["--confirmar-remoto-sim"], "REMOTO_SEM_CONFIRMACAO"],
    ["argumento posicional", [HOST_DIRETO], "REMOTO_SEM_CONFIRMACAO"],
  ])("CA-DADOS-24 — recusa confirmação: %s", (_nome, argumentos, codigo) => {
    expect(codigoDe({ DIRECT_URL: URL_DIRETA }, argumentos)).toBe(codigo);
  });

  it("CA-DADOS-24 — recusa confirmação informada para destino local", () => {
    expect(codigoDe({ DIRECT_URL: URL_LOCAL }, [confirmar("localhost")])).toBe(
      "CONFIRMACAO_SEM_REMOTO",
    );
  });

  it("CA-DADOS-24 — não presume confirmação vinda do ambiente", () => {
    const env = {
      DIRECT_URL: URL_DIRETA,
      CONFIRMAR_REMOTO: HOST_DIRETO,
      EMPRESTI_CONFIRMAR_REMOTO: HOST_DIRETO,
    };
    expect(codigoDe(env)).toBe("REMOTO_SEM_CONFIRMACAO");
  });

  it("CA-DADOS-24 — o código não lê process.env nem process.argv", () => {
    const fonte = readFileSync(new URL("./guarda-banco.ts", import.meta.url), "utf8");
    expect(fonte).not.toMatch(/process\.(env|argv)/);
  });
});

describe("divergências entre URLs", () => {
  it.each([
    ["DATABASE_URL remota e DIRECT_URL local", URL_DIRETA, URL_LOCAL],
    ["DATABASE_URL local e DIRECT_URL remota", URL_LOCAL, URL_DIRETA],
  ])("CA-DADOS-24 — recusa %s", (_nome, DATABASE_URL, DIRECT_URL) => {
    expect(codigoDe({ DATABASE_URL, DIRECT_URL })).toBe("DESTINOS_DIVERGENTES");
  });

  it("CA-DADOS-24 — nem a confirmação libera mistura de local e remoto", () => {
    expect(
      codigoDe({ DATABASE_URL: URL_DIRETA, DIRECT_URL: URL_LOCAL }, [confirmar(HOST_DIRETO)]),
    ).toBe("DESTINOS_DIVERGENTES");
  });

  it("CA-DADOS-24 — com dois hosts remotos, confirmar só um é recusado", () => {
    expect(
      codigoDe({ DATABASE_URL: URL_POOLER, DIRECT_URL: URL_DIRETA }, [confirmar(HOST_DIRETO)]),
    ).toBe("CONFIRMACAO_DIVERGENTE");
  });

  it("CA-DADOS-24 — com dois hosts remotos, exige a confirmação de ambos", () => {
    expect(
      garantirBancoPermitido({
        env: { DATABASE_URL: URL_POOLER, DIRECT_URL: URL_DIRETA },
        argumentos: [confirmar(`${HOST_DIRETO},${HOST_POOLER}`)],
      }),
    ).toEqual({ tipo: "remoto" });
  });

  it("CA-DADOS-24 — confirmar um host a mais é recusado", () => {
    expect(
      codigoDe({ DIRECT_URL: URL_DIRETA }, [confirmar(`${HOST_DIRETO},${HOST_POOLER}`)]),
    ).toBe("CONFIRMACAO_DIVERGENTE");
  });
});

describe("sigilo das mensagens", () => {
  it.each<[string, { DATABASE_URL?: string; DIRECT_URL?: string }, string[]]>([
    ["remoto sem confirmação", { DIRECT_URL: URL_DIRETA }, []],
    ["confirmação errada", { DIRECT_URL: URL_DIRETA }, [confirmar("outro.exemplo.invalid")]],
    ["divergência", { DATABASE_URL: URL_DIRETA, DIRECT_URL: URL_LOCAL }, []],
    ["URL malformada", { DIRECT_URL: `http://usuario:${SENHA}@${HOST_DIRETO}` }, []],
    ["URL inválida", { DIRECT_URL: `postgresql://usuario:${SENHA}@[host/banco` }, []],
    ["parâmetro", { DIRECT_URL: url(HOST_DIRETO, "?host=x") }, []],
  ])("CA-DADOS-24 — não expõe dados da conexão: %s", (_nome, env, argumentos) => {
    const erro = recusa(() => garantirBancoPermitido({ env, argumentos }));
    const texto = `${erro.message} ${erro.stack ?? ""} ${String(erro.cause ?? "")}`;

    expect(texto).not.toContain(SENHA);
    expect(texto).not.toContain("usuario");
    expect(texto).not.toContain(HOST_DIRETO);
  });
});

describe("execução", () => {
  it("CA-DADOS-24 — o módulo roda com node, sem transpilador", () => {
    const arquivo = fileURLToPath(new URL("./guarda-banco.ts", import.meta.url));
    const { status } = spawnSync(process.execPath, [arquivo], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      timeout: 15_000,
    });

    expect(status).toBe(0);
  });
});
