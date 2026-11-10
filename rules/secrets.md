---
description: Onde cada variável de ambiente vive e qual chave usar
globs: ["**/.env*", "src/**", "prisma/**", "next.config.*"]
alwaysApply: false
---

# Variáveis de ambiente e chaves
> leitor: agente

## Quando
Ao criar ou usar qualquer variável de ambiente, ao instanciar o client
do banco, ou ao escrever código que lê configuração.

## Variáveis do produto
São as que a aplicação ou o deploy usam, inclusive as de Supabase, banco,
Auth e Vercel.

1. Chave pública (anon): só ela pode aparecer em código que roda no
   navegador. A proteção dela são as políticas de acesso do banco.
2. Chave de serviço: ignora todas as políticas. Só em código que roda
   no servidor, nunca em componente de cliente, nunca em variável com
   prefixo público.
3. Variável nova do produto existe em TRÊS lugares ou em nenhum:
   `.env.local` (sua máquina) · `.env.example` (versionado, sem valor)
   · painel da Vercel (preview e production).
4. Ao criar uma variável, diga na resposta em quais dos três lugares
   você já a colocou e o que falta eu fazer à mão.

## Credenciais de ferramentas exclusivamente locais
São segredos usados só por scripts locais, sem dependência do runtime
nem do deploy. A regra dos três lugares não se aplica a eles.

Exceção aprovada hoje: `PIXABAY_API_KEY`, em `.env.pixabay.local`, para os
scripts da skill `imagens-equipamentos`.

1. Cada credencial depende de aprovação específica do responsável e é
   listada nesta seção. Sem essa aprovação, ela é variável do produto.
2. Fica somente em arquivo local ignorado pelo Git. Quem cadastra é o
   responsável.
3. Não é configurada automaticamente no deploy.
4. Nunca é exposta ao frontend ou ao modelo.
5. Não aparece em argumento de comando, resposta, log, commit ou relatório.
6. O agente não lê nem revela o conteúdo do arquivo.
7. Scripts autorizados podem carregar o segredo internamente, quando
   implementados e aprovados, sem imprimi-lo.
8. Credencial de Supabase, banco, Auth ou Vercel nunca entra nesta exceção.

## Verificação
Uma busca por "service" no código que vai para o navegador não
retorna nada. `.env.example` tem todas as variáveis do produto,
sem nenhum valor real. `git check-ignore` confirma que cada arquivo de
credencial local é ignorado, e uma busca pelo nome dessas credenciais em
`src/` não retorna nada.

## Não faça
- Não escreva valor de chave em resposta, commit, log ou comentário.
- Não crie variável do produto só no `.env.local`. Ela quebra o deploy e
  o erro só aparece no build da Vercel.
- Não use a exceção de ferramenta local para variável de que a aplicação
  ou o deploy dependam.
- Não contorne uma política de acesso trocando de chave. Se a política
  atrapalha, a política está errada — pare e me avise.
