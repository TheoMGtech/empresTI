// Decide se um comando de shell toca operações que rules/restrictions.md reserva ao
// responsável. A estratégia é conservadora: subcomandos sensíveis usam lista fechada, e o
// que não dá para analisar estaticamente é bloqueado quando há sinal de operação sensível.
// É uma camada de proteção, não um isolamento: código gerado em tempo de execução ou um
// script em arquivo escapam desta análise, e o Windows nativo não tem sandbox.

const LIMITE_DE_ANINHAMENTO = 8;

const SHELLS_BASH = new Set(["bash", "sh", "zsh", "dash"]);
const SHELLS_POWERSHELL = new Set(["pwsh", "powershell"]);
const AVALIADORES = new Set(["eval", "iex", "invoke-expression", "invoke-command", "icm"]);
const DEFINIDORES_DE_ALIAS = new Set(["alias", "set-alias", "new-alias", "sal", "nal"]);
const INTERPRETADORES = new Set([
  "node",
  "nodejs",
  "python",
  "python3",
  "py",
  "ruby",
  "perl",
  "php",
  "deno",
  "bun",
  "tsx",
  "ts-node",
]);
const LANCADORES = new Set([
  "nohup",
  "nice",
  "ionice",
  "timeout",
  "command",
  "builtin",
  "exec",
  "env",
  "sudo",
  "doas",
  "stdbuf",
  "setsid",
  "xargs",
  "parallel",
  "watch",
  "find",
  "start",
  "start-process",
  "saps",
  "start-job",
  "sajb",
  "start-threadjob",
  "call",
  "runas",
  "npx",
  "pnpx",
  "bunx",
]);
const GERENCIADORES = new Set(["npm", "pnpm", "yarn"]);
const CLIENTES_HTTP = new Set([
  "curl",
  "wget",
  "iwr",
  "irm",
  "invoke-webrequest",
  "invoke-restmethod",
  "http",
  "https",
  "aria2c",
]);
const MUTADORES = new Set([
  "tee",
  "rm",
  "del",
  "erase",
  "ri",
  "rd",
  "rmdir",
  "remove-item",
  "mv",
  "move",
  "move-item",
  "cp",
  "copy",
  "copy-item",
  "set-content",
  "sc",
  "add-content",
  "ac",
  "clear-content",
  "out-file",
  "new-item",
  "ni",
  "rename-item",
  "ren",
  "truncate",
  "chmod",
  "ln",
]);
const SOMENTE_DADOS = new Set(["git", "echo", "printf", "write-output", "write-host"]);
const PALAVRAS_DE_CONTROLE = new Set([
  "!",
  "if",
  "then",
  "elif",
  "elseif",
  "else",
  "fi",
  "do",
  "done",
  "while",
  "until",
  "esac",
  "time",
  "try",
  "catch",
  "finally",
  "return",
  "throw",
]);
const CABECALHOS = new Set(["for", "foreach", "select", "case", "switch", "function"]);

const GH_LIBERADO = new Map([
  ["pr", new Set(["view", "list", "status", "checks", "diff", "create", "merge", "edit", "ready", "comment"])],
  ["run", new Set(["list", "view", "watch"])],
  ["workflow", new Set(["list", "view"])],
  ["repo", new Set(["view"])],
  ["issue", new Set(["list", "view"])],
  ["release", new Set(["list", "view"])],
  ["auth", new Set(["status"])],
]);
const GH_SEM_ACAO = new Set(["version", "--version", "help", "--help", "status", "search"]);
const GH_FLAGS_COM_VALOR_NO_MERGE = new Set([
  "-t",
  "--subject",
  "-b",
  "--body",
  "-F",
  "--body-file",
  "-A",
  "--author-email",
  "--match-head-commit",
]);
const PRISMA_LIBERADO = new Set(["generate", "validate", "format", "version"]);
const BRANCHES_PROTEGIDAS = new Set(["main", "develop"]);

const HOSTS_RESERVADOS =
  /api\.github\.com|uploads\.github\.com|api\.vercel\.com|api\.supabase\.com|\.supabase\.co/i;
