// Spec 009 (RF-SEG-12, RS-SEG-02): o limitador não pode decidir. Login e mutações cobertas falham
// fechados (503). A mensagem é genérica de propósito: nunca carrega a chave, o e-mail, o IP, o
// identificador nem o erro original do banco.
export class ErroLimiteIndisponivel extends Error {
  constructor() {
    super("Limitador de requisições indisponível.");
    this.name = "ErroLimiteIndisponivel";
  }
}
