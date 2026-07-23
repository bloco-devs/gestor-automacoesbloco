import { describe, it, expect } from "vitest";
import { studioReducer, createEmptyDocument } from "../store";
import type { StudioState } from "../types";

function makeState(): StudioState {
  return {
    doc: createEmptyDocument("Teste"),
    selectedId: null,
    viewport: { breakpoint: "lg", theme: "light", snap: true, grid: true },
    past: [],
    future: [],
  };
}

describe("studioReducer", () => {
  it("adiciona nó como filho da raiz", () => {
    const s0 = makeState();
    const s1 = studioReducer(s0, { type: "add", nodeType: "button" });
    expect(s1.doc.root.children).toHaveLength(1);
    expect(s1.doc.root.children?.[0].type).toBe("button");
    expect(s1.selectedId).toBe(s1.doc.root.children?.[0].id);
  });

  it("permite undo e redo", () => {
    const s0 = makeState();
    const s1 = studioReducer(s0, { type: "add", nodeType: "button" });
    const s2 = studioReducer(s1, { type: "undo" });
    expect(s2.doc.root.children).toHaveLength(0);
    const s3 = studioReducer(s2, { type: "redo" });
    expect(s3.doc.root.children).toHaveLength(1);
  });

  it("duplica um nó existente", () => {
    let state = makeState();
    state = studioReducer(state, { type: "add", nodeType: "card" });
    const cardId = state.doc.root.children![0].id;
    state = studioReducer(state, { type: "duplicate", id: cardId });
    expect(state.doc.root.children).toHaveLength(2);
    expect(state.doc.root.children![1].id).not.toBe(cardId);
  });

  it("remove nó e ignora root", () => {
    let state = makeState();
    state = studioReducer(state, { type: "add", nodeType: "input" });
    const id = state.doc.root.children![0].id;
    state = studioReducer(state, { type: "remove", id });
    expect(state.doc.root.children).toHaveLength(0);
    state = studioReducer(state, { type: "remove", id: state.doc.root.id });
    expect(state.doc.root.id).toBeTruthy();
  });

  it("atualiza props e bindings", () => {
    let state = makeState();
    state = studioReducer(state, { type: "add", nodeType: "button" });
    const id = state.doc.root.children![0].id;
    state = studioReducer(state, { type: "updateProps", id, props: { label: "OK" } });
    expect(state.doc.root.children![0].props.label).toBe("OK");
    state = studioReducer(state, {
      type: "upsertBinding",
      binding: { id: "b1", kind: "mesh", target: "mesh://x" },
    });
    state = studioReducer(state, { type: "setBinding", id, prop: "label", bindingId: "b1" });
    expect(state.doc.root.children![0].bindings?.label).toBe("b1");
    state = studioReducer(state, { type: "setBinding", id, prop: "label", bindingId: null });
    expect(state.doc.root.children![0].bindings?.label).toBeUndefined();
  });
});
