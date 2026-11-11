// Guarda das rotinas Prisma: nenhuma escrita antes de confirmar o destino da conexão.
// Destino local passa; remoto exige --confirmar-remoto com os hosts exatos. A confirmação só
// vem de argumento explícito, nunca de variável de ambiente ou valor padrão.
// As mensagens são fixas: nunca repetem URL, usuário, senha ou host recebidos.

const OPCAO_CONFIRMACAO = "--confirmar-remoto";
const PROTOCOLOS = new Set(["postgresql:", "postgres:"]);
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const FORMATO_HOST = /^(?:[a-z0-9.-]+|\[[0-9a-f:.]+\])$/;
const CARACTERE_INVALIDO = /[\s\u0000-\u001f]/;

// Lista fechada: `host`, `hostaddr`, `service` e similares redirecionam a conexão para um
// destino diferente do que aparece na URL, e por isso nunca podem passar.
const PARAMETROS_PERMITIDOS = new Set([
  "application_name",
  "connect_timeout",
  "connection_limit",
  "pgbouncer",
  "pool_timeout",
  "schema",
  "sslmode",
  "statement_timeout",
]);

const MENSAGENS = {
  URL_AUSENTE: "Nenhuma URL de banco foi informada.",
  URL_MALFORMADA: "Uma URL de banco está malformada.",
  PARAMETRO_NAO_PERMITIDO: "Uma URL de banco tem parâmetro não permitido.",
  DESTINOS_DIVERGENTES: "As URLs de banco misturam destino local e remoto.",
  REMOTO_SEM_CONFIRMACAO: "Banco remoto recusado: falta a confirmação explícita.",
  CONFIRMACAO_INVALIDA: "A confirmação de banco remoto é inválida.",
  CONFIRMACAO_DIVERGENTE: "A confirmação não corresponde aos hosts remotos das URLs.",
  CONFIRMACAO_SEM_REMOTO: "Confirmação de banco remoto informada para destino local.",
} as const;

export type CodigoRecusa = keyof typeof MENSAGENS;

export class ErroBancoNaoPermitido extends Error {
  readonly codigo: CodigoRecusa;

  constructor(codigo: CodigoRecusa) {
    super(MENSAGENS[codigo]);
    this.name = "ErroBancoNaoPermitido";
    this.codigo = codigo;
  }
}

export type EntradaGuarda = {
  env: { DATABASE_URL?: string; DIRECT_URL?: string };
  argumentos: readonly string[];
};

export type DestinoPermitido = { tipo: "local" | "remoto" };

function extrairHost(valor: string) {
  if (CARACTERE_INVALIDO.test(valor)) throw new ErroBancoNaoPermitido("URL_MALFORMADA");

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    // A mensagem original do construtor repete a URL recebida.
    throw new ErroBancoNaoPermitido("URL_MALFORMADA");
  }

  const host = url.hostname.toLowerCase();
  if (!PROTOCOLOS.has(url.protocol) || !FORMATO_HOST.test(host)) {
    throw new ErroBancoNaoPermitido("URL_MALFORMADA");
  }

  for (const parametro of url.searchParams.keys()) {
    if (!PARAMETROS_PERMITIDOS.has(parametro)) {
      throw new ErroBancoNaoPermitido("PARAMETRO_NAO_PERMITIDO");
    }
  }

  return host;
}

function lerConfirmacao(argumentos: readonly string[]) {
  const ocorrencias = argumentos.filter(
    (argumento) =>
      argumento === OPCAO_CONFIRMACAO || argumento.startsWith(`${OPCAO_CONFIRMACAO}=`),
  );
  if (ocorrencias.length === 0) return undefined;

  const [ocorrencia] = ocorrencias;
  if (ocorrencias.length > 1 || ocorrencia === undefined || ocorrencia === OPCAO_CONFIRMACAO) {
    throw new ErroBancoNaoPermitido("CONFIRMACAO_INVALIDA");
  }

  const hosts = ocorrencia
    .slice(OPCAO_CONFIRMACAO.length + 1)
    .split(",")
    .map((host) => host.toLowerCase());
  if (!hosts.every((host) => FORMATO_HOST.test(host))) {
    throw new ErroBancoNaoPermitido("CONFIRMACAO_INVALIDA");
  }

  return new Set(hosts);
}

function mesmosHosts(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  return a.size === b.size && [...a].every((host) => b.has(host));
}

/** Chamar antes de abrir qualquer conexão que possa escrever. Lança se o destino for recusado. */
export function garantirBancoPermitido({ env, argumentos }: EntradaGuarda): DestinoPermitido {
  const urls = [env.DATABASE_URL, env.DIRECT_URL].filter((url) => url !== undefined);
  if (urls.length === 0) throw new ErroBancoNaoPermitido("URL_AUSENTE");

  const hosts = urls.map(extrairHost);
  const confirmacao = lerConfirmacao(argumentos);
  const remotos = new Set(hosts.filter((host) => !HOSTS_LOCAIS.has(host)));

  if (remotos.size === 0) {
    if (confirmacao) throw new ErroBancoNaoPermitido("CONFIRMACAO_SEM_REMOTO");
    return { tipo: "local" };
  }

  // Uma URL local ao lado de uma remota faria a remota passar despercebida. Nem a confirmação
  // libera esse caso.
  if (hosts.some((host) => HOSTS_LOCAIS.has(host))) {
    throw new ErroBancoNaoPermitido("DESTINOS_DIVERGENTES");
  }

  if (!confirmacao) throw new ErroBancoNaoPermitido("REMOTO_SEM_CONFIRMACAO");
  if (!mesmosHosts(confirmacao, remotos)) {
    throw new ErroBancoNaoPermitido("CONFIRMACAO_DIVERGENTE");
  }

  return { tipo: "remoto" };
}
