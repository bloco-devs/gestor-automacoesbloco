/**
 * Service Mesh — public API.
 * PLUGIN 003 · Federation. Aditivo. Zero mudança no core.
 */
export * from "./contracts";
export { serviceMesh, type ServiceMesh } from "./mesh/mesh";
export { serviceRegistry, type ServiceRecord, type ServiceHealth, type ServiceStatus, type ServiceVisibility } from "./registry/registry";
export { provide, disposeAllForPlugin, type ProvideOptions, type ProviderHandle } from "./providers";
export { resolve, optional, required, describe, type ResolveOptions } from "./consumer";
export { discover, listContracts, type DiscoveryQuery } from "./discovery";
export { checkCapabilities, versionSatisfies } from "./mesh/capability-resolver";
export {
  recordMeshEvent,
  meshEventHistory,
  subscribeMeshEvents,
  __resetMeshDiagnostics,
  type MeshEvent,
  type MeshEventKind,
} from "./diagnostics";
export { useServices, useServicesByContract, useService, useMeshEvents } from "./hooks";
export { bootstrapBuiltInProviders, teardownBuiltInProviders, isBootstrapped } from "./bootstrap/builtins";
