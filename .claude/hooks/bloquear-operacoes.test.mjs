// Testes do hook: node --test .claude/hooks/bloquear-operacoes.test.mjs
// Nenhum caso executa o comando analisado; rede e estado real são substituídos.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { analisarComando } from "./analisar-comando.mjs";

const pastaDoHook = dirname(fileURLToPath(import.meta.url));
const raiz = join(pastaDoHook, "..", "..");
const scripts = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8")).scripts;
const BASES_DE_PR = new Map([
  ["25", "main"],
  ["31", "develop"],
  ["40", "feature/outra"],
]);

function analisar(comando, { modo = "bash", ramo = "feature/teste" } = {}) {
  return analisarComando(comando, {
    modo,
    scripts,
    ramoAtual: () => ramo,
    consultarBasePr: (alvo) => BASES_DE_PR.get(alvo) ?? null,
  });
}

function deveBloquear(casos, opcoes) {
  for (const [nome, comando, modo] of casos) {
    it(`bloqueia: ${nome}`, () => {
      assert.notEqual(analisar(comando, { ...opcoes, modo: modo ?? "bash" }), null, comando);
    });
  }
}

function devePermitir(casos, opcoes) {
  for (const [nome, comando, modo] of casos) {
    it(`permite: ${nome}`, () => {
      assert.equal(analisar(comando, { ...opcoes, modo: modo ?? "bash" }), null, comando);
    });
  }
}

describe("P1 — formas equivalentes da mesma operação", () => {
  deveBloquear([
    ["background com &", "true & gh workflow run x.yml"],
    ["subshell", "(gh workflow run x.yml)"],
    ["substituição $()", "echo $(gh workflow run x.yml)"],
    ["substituição dentro de aspas", 'echo "$(gh workflow run x.yml)"'],
    ["crases", "echo `gh workflow run x.yml`"],
    ["bloco {}", "{ gh workflow run x.yml; }"],
    ["if/then", "if true; then gh workflow run x.yml; fi"],
    ["condição do if", "if gh workflow run x.yml; then echo ok; fi"],
    ["for/do", "for i in 1; do gh workflow run x.yml; done"],
    ["eval", 'eval "gh workflow run x.yml"'],
    ["eval dinâmico", 'eval "$CMD"'],
    ["xargs", "echo x.yml | xargs gh workflow run"],
    ["find -exec", "find . -exec gh workflow run x \\;"],
    ["nohup", "nohup gh workflow run x.yml"],
    ["nice com valor", "nice -n 5 gh workflow run x.yml"],
    ["env com flag", "env -u X gh workflow run x.yml"],
    ["timeout", "timeout 5 vercel deploy"],
    ["aspas no nome", 'g"h" workflow run x.yml'],
    ["barra no nome", "g\\h workflow run x.yml"],
    ["variável como programa", "G=gh; $G workflow run x.yml"],
    ["substituição como programa", "$(which gh) workflow run x.yml"],
    ["apóstrofo desbalanceado", "echo it's; gh workflow run x.yml"],
    ["bash -c", "bash -c 'gh workflow run x.yml'"],
    ["heredoc para bash", "bash <<'X'\ngh workflow run x.yml\nX"],
    ["here-string para bash", 'bash <<< "gh workflow run x.yml"'],
    ["texto em pipe para bash", "echo gh workflow run x.yml | bash"],
    ["cmd /c", "cmd /c gh workflow run x.yml"],
    ["node -e", "node -e \"require('child_process').execSync('gh workflow run x.yml')\""],
    ["node com heredoc", "node - <<'X'\nrequire('child_process')\nX"],
    ["python -c", "python -c \"import subprocess\""],
    ["curl para dispatch", "curl -X POST https://api.github.com/repos/a/b/actions/workflows/1/dispatches"],
    ["graphql merge", 'gh api graphql -f query="mutation{mergePullRequest(input:{pullRequestId:1}){clientMutationId}}"'],
    ["troca de base antes do merge", "gh pr edit 31 --base main; gh pr merge 31 --squash"],
    ["alias vc", "vc deploy --prod"],
    ["bunx", "bunx vercel deploy"],
    ["yarn dlx", "yarn dlx vercel deploy"],
    ["pnpm dlx", "pnpm dlx vercel deploy"],
    ["npm exec", "npm exec -- vercel deploy"],
    ["npx -p", "npx -p vercel vc deploy"],
    ["alias bash", "alias g=gh"],
    ["alias de git", "git -c alias.x='!gh workflow run y' x"],
    ["&gh", "&gh workflow run x.yml"],
  ]);
});

