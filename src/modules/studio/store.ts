/**
 * Studio Store — reducer puro + hook.
 * Sem side effects fora da fronteira `persistence.ts`.
 */
import { useCallback, useEffect, useMemo, useReducer } from "react";
import type {
  StudioBinding,
  StudioDocument,
  StudioNode,
  StudioState,
  StudioViewport,
} from "./types";
import { findComponentSpec } from "./registry/components";
import { loadDoc, saveDoc } from "./persistence";

const HISTORY_LIMIT = 50;

function uid(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyDocument(name = "Novo rascunho"): StudioDocument {
  return {
    id: uid("doc"),
    name,
    version: "0.1.0",
    root: {
      id: "root",
      type: "section",
      props: { title: "Página inicial", description: "Arraste componentes aqui." },
      children: [],
    },
    bindings: {},
    meta: { createdAt: nowIso(), updatedAt: nowIso() },
  };
}

export function nodeFromSpec(type: string): StudioNode | null {
  const spec = findComponentSpec(type);
  if (!spec) return null;
  const props: Record<string, unknown> = {};
  for (const p of spec.props) {
    if (p.defaultValue !== undefined) props[p.key] = p.defaultValue;
  }
  return {
    id: uid(),
    type,
    props,
    children: spec.acceptsChildren ? [] : undefined,
  };
}

/* ─── Recursion helpers (imutáveis) ────────────────────────────── */

function mapTree(root: StudioNode, fn: (n: StudioNode) => StudioNode): StudioNode {
  const mapped = fn(root);
  if (!mapped.children) return mapped;
  return { ...mapped, children: mapped.children.map((c) => mapTree(c, fn)) };
}

function findNode(root: StudioNode, id: string): StudioNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function findParent(root: StudioNode, id: string): StudioNode | null {
  if (!root.children) return null;
  for (const c of root.children) {
    if (c.id === id) return root;
    const found = findParent(c, id);
    if (found) return found;
  }
  return null;
}

function removeById(root: StudioNode, id: string): { root: StudioNode; removed: StudioNode | null } {
  let removed: StudioNode | null = null;
  const newRoot = mapTree(root, (n) => {
    if (!n.children) return n;
    const next = n.children.filter((c) => {
      if (c.id === id) {
        removed = c;
        return false;
      }
      return true;
    });
    return next === n.children ? n : { ...n, children: next };
  });
  return { root: newRoot, removed };
}

function insertChild(root: StudioNode, parentId: string, node: StudioNode, index?: number): StudioNode {
  return mapTree(root, (n) => {
    if (n.id !== parentId) return n;
    if (!n.children) return n;
    const next = [...n.children];
    if (index === undefined || index < 0 || index > next.length) next.push(node);
    else next.splice(index, 0, node);
    return { ...n, children: next };
  });
}

function cloneWithNewIds(node: StudioNode): StudioNode {
  return {
    ...node,
    id: uid(),
    children: node.children?.map(cloneWithNewIds),
  };
}

/* ─── Reducer ──────────────────────────────────────────────────── */

export type StudioAction =
  | { type: "add"; nodeType: string; parentId?: string; index?: number }
  | { type: "select"; id: string | null }
  | { type: "move"; id: string; parentId: string; index?: number }
  | { type: "duplicate"; id: string }
  | { type: "remove"; id: string }
  | { type: "updateProps"; id: string; props: Record<string, unknown> }
  | { type: "updateStyle"; id: string; style: Record<string, string> }
  | { type: "setBinding"; id: string; prop: string; bindingId: string | null }
  | { type: "upsertBinding"; binding: StudioBinding }
  | { type: "removeBinding"; bindingId: string }
  | { type: "rename"; name: string }
  | { type: "viewport"; viewport: Partial<StudioViewport> }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "hydrate"; doc: StudioDocument }
  | { type: "reset" };

