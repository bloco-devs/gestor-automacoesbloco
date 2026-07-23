# PLUGIN 006 — Event Automation SDK

Infraestrutura oficial e aditiva para que plugins registrem publishers, subscribers, interceptors, middlewares e pipelines sobre o barramento de eventos da plataforma — sem modificar o Core.

## Arquitetura

```
src/platform-sdk/event-sdk/
  types/            EventEnvelope, Publisher, Subscriber, Interceptor,
                    Middleware, Pipeline, DispatchResult
  registry/         EventExtensionRegistry (in-memory, dedup por kind:id)
  dispatcher/       dispatchEvent() — lifecycle completo
  middleware/       runMiddleware() — pipeline Express-like (ctx / next)
  pipeline/         definePipeline, describePipeline
  contracts/        service.event-sdk (mesh contract)
  bootstrap/        bootstrapEventSdkProvider() — provider mesh idempotente
  diagnostics/      snapshot (registry, timing, últimas execuções, fila, erros)
  hooks/            useEventExtensions, useEventSdkDiagnostics
  components/       EventSdkPanel (Sandbox tab)
```

Todo consumo é via Service Mesh (`service.event-sdk`). Nenhum plugin importa outro plugin diretamente. O SDK é 100% aditivo — o Event Bus atual permanece compatível.

## Lifecycle de um dispatch

```
publish(event, payload)
  └─ beforePublish (middleware)
  └─ interceptors  (cancel | rewritePayload | rewriteMetadata |
                    changePriority | skipSubscriber | continue)
  └─ beforeDispatch
  └─ para cada subscriber ordenado por priority:
       beforeSubscriber → handler → afterSubscriber
  └─ afterDispatch
  └─ afterPublish
```

`DispatchResult` retorna `invoked`, `skipped`, `errors`, `cancelled`, `durationMs`. O dispatcher **nunca lança**.

## Middlewares (Express-like)

```ts
{
  kind: "middleware",
  phase: "beforePublish" | ["beforeDispatch", "afterDispatch"],
  priority: 10,
  run: async (ctx, next) => {
    ctx.rewrite({ metadata: { tagged: true } });
    await next();
  }
}
```

`ctx` expõe: `phase`, `env`, `subscriberId?`, `rewrite`, `cancel`, `metrics`. Erros de middleware não interrompem a cadeia.

## Interceptors

Executados **entre** `beforePublish` e `beforeDispatch`. Retornam uma `InterceptorDecision`:

- `continue` · `cancel` · `rewritePayload` · `rewriteMetadata` · `changePriority` · `skipSubscriber`

## Prioridades

Menor número = executa antes. Aplicável a `subscribers`, `interceptors` e `middlewares`.

## Boas práticas

- Handlers de subscribers devem ser idempotentes e resilientes a erro.
- Use `filter` para curto-circuito no próprio subscriber quando o payload não interessar.
- Prefira `middleware` em vez de mutar `env` manualmente; sempre chame `next()`.
- Interceptors devem ser rápidos: rodam em série antes do dispatch.
- Publique via `eventSdkService.publish()` resolvido pelo Service Mesh — nunca importe o dispatcher diretamente em outros plugins.

## Sandbox

`/admin/sdk` → aba **Event SDK** mostra: totais por kind, publicações, canceladas, tempo médio, eventos recentes e últimos dispatches.

## Marketplace

Extensões registradas via `pluginId` aparecem automaticamente no snapshot do `EventExtensionRegistry` — o Marketplace pode consumir `eventSdkService.diagnostics()` para reconhecer plugins ativos.

## Plugin de exemplo

`src/plugins/event-automation/` registra 2 publishers, 3 subscribers, 2 middlewares, 1 interceptor e 1 pipeline exclusivamente via SDK.

## Roadmap

- Retry/backoff configurável por subscriber.
- Async fan-out em fila persistente (opt-in por evento).
- Assinatura remota de publishers via Repository API.
- Painel de replay a partir do histórico circular.