describe("P1 — formas equivalentes em PowerShell", () => {
  deveBloquear([
    ["operador de chamada", "& gh workflow run x.yml", "ps"],
    ["&gh", "&gh workflow run x.yml", "ps"],
    ["iex", 'iex "gh workflow run x.yml"', "ps"],
    ["Invoke-Expression", 'Invoke-Expression "gh workflow run x.yml"', "ps"],
    ["Start-Process", 'Start-Process gh -ArgumentList "workflow","run","x.yml"', "ps"],
    ["ForEach-Object", "1..3 | ForEach-Object { gh workflow run x.yml }", "ps"],
    ["atribuição", "$r = gh workflow run x.yml", "ps"],
    ["variável com &", "$g='gh'; & $g workflow run x.yml", "ps"],
    ["subexpressão", "Write-Output $(gh workflow run x.yml)", "ps"],
    ["crase no nome", "g`h workflow run x.yml", "ps"],
    ["bloco if", "if ($true) { gh workflow run x.yml }", "ps"],
    ["comando codificado", "powershell -EncodedCommand abc", "ps"],
    ["powershell -Command", 'powershell -Command "gh workflow run x.yml"', "ps"],
    ["Set-Alias", "Set-Alias g gh", "ps"],
    ["caminho com .exe", "C:/bin/vercel.exe env add X", "ps"],
    ["chamada à API", "Invoke-RestMethod -Method Post https://api.vercel.com/v13/deployments", "ps"],
  ]);
});

describe("P2 — operações reservadas ao responsável", () => {
  deveBloquear([
    ["disparar workflow", "gh workflow run migrate-production.yml -f confirmation=APPLY"],
    ["disparar workflow em outro repo", "gh -R TheoMGtech/empresTI workflow run x.yml"],
    ["dispatch pela API", "gh api repos/a/b/actions/workflows/1/dispatches -f ref=main"],
    ["habilitar workflow", "gh workflow enable x.yml"],
    ["reexecutar run", "gh run rerun 123"],
    ["merge em main", "gh pr merge 25 --squash"],
    ["merge com base não develop", "gh pr merge 40 --squash"],
    ["merge com base não confirmada", "gh pr merge 999 --squash"],
    ["merge com --admin", "gh pr merge 31 --admin"],
    ["merge pela API", "gh api repos/a/b/pulls/3/merge -X PUT"],
    ["merge de branches pela API", "gh api repos/a/b/merges -f base=main -f head=x"],
    ["PR sem base explícita", "gh pr create --title x --body y"],
    ["PR para main", "gh pr create --base main --title x"],
    ["trocar base", "gh pr edit 31 -B main"],
    ["remover proteção", "gh api -X DELETE repos/a/b/branches/main/protection"],
    ["método colado", "gh api -XPOST repos/a/b/issues"],
    ["criar Environment", "gh api -X PUT repos/a/b/environments/production"],
    ["segredo", "gh secret set X -b y"],
    ["variável do Actions", "gh variable set X -b y"],
    ["editar repositório", "gh repo edit --default-branch develop"],
    ["alias do gh", "gh alias set x 'workflow run'"],
    ["extensão do gh", "gh extension install a/b"],
    ["exibir token", "gh auth token"],
    ["status com token", "gh auth status --show-token"],
    ["vercel", "vercel --prod"],
    ["npx vercel", "npx vercel deploy"],
    ["vercel em node_modules", "node ./node_modules/vercel/dist/index.js deploy"],
    ["supabase", "supabase db push"],
    ["prisma:migrate", "npm run prisma:migrate -- --name x"],
    ["prisma:reset", "npm run prisma:reset"],
    ["migrate deploy", "npx prisma migrate deploy"],
    ["migrate pelo node", "node ./node_modules/prisma/build/index.js migrate deploy"],
    ["db push", "npx prisma db push"],
    ["push em main", "git push origin HEAD:main"],
    ["push em develop", "git push origin develop"],
    ["push apagando main", "git push origin :main"],
    ["push de tudo", "git push --all"],
    ["push com outro diretório", "git -C . push origin feature/x"],
    ["ler .env.local", "cat .env.local"],
    ["ler .env.local por node", "node -e \"console.log(require('fs').readFileSync('.env.local','utf8'))\""],
    ["ler .env.local em PowerShell", "Get-Content .env.local", "ps"],
    ["editar .mcp.json com sed", "sed -i s/read_only=true/read_only=false/ .mcp.json"],
    ["redirecionar para .mcp.json", "echo x > .mcp.json"],
    ["tee em .mcp.json", "echo x | tee .mcp.json"],
    ["escrever workflow", "Set-Content .github/workflows/a.yml x", "ps"],
    ["apagar .vercel", "rm -rf .vercel"],
  ]);

  it("bloqueia push sem refspec quando a branch atual é develop", () => {
    assert.notEqual(analisar("git push", { ramo: "develop" }), null);
  });

  it("bloqueia push de HEAD quando a branch atual é main", () => {
    assert.notEqual(analisar("git push origin HEAD", { ramo: "main" }), null);
  });

  it("bloqueia push quando a branch atual não é conhecida", () => {
    assert.notEqual(analisar("git push", { ramo: null }), null);
  });
});