const VOCABULARIO_SENSIVEL = [
  /(?<![\w.-])(?:gh|vc|vercel|supabase)(?:\.exe)?(?![\w-])/i,
  /prisma[\s'",]+(?:migrate|db)\b/i,
  HOSTS_RESERVADOS,
  /child_process|subprocess|os\.system|Deno\.Command|Bun\.spawn/i,
  /base64/i,
  /\.mcp\.json|\.github[\\/]workflows|\.env\.local|GH_TOKEN|GITHUB_TOKEN|VERCEL_(?:OIDC_)?TOKEN/i,
  /['"\\/]\.env(?!\.example)(?:\.[\w.-]+)?['"]/i,
];

class Bloqueio extends Error {}

function bloquear(motivo) {
  throw new Bloqueio(motivo);
}

function mencionaSensivel(texto) {
  return VOCABULARIO_SENSIVEL.some((padrao) => padrao.test(texto));
}

function ehArquivoDeCredencial(palavra) {
  return /(^|[\\/=])\.env(\.(?!example$)[\w.-]+)?$/i.test(palavra);
}

function ehConfiguracaoDeProducao(palavra) {
  return /(^|[\\/=])(\.mcp\.json$|\.vercel([\\/]|$)|\.github[\\/]workflows([\\/]|$))/i.test(palavra);
}

function nomePrograma(palavra) {
  return palavra
    .split(/[\\/]/)
    .pop()
    .toLowerCase()
    .replace(/\.(exe|cmd|bat|ps1)$/, "");
}

function fimDeParenteses(texto, inicio) {
  let nivel = 1;
  let aspa = null;

  for (let i = inicio; i < texto.length; i += 1) {
    const caractere = texto[i];

    if (aspa) {
      if (caractere === "\\" && aspa === '"') i += 1;
      else if (caractere === aspa) aspa = null;
    } else if (caractere === '"' || caractere === "'") {
      aspa = caractere;
    } else if (caractere === "(") {
      nivel += 1;
    } else if (caractere === ")") {
      nivel -= 1;
      if (nivel === 0) return i;
    }
  }

  return -1;
}

function novoComando(chamada) {
  return { palavras: [], redirecoes: [], entradas: [], chamada };
}

// Separa o texto em comandos simples, tirando aspas e escapes como o shell faria.
// Substituições viram trechos aninhados; corpos de heredoc ficam como entrada do comando.
function lerComandos(texto, modo) {
  const comandos = [];
  const aninhados = [];
  let pendentes = [];
  let balanceado = true;
  let atual = novoComando(false);
  let palavra = null;
  let destino = null;

  const acrescentar = (trecho) => {
    palavra = (palavra ?? "") + trecho;
  };

  const fecharPalavra = () => {
    if (palavra === null) return;
    if (destino === "redirecao") atual.redirecoes.push(palavra);
    else if (destino === "hereString") atual.entradas.push({ corpo: palavra });
    else atual.palavras.push(palavra);
    palavra = null;
    destino = null;
  };

  const fecharComando = (chamada = false) => {
    fecharPalavra();
    destino = null;
    if (atual.palavras.length + atual.redirecoes.length + atual.entradas.length > 0) {
      comandos.push(atual);
    }
    atual = novoComando(chamada);
  };

  const lerHeredocs = (posicaoDaQuebra) => {
    let posicao = posicaoDaQuebra + 1;

    for (const heredoc of pendentes) {
      const linhas = [];
      let achou = false;

      while (posicao < texto.length) {
        const fim = texto.indexOf("\n", posicao);
        const linha = texto.slice(posicao, fim < 0 ? texto.length : fim).replace(/\r$/, "");
        posicao = fim < 0 ? texto.length : fim + 1;
        const comparada = heredoc.indentado ? linha.replace(/^\t+/, "") : linha;
        if (comparada === heredoc.delimitador) {
          achou = true;
          break;
        }
        linhas.push(linha);
      }

      if (!achou) balanceado = false;
      heredoc.corpo = linhas.join("\n");
    }

    pendentes = [];
    return posicao - 1;
  };

  const lerAspasDuplas = (inicio) => {
    let j = inicio + 1;
    let conteudo = "";

    while (j < texto.length) {
      const c = texto[j];
      const seguinte = texto[j + 1];

      if (modo === "bash" && c === "\\" && seguinte !== undefined && '"\\$`\n'.includes(seguinte)) {
        conteudo += seguinte;
        j += 2;
      } else if (modo === "ps" && c === "`" && seguinte !== undefined) {
        conteudo += seguinte;
        j += 2;
      } else if (modo === "ps" && c === '"' && seguinte === '"') {
        conteudo += '"';
        j += 2;
      } else if (c === '"') {
        acrescentar(conteudo);
        return j;
      } else if (c === "$" && seguinte === "(") {
        const fim = fimDeParenteses(texto, j + 2);
        if (fim < 0) break;
        aninhados.push(texto.slice(j + 2, fim));
        conteudo += "$(…)";
        j = fim + 1;
      } else if (modo === "bash" && c === "`") {
        const fim = texto.indexOf("`", j + 1);
        if (fim < 0) break;
        aninhados.push(texto.slice(j + 1, fim));
        conteudo += "$(…)";
        j = fim + 1;
      } else {
        conteudo += c;
        j += 1;
      }
    }

    balanceado = false;
    acrescentar(conteudo);
    return texto.length;
  };

  const lerAspasSimples = (inicio) => {
    let j = inicio + 1;
    let conteudo = "";

    while (true) {
      const fim = texto.indexOf("'", j);
      if (fim < 0) {
        balanceado = false;
        acrescentar(conteudo + texto.slice(j));
        return texto.length;
      }
      conteudo += texto.slice(j, fim);
      if (modo === "ps" && texto[fim + 1] === "'") {
        conteudo += "'";
        j = fim + 2;
      } else {
        acrescentar(conteudo);
        return fim;
      }
    }
  };

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    const seguinte = texto[i + 1];

    if (modo === "bash" && c === "\\") {
      if (seguinte === "\r" && texto[i + 2] === "\n") i += 2;
      else {
        if (seguinte !== undefined && seguinte !== "\n") acrescentar(seguinte);
        i += 1;
      }
    } else if (modo === "ps" && c === "`") {
      if (seguinte !== undefined && seguinte !== "\n" && seguinte !== "\r") acrescentar(seguinte);
      i += 1;
    } else if (
      modo === "ps" &&
      c === "@" &&
      (seguinte === "'" || seguinte === '"') &&
      /^[ \t]*\r?\n/.test(texto.slice(i + 2))
    ) {
      const fim = texto.indexOf(`\n${seguinte}@`, i + 2);
      if (fim < 0) {
        balanceado = false;
        acrescentar(texto.slice(i + 2));
        break;
      }
      acrescentar(texto.slice(i + 2, fim));
      i = fim + 2;
    } else if (c === "'") {
      i = lerAspasSimples(i);
    } else if (c === '"') {
      i = lerAspasDuplas(i);
    } else if (c === "$" && seguinte === "(") {
      const fim = fimDeParenteses(texto, i + 2);
      if (fim < 0) {
        balanceado = false;
        break;
      }
      aninhados.push(texto.slice(i + 2, fim));
      acrescentar("$(…)");
      i = fim;
    } else if (modo === "bash" && (c === "<" || c === ">") && seguinte === "(") {
      const fim = fimDeParenteses(texto, i + 2);
      if (fim < 0) {
        balanceado = false;
        break;
      }
      aninhados.push(texto.slice(i + 2, fim));
      fecharPalavra();
      i = fim;
    } else if (modo === "bash" && c === "`") {
      const fim = texto.indexOf("`", i + 1);
      if (fim < 0) {
        balanceado = false;
        break;
      }
      aninhados.push(texto.slice(i + 1, fim));
      acrescentar("$(…)");
      i = fim;
    } else if (c === "#" && palavra === null) {
      const fim = texto.indexOf("\n", i);
      if (fim < 0) break;
      i = fim - 1;
    } else if (modo === "bash" && c === "<" && seguinte === "<") {
      fecharPalavra();
      if (texto[i + 2] === "<") {
        destino = "hereString";
        i += 2;
      } else {
        const achado = /^<<-?[ \t]*(?:'([^']*)'|"([^"]*)"|\\?([^\s;|&<>()]+))/.exec(texto.slice(i));
        if (achado) {
          const heredoc = {
            delimitador: achado[1] ?? achado[2] ?? achado[3],
            indentado: texto[i + 2] === "-",
            corpo: "",
          };
          atual.entradas.push(heredoc);
          pendentes.push(heredoc);
          i += achado[0].length - 1;
        } else {
          i += 1;
        }
      }
    } else if (c === ">" || (c === "&" && seguinte === ">")) {
      if (palavra !== null && /^\d+$/.test(palavra)) palavra = null;
      else fecharPalavra();
      let j = c === "&" ? i + 2 : i + 1;
      if (texto[j] === ">") j += 1;
      if (texto[j] === "&") {
        j += 1;
        if (/[\d-]/.test(texto[j] ?? "")) j += 1;
      } else {
        destino = "redirecao";
      }
      i = j - 1;
    } else if (c === "<") {
      fecharPalavra();
    } else if ((c === "&" && seguinte === "&") || (c === "|" && seguinte === "|")) {
      fecharComando();
      i += 1;
    } else if (c === "&") {
      fecharComando(modo === "ps");
    } else if (c === ";" || c === "|" || c === "(" || c === ")") {
      fecharComando();
    } else if (
      (c === "{" || c === "}") &&
      (modo === "ps" ? !(palavra ?? "").endsWith("$") : palavra === null)
    ) {
      fecharComando();
    } else if (c === "\n") {
      fecharComando();
      if (pendentes.length > 0) i = lerHeredocs(i);
    } else if (/\s/.test(c)) {
      fecharPalavra();
    } else {
      acrescentar(c);
    }
  }

  fecharComando();
  return { comandos, aninhados, balanceado };
}

