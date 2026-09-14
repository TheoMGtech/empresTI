# AGENTS.md — Como trabalhar neste repositório

Regras de processo já definidas para este projeto:

1. O projeto utiliza SDD repo-native/manual.
2. A ordem é `SPEC → PLAN → TASKS → CODE`.
3. Não se implementa uma funcionalidade antes de sua especificação.
4. Specs governam comportamento.
5. Se spec e código divergirem sobre comportamento, a spec prevalece até ser alterada.
6. Decisões arquiteturais pertencem aos ADRs.
7. O agente não pode inventar regras de negócio.
8. O agente não pode tomar decisões marcadas como pendentes.
9. Segredos nunca podem ser inventados ou versionados.
10. Mudanças de comportamento começam pela spec.
11. Cada feature futura terá `spec.md`, `plan.md` e `tasks.md`.
12. Implementação deverá ser validada contra os critérios de aceitação da spec.