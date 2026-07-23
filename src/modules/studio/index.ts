export { StudioShell } from "./components/StudioShell";
export { studioReducer, createEmptyDocument, nodeFromSpec, useStudio } from "./store";
export { STUDIO_COMPONENTS, findComponentSpec } from "./registry/components";
export { BINDING_KINDS, findBindingKind } from "./registry/bindings";
export type {
  StudioDocument,
  StudioNode,
  StudioBinding,
  StudioBindingKind,
  StudioViewport,
  StudioBreakpoint,
  StudioTheme,
  StudioState,
} from "./types";