function limparPrefixos(palavras, modo) {
  let restantes = [...palavras];

  while (restantes.length > 0) {
    const primeira = restantes[0];

    if (modo === "ps") {
      if (/^\$[\w:.]+$/.test(primeira) && /^[+\-*/]?=$/.test(restantes[1] ?? "")) {
        restantes = restantes.slice(2);
        continue;
      }
      const atribuicao = /^\$[\w:.]+=(.+)$/.exec(primeira);
      if (atribuicao) {
        restantes = [atribuicao[1], ...restantes.slice(1)];
        continue;
      }
    } else if (/^[A-Za-z_]\w*\+?=/.test(primeira)) {
      restantes = restantes.slice(1);
      continue;
    }

    const chave = primeira.toLowerCase();
    if (CABECALHOS.has(chave)) return [];
    if (!PALAVRAS_DE_CONTROLE.has(chave)) break;
    restantes = restantes.slice(1);
  }

  return restantes;
}

function valorDaFlag(argumentos, curta, longa) {
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (argumento === curta || argumento === longa) return argumentos[i + 1] ?? "";
    if (argumento.startsWith(`${longa}=`)) return argumento.slice(longa.length + 1);
    if (argumento.startsWith(curta) && !argumento.startsWith("--")) return argumento.slice(curta.length);
  }
  return null;
}

