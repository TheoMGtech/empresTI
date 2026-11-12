# Entrega — EmpresTI

> Atualização inicial: 12/11/2026. Documento de entrega **em preparação**, ainda não representa aceite final do projeto.
>
> Fonte dos critérios: [PRD](docs/PRD.md), [validação integrada](docs/VALIDACAO-INTEGRADA.md), [specs](docs/specs/) e regras de operação. A rubrica externa de avaliação escolar não foi fornecida neste registro.

## Acesso à demonstração

- **Aplicação:** https://empresti-self.vercel.app/
- **Domínio alternativo:** https://empresti-theo-escola.vercel.app/
- **Repositório:** https://github.com/TheoMGtech/empresTI
- **Tenant da demonstração:** `suporte_ti`

| Perfil de demonstração | Identificador de login | Funcionalidades |
|---|---|---|
| Colaborador | `colaborador@empresti.test` | Catálogo, solicitação, devolução e histórico próprios |
| Operações | `operacoes@empresti.test` | Gestão de empréstimos e equipamentos, devolução no balcão |

**Distribuição de senhas:** as senhas são fornecidas diretamente ao avaliador, por canal privado, pelo responsável pelo projeto. **Não há senhas no Git, no README, em issues nem nos PRs.** Os endereços `.test` são contas fictícias para demonstração, sem recebimento de e-mail e sem recuperação de senha por e-mail. O simples registro de uma senha neste documento não a configuraria no Supabase Auth.

**Nomes de exibição:** os dois vínculos foram criados com `nome_exibicao` vazio; o papel é suficiente para o acesso, mas a apresentação dos nomes pode ser ajustada antes da avaliação, mediante procedimento autorizado.

## Versão publicada e infraestrutura

