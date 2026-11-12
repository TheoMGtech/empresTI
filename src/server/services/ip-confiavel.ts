import { isIP } from "node:net";

// Spec 009 (RN-SEG-11, Q10): só a Vercel é origem confiável de IP. Em deploy da Vercel
// (`VERCEL=1`), `x-forwarded-for` é sobrescrito pela plataforma e precisa trazer um único endereço
// IPv4 ou IPv6 válido. Nenhum outro cabeçalho é lido: `x-real-ip`, `x-vercel-forwarded-for`,
// `x-client-ip` e afins vêm do cliente e podem ser forjados. Sem origem confiável, devolve `null`,
// e o limitador usa o identificador compartilhado `ip-indisponivel` (P3).
// Os testes injetam o IP pelo contexto do tRPC, nunca por cabeçalho.

type AmbienteIp = Readonly<Record<string, string | undefined>>;

export function lerIpConfiavel(
  cabecalhos: Pick<Headers, "get">,
  ambiente: AmbienteIp = process.env,
): string | null {
  if (ambiente.VERCEL !== "1") return null;

  const valor = cabecalhos.get("x-forwarded-for")?.trim();
  if (!valor || isIP(valor) === 0) return null;

  return valor;
}
