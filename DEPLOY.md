# Estado de publicação

Registro de o que está em produção e o que está pendente. Versionado de
propósito: o que depende de memória se perde, e foi assim que 18 commits se
acumularam sem ninguém notar.

## Ambientes

| Ambiente | Branch | Publicação |
|---|---|---|
| Produção | `main` | Lovable publica automaticamente a cada push |
| Homologação | — | **não existe** |

Hoje há um ambiente só, e ele é produção. Push é deploy. Criar um segundo
projeto Lovable apontando para `staging` é o pré-requisito de qualquer
validação anterior à publicação.

## Divisão de trabalho

**Claude:** verifica (`tsc`, `eslint`, `vitest`, `vite build`), entrega em
fatias publicáveis na ordem de dependência, escreve o roteiro de validação.
Não faz push, não roda migração, não alcança o Supabase.

**André:** aplica o patch, roda a migração, publica, valida e confirma.

**Regra de parada:** Claude não produz funcionalidade nova enquanto houver mais
de uma fatia não confirmada em produção.

## Ordem de publicação de uma fatia

1. Migrações primeiro. Elas são compatíveis para trás de propósito — o código
   antigo continua funcionando depois delas, então nunca há janela quebrada.
2. Aplicar o patch e publicar.
3. Rodar o roteiro de validação da fatia.
4. Confirmar aqui, na tabela abaixo.

## Verificação feita antes de cada entrega

O que Claude confirma **contra a `main` real**, não contra a própria cópia:
clone limpo da produção, `git am --3way` sem conflito, `npm install` do zero,
`tsc`, `vitest`, `vite build` e `eslint` — este último comparado com a
contagem de erros da própria produção, para distinguir erro novo de erro
herdado.

O que sobra para André é o push, a migração e o uso real.

## Confirmado em produção

| Fatia | Commit | Data | Validado |
|---|---|---|---|
| Onda 1 — paleta ⌘K e menu de 5 itens | `a75a005` | 26/07 | sim |
| Correções de duplicidade, cabeçalho e coluna vazia | `eab8fd6` | 26/07 | sim |
| Capa do projeto | `d0d487e` | 26/07 | sim |
| Sinais que não distinguem nada | `5c20cf5` | 26/07 | sim |
| Board: sinal repetido e coluna concluída recolhida | `4a010b5` | 27/07 | sim |
| Fatia 1 — UI: workspace e tela da demanda (11 commits) | `1989e9c`* | 27/07 | sim — validado por André via prints (seleção de projetos, barra fila+lente, board sem herança do Trello, tela em 3 colunas) |

\* commit de topo após o `git am` local; os 11 commits individuais estão no patch `deploy-1-ui-VALIDADO.patch`.

## Pendente

| Fatia | Patch | Migração | Risco |
|---|---|---|---|
| 4 — Hoje soma atividades + demands | `deploy-4-hoje-VALIDADO.patch` | não | baixo — só front-end, tela isolada |
| 2 — Infra de IA | `deploy-2-infra-de-ia.patch` | `20260727120000` | **alto** — muda o modelo padrão |
| 3 — Fluxo do assistente | `deploy-3-fluxo-do-assistente.patch` | `20260727150000` | alto — muda o que é gravado |
| 5 — Remover Inbox/Pipeline Kanban do menu | ainda não gerado | não | baixo — só depois da limpeza de dados abaixo |

### Roteiro — fatia 1

Sem migração. Publicar e conferir:

- Demandas abre na seleção de projetos, e o nome "quadro" não aparece.
- Entrar num projeto: duas faixas de 40px no topo, não cinco.
- Alternar as cinco lentes; o filtro digitado se mantém entre elas.
- Abrir uma demanda: três colunas, briefing acima da conversa, checklist à esquerda.
- Anexar um print e vê-lo sem baixar.

Dá errado se: alguma lente não renderiza, ou o cabeçalho some ao trocar de lente.

**Confirmado.** Achados à parte, fora do escopo desta fatia: "Hoje" aparecia
vazio (tela nunca migrada para o modelo de Demanda — vira fatia 4) e
"Inbox"/"Pipeline Kanban" mostravam dado de teste do fluxo antigo de
Solicitações (vira limpeza de dado + fatia 5).

### Roteiro — fatia 4

Sem migração. Publicar e conferir:

- Abrir "Hoje": a fila "Todas" mostra as demandas reais (as mesmas que
  aparecem dentro do projeto "Plano de Ajustes").
- Trocar para "Minhas": só aparecem demandas com você como responsável.
- Clicar numa demanda: abre `/demandas/:id` (página cheia, com URL própria),
  nunca um preview embutido.

Dá errado se: a lista continuar vazia (sinal de que alguma das seis consultas
— cards/colunas/labels/personas/responsáveis/soluções — está falhando
silenciosamente) ou se abrir a demanda errada ao clicar.

### Limpeza de dado — Solicitações legado (sem código, sem migração)

Rodar `limpar-solicitacoes-legado.sql` no SQL Editor do Supabase. Apaga todo o
conteúdo de teste do fluxo antigo (`solicitacoes` e as tabelas que dependem
dela). Não é reversível — é a limpeza combinada para começar o sistema do
zero. Depois de rodado, "Inbox" e "Pipeline Kanban" devem aparecer vazios até
a fatia 5 tirar os dois do menu.

### Roteiro — fatia 2

Rodar `20260727120000` **antes** de publicar.

1. Publicar.
2. `POST /functions/v1/ia-ping` com token de usuário autenticado.
3. Resposta `200` → seguir. Resposta `424` → o identificador do modelo está
   errado; corrigir `IA_MODEL_PADRAO` com a string que o erro indicar.
4. Conferir `semPreco` na resposta e preencher `ia-pricing.ts` ou `IA_PRECO_*`.
5. Abrir uma demanda pelo fluxo atual e confirmar que a IA ainda responde.

**Rollback sem reverter código:** `IA_PROVIDER_PADRAO=google` e
`IA_MODEL_PADRAO=gemini-3-flash-preview` devolvem o comportamento anterior.

Dá errado se: `ia-ping` falha nos três perfis — significa que nenhuma chamada
de IA vai funcionar.

### Roteiro — fatia 3

Rodar `20260727150000` **antes** de publicar. Sem ela, `priority` continua
`NOT NULL DEFAULT 'media'` e o problema principal desta fatia permanece.

1. Publicar.
2. Abrir **uma** demanda pelo assistente, contando um problema real de bug.
3. Conferir que ele pergunta passo a passo, caso concreto e desde quando.
4. Conferir que a demanda criada tem esses campos e **pode ter prioridade nula**.
5. Abrir a demanda como desenvolvedor: dá para começar sem voltar ao solicitante?

Dá errado se: a conversa chega ao teto de 8 perguntas sem encerrar — significa
que alguma lacuna exigida não está sendo perguntada, e a demanda trava.

## Pendências conhecidas, não publicadas

- `setor` vem de `setoresDisponiveis[0]` — toda demanda recebe o primeiro setor
  da lista, não o da pessoa. Corrigir lendo o perfil do usuário.
- `triagem-demanda` segue viva para o formulário legado. Duas rotas de
  estruturação com regras parecidas mas não idênticas: vão divergir.
- Busca de semelhantes ainda usa LLM. Sai com embeddings + pgvector.
- `listDemands()` sem paginação: carrega todas as demandas da organização.
- Inbox e Pipeline Kanban (fluxo de `solicitacoes`) seguem no menu depois da
  limpeza de dado — remover é a fatia 5, decidida mas ainda não gerada.
