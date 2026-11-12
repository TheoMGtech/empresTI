import { z } from "zod";

// Spec 009 (RF-SEG-02, CA-SEG-03): sem `'unsafe-eval'` na CSP de produção. O Zod 4 testa
// `new Function` ao construir cada `z.object` para acelerar a validação, e o navegador registra
// esse teste como violação de CSP mesmo com o erro capturado. Com `jitless`, o teste não roda e a
// validação usa o caminho interpretado, com o mesmo resultado.
//
// Este módulo precisa ser avaliado antes de qualquer esquema: todo código que pode rodar no
// navegador importa `z` daqui, e não de "zod".
z.config({ jitless: true });

export { z };
