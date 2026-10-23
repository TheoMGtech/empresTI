import { z } from "zod";

export const esquemaEntrada = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});

export type DadosEntrada = z.infer<typeof esquemaEntrada>;
