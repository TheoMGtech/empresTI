# Handoff

Artefato efêmero para registrar onde uma sessão terminou e o que ficou pendente.
Não é fonte de verdade sobre requisitos, comportamento ou arquitetura.

## Estado atual

- O andar zero executável está no PR #6, com CI verde e três commits coesos:
  governança, infraestrutura e tela técnica.
- A tela Nocturne e o Route Handler tRPC foram validados localmente; nenhuma
  funcionalidade de produto foi implementada.
- O MCP global do Supabase está autenticado e limitado ao projeto
  `wdudlqacomnasnrxgbni`; o conector Supabase do ChatGPT requer reconexão.
- Nenhuma mudança de schema foi gerada ou aplicada. O DDL da tabela técnica
  `saude_sistema` aguarda aprovação literal conforme `rules/migration.md`.
- A CLI da Vercel aguarda a conclusão do login por dispositivo. Ainda não há
  deploy de produção.
- O PR #6 não foi integrado: a aprovação e o merge pertencem ao responsável.