function pushHistory(state: StudioState, nextDoc: StudioDocument): StudioState {
  const past = [...state.past, state.doc].slice(-HISTORY_LIMIT);
  return { ...state, doc: { ...nextDoc, meta: { ...nextDoc.meta, updatedAt: nowIso() } }, past, future: [] };
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "add": {
      const node = nodeFromSpec(action.nodeType);
      if (!node) return state;
      const parentId = action.parentId ?? state.doc.root.id;
      const nextRoot = insertChild(state.doc.root, parentId, node, action.index);
      return pushHistory({ ...state, selectedId: node.id }, { ...state.doc, root: nextRoot });
    }
    case "select":
      return { ...state, selectedId: action.id };
    case "move": {
      const { root: without, removed } = removeById(state.doc.root, action.id);
      if (!removed) return state;
      const nextRoot = insertChild(without, action.parentId, removed, action.index);
      return pushHistory(state, { ...state.doc, root: nextRoot });
    }
    case "duplicate": {
      const target = findNode(state.doc.root, action.id);
      const parent = findParent(state.doc.root, action.id);
      if (!target || !parent || !parent.children) return state;
      const idx = parent.children.findIndex((c) => c.id === action.id);
      const clone = cloneWithNewIds(target);
      const nextRoot = insertChild(state.doc.root, parent.id, clone, idx + 1);
      return pushHistory({ ...state, selectedId: clone.id }, { ...state.doc, root: nextRoot });
    }
    case "remove": {
      if (action.id === state.doc.root.id) return state;
      const { root: nextRoot } = removeById(state.doc.root, action.id);
      return pushHistory(
        { ...state, selectedId: state.selectedId === action.id ? null : state.selectedId },
        { ...state.doc, root: nextRoot },
      );
    }
    case "updateProps": {
      const nextRoot = mapTree(state.doc.root, (n) =>
        n.id === action.id ? { ...n, props: { ...n.props, ...action.props } } : n,
      );
      return pushHistory(state, { ...state.doc, root: nextRoot });
    }
    case "updateStyle": {
      const nextRoot = mapTree(state.doc.root, (n) =>
        n.id === action.id ? { ...n, style: { ...(n.style ?? {}), ...action.style } } : n,
      );
      return pushHistory(state, { ...state.doc, root: nextRoot });
    }
    case "setBinding": {
      const nextRoot = mapTree(state.doc.root, (n) => {
        if (n.id !== action.id) return n;
        const bindings = { ...(n.bindings ?? {}) };
        if (action.bindingId) bindings[action.prop] = action.bindingId;
        else delete bindings[action.prop];
        return { ...n, bindings };
      });
      return pushHistory(state, { ...state.doc, root: nextRoot });
    }
    case "upsertBinding": {
      const bindings = { ...state.doc.bindings, [action.binding.id]: action.binding };
      return pushHistory(state, { ...state.doc, bindings });
    }
    case "removeBinding": {
      const bindings = { ...state.doc.bindings };
      delete bindings[action.bindingId];
      return pushHistory(state, { ...state.doc, bindings });
    }
    case "rename":
      return pushHistory(state, { ...state.doc, name: action.name });
    case "viewport":
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: rest,
      };
    }
    case "hydrate":
      return { ...state, doc: action.doc, past: [], future: [], selectedId: null };
    case "reset":
      return { ...state, doc: createEmptyDocument(), past: [], future: [], selectedId: null };
    default:
      return state;
  }
}

/* ─── Hook ─────────────────────────────────────────────────────── */

function initialState(): StudioState {
  const doc = loadDoc() ?? createEmptyDocument();
  return {
    doc,
    selectedId: null,
    viewport: { breakpoint: "lg", theme: "light", snap: true, grid: true },
    past: [],
    future: [],
  };
}

export function useStudio() {
  const [state, dispatch] = useReducer(studioReducer, undefined, initialState);

  useEffect(() => {
    saveDoc(state.doc);
  }, [state.doc]);

  const selectedNode = useMemo(
    () => (state.selectedId ? findNode(state.doc.root, state.selectedId) : null),
    [state.selectedId, state.doc.root],
  );

  const findById = useCallback((id: string) => findNode(state.doc.root, id), [state.doc.root]);

  return { state, dispatch, selectedNode, findById };
}

export { findNode, findParent };
