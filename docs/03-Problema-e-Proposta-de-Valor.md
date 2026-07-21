# Problema e Proposta de Valor

## Índice
- [Contexto](#contexto)
- [Problemas](#problemas)
- [Consequências](#consequências)
- [Proposta de valor](#proposta-de-valor)
- [Métricas de sucesso](#métricas-de-sucesso)

## Contexto
A Bloco Construções operava com pedidos de automação dispersos (chats, e-mails, planilhas), Trello externo para execução e nenhum inventário confiável das integrações internas. A demanda cresceu junto com o time de Automações, mas a visibilidade não acompanhou.

## Problemas
1. **Captura fragmentada** — pedidos entravam por canais distintos, sem padrão.
2. **Priorização subjetiva** — sem score, o mais barulhento ganhava.
3. **Duplicidade** — várias áreas pedindo a mesma coisa sem saber.
4. **Ecossistema opaco** — ninguém sabia qual integração estava falhando.
5. **Ferramenta externa** — Trello concentrava execução mas não dados de negócio.
6. **Falta de auditoria de IA** — sem log de quem/como consumiu tokens.

## Consequências
- Retrabalho.
- Automações órfãs (sem dono).
- SLA imprevisível.
- Diretoria sem visão de ROI.

## Proposta de valor
Um cockpit único que:
- Padroniza a **entrada** (nova solicitação com IA de triagem).
- Padroniza a **priorização** (score server-side).
- Padroniza a **execução** (Atividades Kanban interno).
- Torna o **ecossistema visível** (mapa vivo do HUB).
- Torna a **IA auditável** (`ia_uso_log`).

## Métricas de sucesso
| Métrica | Alvo |
| --- | --- |
| Tempo médio da 1ª triagem | < 24h |
| % demandas com score final | > 90% |
| Demandas duplicadas evitadas / mês | Crescente |
| Uptime Realtime Atividades | > 99% |
| Fallback IA (HUB down) | < 5% do total |
