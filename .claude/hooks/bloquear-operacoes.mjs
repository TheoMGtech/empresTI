// Ponto de entrada do hook PreToolUse. A decisão fica em analisar-comando.mjs; aqui só se
// lê a chamada da ferramenta e se consulta o estado real. Na dúvida, o comando é barrado.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { analisarComando } from "./analisar-comando.mjs";

const FERRAMENTAS_POWERSHELL = new Set(["PowerShell", "mcp__terminal__run_in_terminal"]);

function bloquear(motivo) {
  process.stderr.write(`Bloqueado pelo hook do EmpresTI: ${motivo} Ver rules/restrictions.md.\n`);
  process.exit(2);
}

function executar(programa, argumentos, raiz) {
  return execFileSync(programa, argumentos, {
    cwd: raiz,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 15_000,
  }).trim();
}

function consultarBasePr(raiz, alvo, repositorio) {
  try {
    return executar(
      "gh",
      [
        "pr",
        "view",
        ...(alvo ? [alvo] : []),
        ...(repositorio ? ["--repo", repositorio] : []),
        "--json",
        "baseRefName",
        "-q",
        ".baseRefName",
      ],
      raiz,
    );
  } catch {
    return null;
  }
}

function ramoAtual(raiz) {
  try {
    return executar("git", ["rev-parse", "--abbrev-ref", "HEAD"], raiz);
  } catch {
    return null;
  }
}

function lerScripts(raiz) {
  try {
    return JSON.parse(readFileSync(join(raiz, "package.json"), "utf8")).scripts ?? {};
  } catch {
    return {};
  }
}

process.stdin.setEncoding("utf8");
let bruto = "";
for await (const parte of process.stdin) {
  bruto += parte;
}

try {
  const entrada = JSON.parse(bruto);
  const comando = entrada.tool_input?.command;

  if (typeof comando === "string" && comando.trim() !== "") {
    const raiz = entrada.cwd ?? process.cwd();
    const motivo = analisarComando(comando, {
      modo: FERRAMENTAS_POWERSHELL.has(entrada.tool_name) ? "ps" : "bash",
      scripts: lerScripts(raiz),
      consultarBasePr: (alvo, repositorio) => consultarBasePr(raiz, alvo, repositorio),
      ramoAtual: () => ramoAtual(raiz),
    });

    if (motivo) bloquear(motivo);
  }
} catch {
  bloquear("não foi possível analisar o comando.");
}
