import { ErroLimiteExcedido, ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import type { Limitador, Reserva } from "@/server/services/limites";

// Spec 009 (T-SEG-08): limitador explícito para os testes com Prisma simulado. Sem ele, o contexto
// usa o limitador real (`limitadorDoContexto`), que falha fechado sem banco. Só aparece em teste:
// `criarContextoTRPC` sempre usa o real.

export type ResultadoLimitador = "permitir" | "excedido" | "indisponivel";

type Chamadas = {
  reservarLogin: Parameters<Limitador["reservarLogin"]>[0][];
  reservarMutacao: Parameters<Limitador["reservarMutacao"]>[0][];
  devolver: Reserva[];
};

const reservaDeTeste = (escopo: Reserva["escopo"]): Reserva => ({
  escopo,
  identificador: "0".repeat(64),
  janelaInicio: new Date("2026-01-01T00:00:00Z"),
});

/**
 * `resultado` decide o que `reservarLogin` e `reservarMutacao` fazem; `devolver` sempre funciona.
 * `chamadas` registra os argumentos, para o teste conferir o que o procedimento pediu.
 */
export function criarLimitadorDeTeste(resultado: ResultadoLimitador = "permitir", segundos = 60) {
  const chamadas: Chamadas = { reservarLogin: [], reservarMutacao: [], devolver: [] };

  const decidir = () => {
    if (resultado === "excedido") throw new ErroLimiteExcedido(segundos);
    if (resultado === "indisponivel") throw new ErroLimiteIndisponivel();
  };

  const limitador: Limitador = {
    async reservarLogin(dados) {
      chamadas.reservarLogin.push(dados);
      decidir();
      return { ip: reservaDeTeste("login_ip"), email: reservaDeTeste("login_email") };
    },
    async reservarMutacao(dados) {
      chamadas.reservarMutacao.push(dados);
      decidir();
    },
    async devolver(reserva) {
      chamadas.devolver.push(reserva);
    },
  };

  return { limitador, chamadas, obterLimitador: () => limitador };
}