function extrairRepositorio(argumentos) {
  const restantes = [];
  let repositorio = null;

  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (argumento === "-R" || argumento === "--repo") {
      repositorio = argumentos[i + 1] ?? null;
      i += 1;
    } else if (argumento.startsWith("--repo=")) {
      repositorio = argumento.slice("--repo=".length);
    } else {
      restantes.push(argumento);
    }
  }

  return { repositorio, restantes };
}

function analisarMergeDePr(argumentos, repositorio, contexto) {
  if (argumentos.includes("--admin")) {
    bloquear("merge com --admin contorna a proteção da branch.");
  }

  let alvo = null;
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (GH_FLAGS_COM_VALOR_NO_MERGE.has(argumento)) {
      i += 1;
    } else if (!argumento.startsWith("-")) {
      alvo = argumento;
      break;
    }
  }

  const base = contexto.consultarBasePr(alvo, repositorio);
  if (base === "main") bloquear("merge em main é exclusivo do responsável.");
  if (base !== "develop") bloquear("o agente só faz merge de PR com base em develop, e a base não foi confirmada.");
}

function analisarGhApi(argumentos) {
  if (argumentos.includes("graphql")) {
    bloquear("gh api graphql pode executar mutação e não é analisável aqui.");
  }

  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];

    if (argumento === "-X" || argumento === "--method") {
      if ((argumentos[i + 1] ?? "").toUpperCase() !== "GET") bloquear("gh api só é liberado com GET.");
      i += 1;
    } else {
      const metodo = /^(?:-X|--method=)(.+)$/.exec(argumento);
      if (metodo && metodo[1].toUpperCase() !== "GET") bloquear("gh api só é liberado com GET.");
      if (/^-[fF]|^--(?:field|raw-field|input)(?:=|$)/.test(argumento)) {
        bloquear("gh api com campos ou corpo faz escrita e é do responsável.");
      }
    }
  }
}

