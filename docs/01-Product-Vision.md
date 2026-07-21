# Product Vision

## Índice
- [Missão](#missão)
- [Visão](#visão)
- [Objetivos](#objetivos)
- [Diferenciais](#diferenciais)
- [Público](#público)
- [Problemas resolvidos](#problemas-resolvidos)
- [Proposta de valor](#proposta-de-valor)

## Missão
Dar à Bloco Construções um único lugar para **capturar, priorizar, executar e medir** demandas de automação e aplicativos internos, com IA embarcada e visão viva do ecossistema.

## Visão
Ser o **cockpit** dos times de tecnologia interna da Bloco: nenhuma demanda perdida, nenhuma automação órfã, decisão de priorização baseada em score objetivo e dados do HUB.

## Objetivos
1. Reduzir o tempo entre pedido do usuário e entrega da automação.
2. Eliminar duplicidade de esforço (detecção de demandas similares por IA).
3. Tornar visíveis os riscos do ecossistema (saúde das integrações).
4. Padronizar priorização (score `frequência + complexidade + retorno` calculado no servidor).
5. Dar aos desenvolvedores um Kanban de nível Trello sem sair do sistema.

## Diferenciais
- **IA server-authoritative**: sugere, mas nunca decide o score.
- **Mapa vivo do Ecossistema** lendo o HUB Bloco ID em tempo real (com fallback seed).
- **Importador Trello** (RFC-001) para migração assistida.
- **SSO Bloco ID** unificado.
- **Realtime nativo** em Atividades (REPLICA IDENTITY FULL).
- Observabilidade dedicada de IA (`/observabilidade-ia`, `ia_uso_log`).

## Público
Áreas internas da Bloco Construções (Obras, Comercial, Financeiro, TI, Diretoria) e o time de Automações que as atende.

## Problemas resolvidos
| Antes | Depois |
| --- | --- |
| Pedidos em e-mail/WhatsApp | Formulário único com IA de triagem |
| Priorização subjetiva | Score calculado no servidor |
| Duplicidade de demandas | Detecção automática de similares |
| Integrações opacas | Mapa vivo colorido por saúde |
| Kanban externo (Trello) | Kanban interno com importador |

## Proposta de valor
> "Cada demanda entra uma única vez, é priorizada com base em dados, executada com rastreabilidade e concluída sem depender de ferramenta externa."
