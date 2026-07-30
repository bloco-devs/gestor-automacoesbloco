# Fase 8 — Criar Quadro + colunas padrão + contextos de arquivados

## 1. Botão "+ Criar Quadro" na seleção de projetos

Na tela `/workspace/demandas` (lista de projetos), adicionar um botão primário
"+ Criar Quadro" na barra do topo, ao lado da busca e do filtro "Arquivados".

Ao clicar, abre um modal mínimo:

- Campo **Nome do quadro** (obrigatório, autofocus, até 80 caracteres).
- Botões Cancelar / Criar (o Criar fica desabilitado sem nome e vira "Criando…").
- Ao sucesso: fecha o modal, mostra aviso curto, invalida o cache da lista
  (`atividades / boards-resumo`) e navega direto para o quadro novo.

Nenhuma lógica de banco na UI: o modal apenas chama a camada de acesso.

## 2. Camada de acesso — nova mutação

Novo hook `useCriarProjeto` em `src/modules/demand-access/`, seguindo o padrão
de `useProjetos`: chama a função de criação já existente no banco
(`atividades_create_board`, via `createBoard` em `src/lib/atividadesBoards.ts`)
com nome e visibilidade padrão de workspace, e invalida a lista ao terminar.
A tela continua sem saber que projeto é, hoje, um quadro.

## 3. Colunas padrão (banco)

A criação de quadro **já cria colunas automaticamente** hoje, mas cinco:
Backlog, A Fazer, Em Andamento, Em Revisão, Concluído.

Migração: substituir o corpo da função de criação para gerar exatamente três,
como pedido:

```text
A Fazer (ordem 1)  |  Em Andamento (ordem 2)  |  Concluído (ordem 3)
```

A lógica permanece inteira dentro da função no Postgres — a criação do quadro,
do vínculo de dono, das colunas e do registro de histórico continua numa única
transação. Quadros existentes não são alterados.

## 4. Arquivados — separação de contexto

Verificação feita no schema atual: **os dois mundos já são tabelas distintas**.
O Helpdesk ("Hoje") lê `demands`, que não possui nenhuma coluna de vínculo com
quadro/projeto; os Projetos ("Demandas") leem quadros e seus cards
(`atividades_boards` / `atividades_cards`). Ou seja, o filtro pedido
(`projeto_id IS NULL` / `IS NOT NULL`) não tem coluna correspondente e nenhuma
demanda de Helpdesk pode aparecer num projeto, nem o contrário.

Portanto, nesta fase:

- Nada de coluna nova nem de FK nova (decisão sua: "só validar e documentar").
- Validar em tela que "Hoje" mostra apenas demandas de `demands` e que o filtro
  "Arquivados" da lista de projetos traz apenas projetos arquivados.
- Registrar a separação em `docs/11-Banco-de-Dados.md`, com a observação de que
  vincular demanda a projeto exige uma fase própria (coluna + backfill + RLS).

## Detalhes técnicos

- Migração: `CREATE OR REPLACE FUNCTION public.atividades_create_board(...)`
  com a mesma assinatura e mesmas checagens (`auth.uid()`, `is_allowed_user()`,
  validação de visibilidade), trocando só o bloco de INSERT das colunas. As
  chaves seguem o padrão atual (`a-fazer-<8 chars do id>`) por causa da
  unicidade global herdada de `atividades_colunas.chave`.
- Arquivos tocados no front: `SelecaoDeProjetos.tsx` (barra + estado do modal),
  novo `NovoProjetoDialog.tsx` no mesmo módulo, novo
  `useCriarProjeto.ts` + export em `src/modules/demand-access/index.ts`.
- O diálogo antigo `NovoQuadroDialog.tsx` (experiência herdada de Atividades)
  fica como está; o novo é enxuto de propósito, só com nome.