function analisarGh(argumentos, contexto) {
  const { repositorio, restantes } = extrairRepositorio(argumentos);
  const [grupo, acao, ...resto] = restantes;

  if (grupo === undefined || GH_SEM_ACAO.has(grupo)) return;
  if (grupo === "api") {
    analisarGhApi(restantes.slice(1));
    return;
  }

  if (!GH_LIBERADO.get(grupo)?.has(acao)) {
    bloquear(`gh ${grupo} ${acao ?? ""} não está na lista de operações liberadas ao agente.`.replace("  ", " "));
  }

  if (grupo === "auth" && resto.some((item) => item === "-t" || item === "--show-token")) {
    bloquear("exibir o token do GitHub não é liberado.");
  }

  if (grupo === "pr" && acao === "create" && valorDaFlag(resto, "-B", "--base") !== "develop") {
    bloquear("o agente só abre PR com --base develop explícito.");
  }

  if (grupo === "pr" && acao === "edit" && valorDaFlag(resto, "-B", "--base") !== null) {
    bloquear("trocar a base de um PR é do responsável.");
  }

  if (grupo === "pr" && acao === "merge") {
    analisarMergeDePr(resto, repositorio, contexto);
  }
}

function analisarPrisma(argumentos) {
  const posicionais = argumentos.filter((item) => !item.startsWith("-"));
  const [comando, subcomando] = posicionais;

  if (comando === undefined || PRISMA_LIBERADO.has(comando)) return;
  if (comando === "migrate" && subcomando === "status") return;

  bloquear("comando Prisma que altera banco; siga rules/migration.md e pare até existir banco local.");
}

function destinoDoRefspec(refspec, contexto) {
  const destino = refspec.replace(/^\+/, "").split(":").pop().replace(/^refs\/heads\//, "");
  return destino === "HEAD" ? contexto.ramoAtual() : destino;
}

function analisarPush(argumentos, contextoAlternativo, contexto) {
  if (contextoAlternativo) bloquear("push com outro diretório impede conferir a branch de destino.");
  if (argumentos.some((item) => item === "--all" || item === "--mirror")) {
    bloquear("push de todas as branches alcança main e develop.");
  }

  const posicionais = [];
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (argumento === "-o" || argumento === "--push-option") i += 1;
    else if (!argumento.startsWith("-")) posicionais.push(argumento);
  }

  const refspecs = posicionais.slice(1);
  const destinos =
    refspecs.length > 0 ? refspecs.map((item) => destinoDoRefspec(item, contexto)) : [contexto.ramoAtual()];

  for (const destino of destinos) {
    if (!destino) bloquear("não foi possível confirmar a branch de destino do push.");
    if (BRANCHES_PROTEGIDAS.has(destino)) bloquear(`push direto em ${destino} não é permitido.`);
  }
}

function analisarGit(argumentos, contexto) {
  let i = 0;
  let contextoAlternativo = false;

  while (i < argumentos.length && argumentos[i].startsWith("-")) {
    const argumento = argumentos[i];
    if (argumento === "-c" || argumento === "--config-env") {
      if (/^alias\./i.test(argumentos[i + 1] ?? "")) bloquear("alias de git na linha de comando não é analisável.");
      i += 2;
    } else if (argumento === "-C" || argumento === "--git-dir" || argumento === "--work-tree") {
      contextoAlternativo = true;
      i += 2;
    } else {
      if (/^--(?:git-dir|work-tree)=/.test(argumento)) contextoAlternativo = true;
      i += 1;
    }
  }

  const subcomando = argumentos[i];
  const resto = argumentos.slice(i + 1);

  if (subcomando === "config" && resto.some((item) => /^alias\./i.test(item)) && mencionaSensivel(resto.join(" "))) {
    bloquear("alias de git para operação sensível não é permitido.");
  }

  if (subcomando === "push") analisarPush(resto, contextoAlternativo, contexto);
}

