# Pixabay: API, limites e licença

Documentação oficial consultada em 2026-11-09. Confira as fontes antes de um novo lote:
[API](https://pixabay.com/api/docs/) ·
[Termos, atualizados em 2026-10-20](https://pixabay.com/service/terms/) ·
[Resumo da licença](https://pixabay.com/service/license-summary/) ·
[FAQ](https://pixabay.com/service/faq/).

## Busca implementada

`buscar.mjs` usa somente `GET https://pixabay.com/api/`, com estes parâmetros:

| Parâmetro | Valor |
|---|---|
| `key` | Lida do arquivo local, somente na requisição |
| `q` | `--termo`, até 100 caracteres |
| `lang` | `--idioma`, padrão `en` |
| `image_type` | `photo` |
| `orientation` | `horizontal` |
| `safesearch` | `true` |
| `min_width` / `min_height` | `800` / `600` |
| `per_page` | `--limite`, de 3 a 50, padrão 20 |
| `page` | `1`, sem paginação |

Candidatos fora do contrato (não foto, pequenos, sem autor ou com URL não permitida) são
descartados com motivo. Campos novos da API são ignorados.

## Chave local

`PIXABAY_API_KEY` fica em `.env.pixabay.local`, conforme `rules/secrets.md`. A API exige a
chave na URL, por isso ela é montada dentro do processo e nunca passa pela linha de
comando. `node <s>/buscar.mjs --verificar-chave` informa apenas se ela está presente.

## Cache e limites

- A documentação pede cache de 24 horas. As respostas normalizadas ficam em
  `.artefatos/imagens-equipamentos/cache/`, sem a chave.
- O limite padrão é de 100 requisições a cada 60 s, por chave, informado nos cabeçalhos
  `X-RateLimit-*`. Com limite esgotado, a próxima busca não chama a API.
- Cada busca faz no máximo uma repetição, em 429, 5xx ou timeout. Esperas acima de 120 s
  não são repetidas.
- A documentação proíbe download sistemático em massa.

## Falhas da busca

| Código | Significado | Ação |
|---|---|---|
| `CHAVE_AUSENTE` / `CHAVE_MALFORMADA` | Credencial local ausente ou inválida | Pare e avise o responsável |
| `CHAVE_RECUSADA` | Resposta 401 ou 403 | Pare e avise o responsável |
| `REQUISICAO_RECUSADA` | Outra resposta 4xx | Revise os parâmetros |
| `LIMITE_EXCEDIDO` | Limite de requisições atingido | Aguarde o tempo informado |
| `ERRO_DO_SERVIDOR` | Erro 5xx depois da repetição | Tente mais tarde |
| `TEMPO_ESGOTADO` / `REDE_INDISPONIVEL` | Falha de conexão | Tente mais tarde |
| `RESPOSTA_INVALIDA` | JSON inválido ou fora do esquema | Não use o resultado |
| `CONTEUDO_COM_CREDENCIAL` | A resposta repetiria a chave | Nada foi gravado; avise |

## Download e armazenamento

- `preparar.mjs` baixa `largeImageURL`, limitada a 1280 px pela API, somente de
  `pixabay.com` ou `cdn.pixabay.com` por HTTPS, com 2 redirecionamentos validados, 30 s
  e 20 MiB no máximo.
- As URLs da API expiram: `CANDIDATO_EXPIRADO` ou `DOWNLOAD_RECUSADO` pedem nova busca.
- Hotlink permanente é proibido. Os arquivos ficam em `.artefatos/imagens-equipamentos/`.
- Falhas de arquivo incluem `URL_NAO_PERMITIDA`, `REDIRECIONAMENTO_NAO_PERMITIDO`,
  `CONTEUDO_NAO_IMAGEM`, `FORMATO_NAO_PERMITIDO`, `ARQUIVO_GRANDE_DEMAIS`,
  `ORIGEM_PEQUENA_DEMAIS` e `ARQUIVO_CONFLITANTE`.

## Licença

Esta é uma leitura técnica, não parecer jurídico. O manifesto referencia a Licença de
Conteúdo Pixabay e a data da consulta, sem atribuir a cada foto mais direitos do que os
comprovados.

- **Sem garantia.** O conteúdo é fornecido como está, e a Pixabay não garante
  consentimentos. Pessoas, marcas e produtos retratados podem exigir autorização, sob
  responsabilidade de quem usa.
- **Standalone.** É proibido vender ou distribuir o conteúdo sem esforço criativo, e
  recortar ou redimensionar não muda isso. Por isso as imagens não vão para o repositório
  público.
- **Marcas e uso enganoso.** Não usar marcas ou logotipos comercialmente ligados a bens e
  serviços, nem sugerir endosso ou autoria.
- **Reclamação.** Havendo reclamação, o uso deve cessar.

## Obrigações e decisões do projeto

| Item | Natureza |
|---|---|
| Respeitar restrições de uso, sem hotlink permanente e com cache de 24 horas | Exigência da Pixabay |
| Indicar a origem ao exibir resultados de busca da API | Pedido da documentação da API |
| Atribuição do autor ou da Pixabay | Não exigida pela licença |
| Crédito “Fotos: Pixabay” na interface | Decisão do projeto, sem link obrigatório |
| Autor, ID, URL, datas e SHA-256 no manifesto | Decisão de rastreabilidade do projeto |