describe("comandos legítimos continuam funcionando", () => {
  devePermitir([
    ["git status", "git status --short"],
    ["git diff --check", "git diff --check"],
    ["git log em pipe", "git log --oneline -3 2>&1 | head -n 5"],
    ["commit citando comando", 'git commit -m "docs: citar gh workflow run e vercel --prod"'],
    ["commit multilinha", 'git commit -m "a\nvercel b"'],
    ["commit por heredoc", "git commit -F - <<'X'\nvercel foi citado aqui\ngh workflow run x\nX"],
    ["echo de texto", 'echo "gh workflow run"'],
    ["comentário", "echo oi # gh workflow run x"],
    ["apóstrofo sem operação sensível", "echo it's"],
    ["push de feature", "git push -u origin feature/adaptar-claude-code"],
    ["push da branch atual", "git push"],
    ["npm run lint", "npm run lint"],
    ["npm run typecheck", "npm run typecheck"],
    ["npm test", "npm test"],
    ["npm run build", "npm run build"],
    ["npm run dev", "npm run dev"],
    ["npm run test:e2e", "npm run test:e2e"],
    ["prisma:generate", "npm run prisma:generate"],
    ["prisma pelo node", "node ./node_modules/prisma/build/index.js generate"],
    ["migrate status", "npx prisma migrate status"],
    ["teste do hook", 'node --test ".claude/hooks/bloquear-operacoes.test.mjs"'],
    ["node -e comum", 'node -e "console.log(process.env.NODE_ENV)"'],
    ["node --version", "node --version"],
    ["gh pr view", "gh pr view 31"],
    ["gh pr list", "gh pr list --state open --json number"],
    ["gh pr checks", "gh pr checks 31"],
    ["PR para develop", "gh pr create --base develop --title x --body y"],
    ["PR para develop com =", "gh pr create --base=develop --title x"],
    ["merge com base develop", "gh pr merge 31 --squash"],
    ["editar título do PR", "gh pr edit 31 --title novo"],
    ["gh run list", "gh run list --limit 3"],
    ["gh workflow list", "gh workflow list"],
    ["gh auth status", "gh auth status"],
    ["gh api de leitura", "gh api repos/a/b/branches/main/protection --jq .enforce_admins"],
    ["gh api com GET explícito", "gh api -X GET repos/a/b/environments"],
    ["curl na aplicação publicada", "curl -I https://empresti-self.vercel.app"],
    ["ler .env.example", "cat .env.example"],
    ["laço com git", 'for f in a b; do git diff --check -- "$f"; done'],
    ["condicional comum", "if true; then echo ok; fi"],
    ["docker", "docker version"],
  ]);

  devePermitir([
    ["commit com here-string", "git commit -m @'\nfix: don't break\nvercel citado\n'@", "ps"],
    ["atribuição comum", "$x = 1", "ps"],
    ["cmdlet em pipe", "Get-ChildItem -Force | Select-Object Name", "ps"],
    ["bloco if comum", "if (Test-Path x) { git status }", "ps"],
    ["chamada de programa com aspas", '& "C:\\Program Files\\App\\app.exe" arg', "ps"],
    ["gh pr view", "gh pr view 31", "ps"],
  ]);
});

describe("limites conhecidos, documentados e fora desta rodada", () => {
  devePermitir([
    ["script em arquivo não é inspecionado", "node script-local.mjs"],
    ["código montado em tempo de execução", "node -e \"require('child_'+'process')\""],
    ["escrita no próprio hook é o problema P6", "echo x > .claude/hooks/bloquear-operacoes.mjs"],
    ["git reset não é operação reservada", "git reset --hard HEAD~1"],
  ]);
});

describe("ponto de entrada do hook", () => {
  const hook = join(pastaDoHook, "bloquear-operacoes.mjs");
  const rodar = (entrada) =>
    spawnSync(process.execPath, [hook], { cwd: raiz, encoding: "utf8", input: entrada, timeout: 30_000 });
  const chamada = (comando, ferramenta = "Bash") =>
    JSON.stringify({ tool_name: ferramenta, tool_input: { command: comando } });

  it("sai com 2 e explica o motivo ao bloquear", () => {
    const resultado = rodar(chamada("gh workflow run x.yml"));
    assert.equal(resultado.status, 2);
    assert.match(resultado.stderr, /Bloqueado pelo hook do EmpresTI/);
  });

  it("sai com 0 em comando legítimo", () => {
    assert.equal(rodar(chamada("git status")).status, 0);
  });

  it("analisa a ferramenta de terminal como PowerShell", () => {
    assert.equal(rodar(chamada("g`h workflow run x.yml", "mcp__terminal__run_in_terminal")).status, 2);
  });

  it("sai com 2 quando a entrada é inválida", () => {
    assert.equal(rodar("nao-json").status, 2);
  });

  it("sai com 0 quando a ferramenta não traz comando", () => {
    assert.equal(rodar(JSON.stringify({ tool_name: "Monitor", tool_input: {} })).status, 0);
  });
});
