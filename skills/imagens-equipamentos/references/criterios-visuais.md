# Critérios visuais

Use ao examinar candidatos e imagens finais. Cada rejeição precisa de ao menos um código
da tabela, registrado com `preparar.mjs rejeitar`.

## O que a imagem final precisa ter

- Fotografia real, não gerada por IA.
- Equipamento da categoria certa, claramente reconhecível.
- Nenhuma pessoa, rosto, marca, logotipo ou marca-d'água.
- Nenhum texto legível, exceto inscrições técnicas genéricas do próprio equipamento, descritas
  abaixo.
- Tela apagada ou sem conteúdo identificável.
- Enquadramento em que o recorte 4:3 mantenha o equipamento inteiro ou reconhecível.
- Uma foto distinta para cada equipamento, sem cenas quase iguais.

As descrições do lote são referência visual. A foto não confirma marca, modelo exato ou
polegadas.

## Inscrições técnicas genéricas

Por orientação posterior do professor, relatada pelo responsável, sem data nem documento
informados, são permitidas inscrições técnicas genéricas que pertencem ao próprio
equipamento. Sozinhas, elas não justificam a rejeição por `TEXTO`.

| Permitido | Continua proibido |
|---|---|
| Resolução ou padrão de vídeo, como “720p”, “1080p”, “HD” e “Full HD” | Nome ou logotipo de fabricante identificável: `MARCA` |
| Rótulos de controles, como “MENU”, “DISP” e “FUNC” | Marca-d'água ou selo: `MARCA_DAGUA` |
| Identificação genérica de portas, conectores ou funções, como o símbolo USB | Documento, aplicativo, mensagem ou informação identificável na tela: `TELA_COM_CONTEUDO` |
| Especificações técnicas gravadas na peça, como abertura e distância focal da lente | Texto da cena que não pertence ao equipamento, como cartaz, livro ou etiqueta: `TEXTO` |
| | Informação privada, como nome, patrimônio ou número de série: `TEXTO` |

A permissão vale para a inscrição, não para qualquer texto. O agente descreve na revisão
cada inscrição legível, diz em que coluna a enquadra e não libera por conta própria um caso
duvidoso, como um nome de modelo que possa identificar o fabricante: a decisão é do
responsável. Uma rejeição já registrada por `TEXTO` também não se desfaz sozinha. A
reclassificação depende de decisão do responsável e de registro de auditoria.

## Códigos de rejeição

| Código | Quando usar |
|---|---|
| `OBJETO_ERRADO` | Outro objeto ou categoria, ou equipamento pouco reconhecível |
| `PESSOA` | Pessoa, rosto ou parte identificável do corpo |
| `MARCA` | Marca, logotipo ou design que identifique o fabricante |
| `MARCA_DAGUA` | Marca-d'água ou selo sobre a imagem |
| `TEXTO` | Texto legível que não seja inscrição técnica genérica do equipamento |
| `TELA_COM_CONTEUDO` | Tela com interface, documento ou conteúdo identificável |
| `INDICIO_IA` | Rótulo de IA na origem ou sinais visuais de geração artificial |
| `RESOLUCAO` | Resolução insuficiente para 800 × 600 sem ampliar |
| `RECORTE` | O recorte corta o equipamento ou compromete a composição |
| `DUPLICADA` | Repete ou quase repete outra foto do lote |
| `QUALIDADE` | Desfoque, ruído, iluminação ruim ou aparência inadequada |

Rejeitar um candidato o impede de ser selecionado de novo para o mesmo equipamento. Por
isso, teste `--enquadramento` (`centre`, `top`, `bottom`, `left`, `right`) antes de
selecionar quando o recorte central puder prejudicar a foto. Se nenhum servir, defina a
área com `--regiao` antes de selecionar: depois de preparado, o recorte do item não muda.

## O que a automação prova e o que não prova

| Os scripts comprovam | Os scripts não comprovam |
|---|---|
| JPEG real, decodificado, de 800 × 600 | Que o objeto é o equipamento certo |
| SHA-256 do arquivo igual ao manifesto | Ausência de pessoas, marcas ou textos |
| Mesmos bytes ou mesma foto em dois itens | Que imagens de hash diferente sejam visualmente distintas |
| Procedência preenchida e coerente | Que a foto seja real e não gerada por IA |
| Região registrada coerente com a imagem-base declarada | Que o JPEG tenha vindo dessa base, pois o validador não a reprocessa |

A API não oferece filtro nem campo sobre IA, e o rótulo na Pixabay é declarado por quem
envia a imagem. A ausência de rótulo não prova que a foto é real. `safesearch` e os demais
parâmetros também não garantem ausência de pessoas ou marcas.

## Revisão humana

A revisão humana é obrigatória e acontece sobre a imagem **final, já recortada**. Um
recorte tecnicamente válido pode ser visualmente inadequado. O agente pode fazer a
primeira leitura e registrar `aceita_agente` ou `reprovada`, mas isso não substitui a
aprovação do responsável. A permissão para inscrições técnicas não muda isso: o agente aponta
cada inscrição legível, e o responsável decide.