| Item | Estado | Evidência / observação |
|---|---|---|
| Release de Specs 003–008 | Concluído | [PR #98](https://github.com/TheoMGtech/empresTI/pull/98), merge na `main` `8e08040fb86419783dd373411b8ed63991a2a2b7`, árvore `3aa331e38f8b53b28176e7c72ce2d444890da80f` |
| Build e controles da `main` | Concluído | Checks GitHub `Application quality`, `Documentation and secret guard` e `Supabase Preview` concluídos com sucesso no commit de release |
| Vercel Production | Concluído para release intermediário | Deploy reportado concluído; duas URLs responderam 200; `tecnico.status` reportou `bancoOperacional: true` |
| Supabase PostgreSQL | Concluído para release intermediário | 7 migrations com `finished_at`; a sétima (`criar_limites_requisicao`) pertence à Spec 009 e foi aplicada antecipadamente |
| Carga inicial | Concluída | Tenant `suporte_ti`, 12 equipamentos, TI-0004 e TI-0007 em manutenção; Storage com 12 fotografias informado pelo responsável |
| Perfis de acesso | Concluído | 2 usuários do Supabase Auth vinculados ao tenant com papéis `colaborador` e `operacoes` |
| Rotas sem sessão | Concluído | Testes HTTP reportados: procedimentos protegidos retornam 401; navegação protegida redireciona ao login |
| Testes funcionais autenticados | Informados como concluídos | Responsável informou conclusão; falta anexar resultados por cenário, evidências e eventuais ajustes do roteiro abaixo |
| Spec 009 — segurança HTTP e rate limiting | **Pendente** | Desenvolvimento parcial em `develop`; a entrega definitiva exige implementação, verificação e promoção autorizada para `main` |

## Checklist restante para o aceite final

Usar `[x]` somente com resultado e evidência verificáveis; não presumir aprovação de cenários apenas pelo deploy.

### Funcionalidades e regras do PRD

- [ ] Registrar evidência de login/logout e separação de permissões dos dois perfis.
- [ ] Registrar evidência do catálogo com 12 equipamentos, imagens, filtros e indisponibilidade de TI-0004 e TI-0007.
- [ ] Registrar evidência do ciclo completo: solicitação, prazo de 14 dias, Meus empréstimos, devolução e histórico.
- [ ] Registrar evidência do limite de 3 empréstimos, recusa do quarto e bloqueio por atraso.
- [ ] Registrar evidência dos fluxos de Operações: empréstimos abertos, indicadores, devolução de terceiro, cadastro e manutenção.
- [ ] Registrar evidência de concorrência (duas solicitações para o mesmo item) e das recusas em chamadas diretas à API.
- [ ] Demonstrar o critério de resultado do PRD: Operações poder abandonar a planilha depois de duas semanas de uso; se o prazo de uso real ainda não ocorreu, registrar como **não verificado**, sem inventar resultado.

### Segurança e validação integrada

- [ ] Consolidar em [`docs/VALIDACAO-INTEGRADA.md`](docs/VALIDACAO-INTEGRADA.md) as provas, data, conta, resultado e evidência de cada CA testado.
- [ ] Confirmar e registrar cadastro público desabilitado no Supabase Auth e `public` removido dos schemas expostos na Data API (ou Data API desativada).
- [ ] Registrar teste de RLS, isolamento por tenant, proteção de endpoints, ausência de dados sensíveis nos erros e trilha de auditoria das mutações.
- [ ] Concluir a **Spec 009**: serviço de limite, respostas 429/503, integração com login e cinco mutações, interface, CSP/cabeçalhos, testes e verificação formal em `verificacao.md`.
- [ ] Revisar o risco de concorrência/pool do rate limiter e comprovar em testes que erros 503 por indisponibilidade são distinguidos de 429 por limite.
- [ ] Publicar a Spec 009 na `main` em PR separado, autorizado pelo responsável, sem reaplicar ou apagar migrations já aplicadas.
- [ ] Reexecutar testes de regressão e smoke tests autenticados nas duas URLs após o release final.

### Documentação e governança

- [x] As Specs 003–008 possuem registros formais `Veredito: PRONTA` em seus arquivos `verificacao.md`.
- [x] Release intermediário #98 com CI verde e implantação de produção concluída.
- [ ] Atualizar [`docs/DEVOPS.md`](docs/DEVOPS.md) e [`README.md`](README.md), que ainda descrevem o estado anterior do sistema.
- [ ] Registrar evidências do workflow protegido de migrations, da configuração do Environment `production` e da separação de segredos.
- [ ] Encerrar pendências de apresentação relevantes à avaliação (por exemplo, nomes de exibição, se desejado).
- [ ] Validar o checklist completo de `docs/VALIDACAO-INTEGRADA.md`, incluindo cenários não cobertos pelos testes rápidos de produção.
- [ ] Publicar este `ENTREGA.md` na `main` após revisão e autorização do responsável.
- [ ] Anotar o SHA do release final, URL, data, resultados e aceite do responsável; declarar **100% concluído** somente quando os bloqueadores obrigatórios estiverem resolvidos.

## Evidências a completar

| Critério / cenário | Data | Conta | Resultado | Evidência (link, print ou consulta) |
|---|---|---|---|---|
| Login, catálogo, solicitação e devolução do colaborador | a registrar | colaborador | testes informados como concluídos | a anexar |
| Operações e recusa de acesso ao colaborador | a registrar | operacoes e colaborador | testes informados como concluídos | a anexar |
| Regras: 3 itens, atraso, concorrência | a registrar | colaborador | a comprovar item a item | a anexar |
| RLS, isolamento e auditoria | a registrar | contas autorizadas | a comprovar | a anexar |
| Spec 009 em produção | a registrar | contas autorizadas | pendente | a anexar |
| Aceite final do responsável | a registrar | responsável | pendente | a anexar |

## Fora de escopo da primeira versão

Conforme o PRD, reserva futura, notificações por e-mail e importação da planilha não fazem parte desta versão. Sentry e atualizações do Dependabot permanecem questões de evolução/operabilidade, salvo se surgir vulnerabilidade crítica ou exigência expressa da rubrica escolar.