function analisarArquivos(nome, argumentos) {
  if (!SOMENTE_DADOS.has(nome) && argumentos.some(ehArquivoDeCredencial)) {
    bloquear("acesso a arquivo de credenciais pelo shell não é permitido.");
  }

  const sedNoLugar =
    nome === "sed" && argumentos.some((item) => /^-[a-zA-Z]*i/.test(item) || item.startsWith("--in-place"));

  if ((MUTADORES.has(nome) || sedNoLugar) && argumentos.some(ehConfiguracaoDeProducao)) {
    bloquear("alterar configuração de produção é do responsável.");
  }
}

function analisarShell(nome, argumentos, comando, contexto, nivel) {
  const powershell = SHELLS_POWERSHELL.has(nome);
  const cmd = nome === "cmd";

  if (powershell && argumentos.some((item) => /^-(?:e|ec|enc|encodedcommand)$/i.test(item))) {
    bloquear("comando codificado não é analisável.");
  }

  const indice = argumentos.findIndex((item) => {
    if (cmd) return /^\/[ck]$/i.test(item);
    if (powershell) return /^-c(?:ommand)?$/i.test(item);
    return /^-[a-z]*c[a-z]*$/.test(item);
  });
  const modo = powershell || cmd ? "ps" : "bash";

  if (indice >= 0) {
    const interno = argumentos.slice(indice + 1).join(" ");
    analisarTexto(cmd ? interno.replaceAll("^", "") : interno, { ...contexto, modo }, nivel + 1);
    return;
  }

  for (const entrada of comando.entradas) {
    analisarTexto(entrada.corpo, { ...contexto, modo }, nivel + 1);
  }

  const temScript = argumentos.some((item) => !item.startsWith("-"));
  if (!temScript && comando.entradas.length === 0 && mencionaSensivel(contexto.textoCompleto)) {
    bloquear("texto com operação sensível enviado a um shell não é analisável.");
  }
}

function analisarInterpretador(argumentos, comando, contexto, nivel) {
  const trechos = comando.entradas.map((entrada) => entrada.corpo);
  let indiceDoScript = -1;

  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (/^(?:-e|--eval|-p|--print|-pe|-c|-r|-E|--exec|eval)$/.test(argumento) && argumentos[i + 1] !== undefined) {
      trechos.push(argumentos[i + 1]);
      i += 1;
    } else if (/^--(?:eval|print)=/.test(argumento)) {
      trechos.push(argumento.slice(argumento.indexOf("=") + 1));
    } else if (!argumento.startsWith("-")) {
      indiceDoScript = i;
      break;
    }
  }

  if (trechos.some(mencionaSensivel)) {
    bloquear("código embutido com operação sensível ou execução de processo não é permitido.");
  }

  if (indiceDoScript >= 0) {
    const pacote = /node_modules[\\/](?:\.bin[\\/])?(prisma|vercel|supabase)(?:[\\/]|$)/i.exec(
      argumentos[indiceDoScript],
    );
    if (pacote) {
      analisarPrograma(pacote[1].toLowerCase(), argumentos.slice(indiceDoScript + 1), comando, contexto, nivel + 1);
    }
    return;
  }

  if (trechos.length === 0 && mencionaSensivel(contexto.textoCompleto)) {
    bloquear("texto com operação sensível enviado a um interpretador não é analisável.");
  }
}

function programaRelevante(nome) {
  return (
    SHELLS_BASH.has(nome) ||
    SHELLS_POWERSHELL.has(nome) ||
    nome === "cmd" ||
    AVALIADORES.has(nome) ||
    INTERPRETADORES.has(nome) ||
    CLIENTES_HTTP.has(nome) ||
    ["gh", "vercel", "vc", "supabase", "prisma", "git"].includes(nome)
  );
}

function analisarLancador(argumentos, comando, contexto, nivel) {
  const indice = argumentos.findIndex((item) => programaRelevante(nomePrograma(item)));
  if (indice >= 0) {
    analisarPrograma(nomePrograma(argumentos[indice]), argumentos.slice(indice + 1), comando, contexto, nivel + 1);
  }
}

