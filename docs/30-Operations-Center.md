# Centro de Operações (`/operacoes`)

Tela única para gestores e equipe técnica com visão consolidada da operação em tempo real. **Não** cria novas tabelas, RPCs ou edge functions — agrega dados de módulos existentes.

## Índice
- [Objetivo](#objetivo)
- [Permissões](#permissões)
- [Arquitetura](#arquitetura)
- [Realtime](#realtime)
- [Componentes](#componentes)
- [Insights (heurísticas locais)](#insights-heurísticas-locais)
- [Roadmap](#roadmap)

## Objetivo
Concentrar em uma tela: resumo geral, fila inteligente, carga da equipe, alertas, atividade recente e sugestões de IA sobre a operação de demandas (`demands`).

## Permissões
- Visível apenas para `developer` (equipe técnica) e `administrador` (via bypass).
- Solicitantes / builders **não** acessam. Rota `/operacoes` protegida por `ProtectedRoute role="developer"`.
- Todos os dados exibidos passam pelas RLS já existentes nas tabelas `demands`, `demand_audit_logs`, `demand_comments`, `notifications`, `ticket_deflections` e pela RPC `get_user_workloads`.

## Arquitetura

```mermaid
flowchart LR
  UI[OperationsPage] --> H[useOperationsData]
  H --> D[listDemands (demands module)]
  H --> W[getUserWorkloads RPC]
  H --> M[computeMetrics (dashboard module)]
  H --> N[listNotifications]
  H --> A[fetchRecentActivity]
  A --> AL[demand_audit_logs]
  A --> CM[demand_comments]
  H --> I[buildInsights (local heuristics)]
  H --> P[getProfilesByIds]
  H -- realtime --> RT[(supabase realtime channels)]
```

Fluxo:
1. `useOperationsData` chama, em paralelo, `listDemands`, `getUserWorkloads`, `fetchDeflectionStats` e `listNotifications`.
2. Deriva `metrics` (`computeMetrics`), `buckets`, `critical` (`rankCritical`) e `insights` (`buildInsights`) — tudo puro, testável.
3. Um segundo `useQuery` resolve perfis (avatar/nome) dos ids que aparecem em fila, atividade e equipe.

## Realtime
Um único canal Supabase por instância da página se inscreve em `demands`, `demand_audit_logs` e `demand_comments`. Cada evento invalida a snapshot; nenhum novo mecanismo foi criado. Cleanup via `supabase.removeChannel` no `useEffect`.

## Componentes
- `MetricCard`, `HealthCard` — cartões reutilizáveis.
- `CriticalItems` — fila ranqueada por `scoreDemand`.
- `TeamWorkload` — leitura de `get_user_workloads` + `profiles`.
- `LiveActivity` — timeline unificada.
- `AIInsightsPanel` — sugestões locais (sem chamadas a edge functions).
- `OperationsPage` — orquestrador com grid responsivo (mobile → TV Full HD).

## Insights (heurísticas locais)
`buildInsights` produz sugestões (nunca ações) a partir dos dados já carregados:
- SLA vencido / prestes a estourar (janela de 2h).
- Solicitações sem responsável ≥ 3.
- Sobrecarga: atendente com ≥ 2× a mediana da equipe e pelo menos 4 ativos.
- Categoria concentrando ≥ 5 solicitações (sugere criar artigo na base).

## Roadmap
- Feedback do gestor sobre insights (👍/👎) para calibrar limiares.
- Camada "TV Mode" fullscreen sem menu lateral.
- Integração com o Ecossistema (mapa vivo) para sinalizar integrações com erro.
- Filtros por sistema, tipo e período direto no header do Centro de Operações.
