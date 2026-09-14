# Política de segurança

Não reporte vulnerabilidades, credenciais ou dados pessoais em issues públicas.

Para um achado de segurança, contate o mantenedor do repositório de forma privada, incluindo uma descrição concisa, o impacto, passos mínimos de reprodução e qualquer mitigação conhecida. Aguarde orientação antes de publicar detalhes.

## Segredos

- Nunca versione `.env` ou chaves de provedores.
- Use exclusivamente os placeholders de `.env.example` na documentação.
- Variáveis `NEXT_PUBLIC_*` são públicas por definição; chaves de serviço nunca podem usar esse prefixo.

As restrições completas do projeto estão em [rules/restrictions.md](rules/restrictions.md).
