# Handoff

Artefato efêmero para registrar onde uma sessão terminou e o que ficou pendente.
Não é fonte de verdade sobre requisitos, comportamento ou arquitetura.

## Estado atual

- O andar zero executável foi integrado em `develop` pelo PR #6 e promovido para
  `main` pelo PR #7; a produção ainda exibe a tela técnica que será substituída.
- A branch `feature/login` contém o pacote SDD de login em
  `docs/specs/login/`, atualizado para tornar `/` a tela inicial e redirecionar
  `/login` para a raiz.
- A composição visual do ZIP fornecido é apenas referência de layout. Usuários
  fictícios, credenciais demonstrativas e autenticação por `localStorage` não
  serão reutilizados.
- O MCP global do Supabase está autenticado, limitado ao projeto
  `wdudlqacomnasnrxgbni` e configurado com `storage`; o `.mcp.json` do repositório
  permanece somente leitura, com `database,docs`.
- As skills repo-native `supabase` e `supabase-postgres-best-practices` foram
  instaladas em `.agents/skills/` e registradas em `skills-lock.json`.
- Nenhuma implementação de login ou mudança de schema foi iniciada. O próximo
  passo depende da aprovação do responsável para `spec.md`, `plan.md` e
  `tasks.md`, conforme o fluxo SDD vinculante.
