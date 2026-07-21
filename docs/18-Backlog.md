# Backlog

Lista de futuras funcionalidades **sem implementação**. Priorização será feita nas cerimônias de planejamento; itens marcados `MUST` precisam de decisão antes da próxima release.

## Índice
- [Segurança e RLS](#segurança-e-rls)
- [IA](#ia)
- [Atividades](#atividades)
- [Importador](#importador)
- [Frontend & DX](#frontend--dx)
- [Observabilidade](#observabilidade)
- [Integrações](#integrações)
- [Documentação](#documentação)

## Segurança e RLS
- [ ] `MUST` Endurecer RLS de `atividades_*` por board.
- [ ] Auditar policies do Diagrama.
- [ ] Fechar warnings de `SECURITY DEFINER` sem `SET search_path`.
- [ ] Rotação periódica de segredos do HUB.

## IA
- [ ] Streaming de respostas nas funções longas (`resumo-pipeline`, `mapa-narrativa`).
- [ ] Cache curto para prompts repetidos.
- [ ] Métrica de qualidade (thumbs up/down por sugestão).
- [ ] Fallback offline para triagem básica (heurística local).

## Atividades
- [ ] Reorder intra-coluna com granularidade fina (débito G10).
- [ ] Filtros salvos por usuário.
- [ ] Notificações realtime por menção `@` em comentários.
- [ ] Exportação de board em PDF/CSV.
- [ ] Automations do tipo "quando mover para X, atribuir Y".

## Importador
- [ ] Adapter Jira.
- [ ] Adapter Asana.
- [ ] Preview visual do dry-run (thumbs de card).
- [ ] Reimportação incremental.

## Frontend & DX
- [ ] Code-splitting por rota.
- [ ] `strictNullChecks` em `tsconfig`.
- [ ] Storybook interno para UX kit.
- [ ] Testes E2E (Playwright) dos fluxos críticos.
- [ ] Migrar `useSupabaseQuery` → `useQuery` puro.

## Observabilidade
- [ ] Painel de custo de IA (tokens × R$).
- [ ] Alertas Supabase (Realtime droprate, RLS deny rate).
- [ ] Health-check unificado do HUB.

## Integrações
- [ ] Webhooks para sistemas Bloco reagirem a eventos.
- [ ] SDK interno para novos módulos.
- [ ] Integração leitura Sienge — melhorias de mapeamento.

## Documentação
- [ ] Diagramas de sequência para cada RPC crítica.
- [ ] Runbooks operacionais (incidente HUB down, Realtime down).
- [ ] Guia de onboarding do dev em `/docs/onboarding.md`.
