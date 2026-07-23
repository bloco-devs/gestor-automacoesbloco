# 78 — Low-Code (Modelo de Documento)

## Modelo
```ts
StudioDocument = {
  id: string;
  name: string;
  version: string;         // semver do rascunho
  root: StudioNode;
  bindings: Record<string, StudioBinding>;
  meta: { createdAt: string; updatedAt: string };
}

StudioNode = {
  id: string;
  type: string;            // id no Component Registry
  props: Record<string, unknown>;
  style?: Record<string, string>;
  responsive?: Record<"sm" | "md" | "lg" | "xl", Record<string, unknown>>;
  bindings?: Record<string, string>; // prop → bindingId
  children?: StudioNode[];
}

StudioBinding = {
  id: string;
  kind: "query" | "mesh" | "analytics" | "knowledge" | "workflow" | "routing" | "ai" | "flag" | "setting";
  target: string;          // rota lógica ("service.knowledge.list" etc.)
  params?: Record<string, unknown>;
  cache?: { staleMs?: number };
}
```

## Regras
- Bindings são apenas **configuração**. O Studio não executa side effects, apenas registra o *contract*.
- Cada `type` referencia um item do Component Registry, com metadados de props, ícones e slots.
- Layout é serializável 1:1 para JSON — export/import determinístico.

## Undo/Redo
- Toda mutação passa por um reducer puro.
- Histórico: pilha `past[]` / `future[]`, limite 50 estados.
- Snap e grid não são gravados no histórico.
