# `/ecossistema-eventos` — o endpoint que o HUB ainda não tem

Proposta para o **HUB Bloco ID**. Nada disto está implementado neste
repositório, e nenhum endpoint falso foi criado — este documento existe para
que a Entrega 2/3 tenha um alvo escrito.

## Por que precisa existir

Hoje o Escritório descobre o que aconteceu comparando dois retratos
consecutivos de `/ecossistema-catalogo`. Isso funciona e é honesto, mas tem
três limites que **nenhum código deste lado consegue contornar**:

1. **Granularidade de 60 segundos.** É o intervalo do refresh. Uma falha que
   acontece e se resolve dentro do mesmo minuto é invisível.
2. **Não se sabe qual integração caiu.** O retrato agrega por sistema. Por
   isso o BLINK diz "o RH entrou em falha" e nunca "a integração X caiu" —
   dizer o segundo seria inventar.
3. **Não existe ciclo de vida.** Só dá para deduzir `novo` e `resolvido`.
   Estados como `reconhecido` ou `em análise` não existem na fonte, e por
   isso não foram implementados.

## O que o endpoint precisaria devolver

Uma ocorrência por linha, não um agregado:

| campo | obrigatório | para quê |
|---|---|---|
| `id` | sim | deduplicação de verdade, no lugar da chave sintética `tipo:sistema:ciclo` |
| `tipo` | sim | `integracao_falhou`, `integracao_recuperou`, `execucao_falhou`, … |
| `sistema` | sim | slug do sistema afetado — o mesmo que identifica o BLINK |
| `integracao` | desejável | qual integração, para a fala poder ser específica |
| `timestamp` | sim | quando aconteceu de fato, não quando foi observado |
| `status` | desejável | ciclo de vida da ocorrência no HUB |
| `severidade` | desejável | alimenta a prioridade da fila sem heurística deste lado |
| `origem`/`destino` | desejável | quando o HUB já souber quem precisa ser avisado |

Paginação por `desde=<timestamp>` bastaria; não é preciso WebSocket para
começar.

## O que muda deste lado quando existir

Uma implementação nova de `FonteDeEventos` em
`src/modules/escritorio/eventos.ts`:

```ts
export function fonteDoHub(): FonteDeEventos { /* GET /ecossistema-eventos */ }
```

E só. A fila, os cooldowns, o agrupamento, o motor, o pathfinding, o balão e o
BLINK não são tocados — foi para isso que a interface existe.

Os campos `integracao`, `severidade` e `status` já estão declarados como
opcionais em `EventoEcossistema`, esperando.
