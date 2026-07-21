# Módulos

## Índice
- [Dashboard](#dashboard)
- [Solicitações](#solicitações)
- [Soluções](#soluções)
- [Atividades](#atividades)
- [Importador](#importador)
- [Diagrama / Ecossistema](#diagrama--ecossistema)
- [IA](#ia)
- [Observabilidade IA](#observabilidade-ia)
- [Consolidação](#consolidação)
- [Configurações](#configurações)
- [Perfil](#perfil)

## Dashboard
- **Rotas**: `/dashboard` (dev), `/dashboard-solicitante` (requester).
- **Componentes**: `ResumoPipeline`, `NotificacoesBell`, gráficos `recharts`.
- **Responsabilidades**: KPIs, resumo executivo IA, atalho para nova solicitação.

## Solicitações
- **Rotas**: `/solicitacoes`, `/solicitacoes/kanban`, `/solicitacoes/gantt`, `/solicitacao/:id`.
- **Componentes**: `StatusBadge`, `StatusTimeline`, `ScorePill`, `GanttChart`, `Kanban`.
- **Responsabilidades**: CRUD, priorização, avaliação técnica, comentários.

## Soluções
- **Rotas**: `/solucoes`, `/solucoes/kanban`, `/solucoes/gantt`, `/solucoes/:id`.
- **Responsabilidades**: catálogo de soluções entregues, tasks, critérios, links com demandas.

## Atividades
- **Rotas**: `/atividades`, `/atividades/:boardId`.
- **Componentes**: `BoardCard`, `NovoQuadroDialog`, `BoardSettingsDialog`, `Coluna`, `KanbanCard`, `CardDialog` + sub-seções (anexos, comentários, prazo, etiquetas, capa, timeline).
- **Responsabilidades**: Kanban nível Trello, DnD, capas, checklists, membros, favoritos, WIP, histórico.

## Importador
- **Rota**: `/atividades/importar`.
- **RFC**: `docs/rfcs/RFC-001-importador-atividades.md`.
- **Wizard**: 7 passos (`WizardStepper` + steps `Origem, Upload, BoardOrigem, Selecao, Destino, DryRun, Execucao`).
- **Backend**: `importer-upload`, `importer-run`, adapter Trello v1, executor via RPCs.

## Diagrama / Ecossistema
- **Rota**: `/diagrama`.
- **Componentes**: `MapaNarrativa`, `FlowEdge`, `StickyNoteNode` (React Flow).
- **Responsabilidades**: mapa vivo com camadas Soluções + Ecossistema, saúde por cor, narração IA.

## IA
Ver [08-IA](08-IA.md).

## Observabilidade IA
- **Rota**: `/observabilidade-ia` (admin/dev).
- **Fonte**: `ia_uso_log`.
- **Responsabilidades**: consumo por função, latência, tokens, usuário.

## Consolidação
- **Rota**: `/consolidacao`.
- **Responsabilidades**: revisar matches sugeridos entre demandas e soluções existentes.

## Configurações
- **Rota**: `/configuracoes`.
- **Responsabilidades**: `allowed_emails`, plataformas, setores, tipos de demanda, personas de Atividades.

## Perfil
- **Rota**: `/perfil`.
- **Componentes**: `AvatarEditorDialog` (zoom + drag estilo LinkedIn).
- **Responsabilidades**: dados básicos e avatar em `profiles.avatar_url`.