function analisarGerenciador(nome, argumentos, comando, contexto, nivel) {
  const posicionais = argumentos.filter((item) => !item.startsWith("-"));
  const [subcomando, segundo] = posicionais;

  if (subcomando === undefined) return;

  if (["exec", "x", "dlx"].includes(subcomando)) {
    analisarLancador(argumentos.slice(argumentos.indexOf(subcomando) + 1), comando, contexto, nivel);
    return;
  }

  let script = null;
  if (["run", "run-script", "rum", "urn"].includes(subcomando)) script = segundo;
  else if (nome !== "npm") script = subcomando;
  else if (subcomando === "t" || subcomando === "tst" || subcomando === "test") script = "test";
  else if (["start", "stop", "restart"].includes(subcomando)) script = subcomando;

  const corpo = script ? contexto.scripts?.[script] : undefined;
  if (typeof corpo === "string") analisarTexto(corpo, { ...contexto, modo: "bash" }, nivel + 1);
}

function analisarPrograma(nome, argumentos, comando, contexto, nivel) {
  if (nivel > LIMITE_DE_ANINHAMENTO) bloquear("comando aninhado demais para análise.");

  if (SHELLS_BASH.has(nome) || SHELLS_POWERSHELL.has(nome) || nome === "cmd") {
    analisarShell(nome, argumentos, comando, contexto, nivel);
  } else if (AVALIADORES.has(nome)) {
    const texto = argumentos.join(" ");
    if (texto.includes("$")) bloquear("avaliação dinâmica de comando não é analisável.");
    analisarTexto(texto, contexto, nivel + 1);
  } else if (DEFINIDORES_DE_ALIAS.has(nome)) {
    if (mencionaSensivel(argumentos.join(" "))) bloquear("alias para operação sensível não é permitido.");
  } else if (INTERPRETADORES.has(nome)) {
    analisarInterpretador(argumentos, comando, contexto, nivel);
    analisarArquivos(nome, argumentos);
  } else if (LANCADORES.has(nome)) {
    analisarLancador(argumentos, comando, contexto, nivel);
  } else if (GERENCIADORES.has(nome) || (nome === "bun" && argumentos[0] === "run")) {
    analisarGerenciador(nome, argumentos, comando, contexto, nivel);
  } else if (nome === "git") {
    analisarGit(argumentos, contexto);
  } else if (nome === "gh") {
    analisarGh(argumentos, contexto);
  } else if (nome === "vercel" || nome === "vc") {
    bloquear("deploy e configuração da Vercel são do responsável.");
  } else if (nome === "supabase") {
    bloquear("o projeto Supabase remoto não é alterado pelo agente.");
  } else if (nome === "prisma") {
    analisarPrisma(argumentos);
  } else if (CLIENTES_HTTP.has(nome)) {
    if (argumentos.some((item) => HOSTS_RESERVADOS.test(item))) {
      bloquear("chamada direta a API de GitHub, Vercel ou Supabase é do responsável.");
    }
    analisarArquivos(nome, argumentos);
  } else {
    analisarArquivos(nome, argumentos);
  }
}

function analisarComandoSimples(comando, contexto, nivel) {
  if (comando.redirecoes.some((alvo) => ehConfiguracaoDeProducao(alvo) || ehArquivoDeCredencial(alvo))) {
    bloquear("redirecionar saída para configuração de produção ou credencial é do responsável.");
  }

  const palavras = limparPrefixos(comando.palavras, contexto.modo);
  if (palavras.length === 0) return;

  const primeira = palavras[0];
  const dinamico = contexto.modo === "bash" ? primeira.includes("$") : comando.chamada && primeira.includes("$");
  if (dinamico) bloquear("nome de programa dinâmico não é analisável.");

  analisarPrograma(nomePrograma(primeira), palavras.slice(1), comando, contexto, nivel);
}

function analisarTexto(texto, contexto, nivel) {
  if (nivel > LIMITE_DE_ANINHAMENTO) bloquear("comando aninhado demais para análise.");

  const { comandos, aninhados, balanceado } = lerComandos(texto, contexto.modo);

  if (!balanceado && mencionaSensivel(texto)) {
    bloquear("comando com aspas desbalanceadas e operação sensível não é analisável.");
  }

  for (const interno of aninhados) {
    analisarTexto(interno, contexto, nivel + 1);
  }

  for (const comando of comandos) {
    analisarComandoSimples(comando, { ...contexto, textoCompleto: texto }, nivel);
  }
}

// Devolve o motivo do bloqueio, ou null quando o comando pode seguir.
export function analisarComando(comando, contexto) {
  try {
    analisarTexto(comando, contexto, 0);
    return null;
  } catch (erro) {
    if (erro instanceof Bloqueio) return erro.message;
    throw erro;
  }
}
