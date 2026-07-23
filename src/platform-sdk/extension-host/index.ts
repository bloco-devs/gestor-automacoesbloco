/**
 * Extension Host — API pública (PLUGIN 004).
 * A camada acima do Plugin Host que orquestra Repositories, Packages,
 * Validator, Signature, Versioning e o Loader.
 */
export {
  loadFromRepositories,
  bootExtensionHost,
} from "./loader";
export type { LoaderEntry, LoaderReport } from "./loader";
export { diagnoseRepositories } from "../diagnostics/repository";
export type {
  RepositoryDiagnosticsReport,
} from "../diagnostics/repository";
export {
  pluginRepositoryRegistry,
  bootstrapDefaultRepositories,
  PluginRepositoryRegistry,
  BundledRepository,
  LocalRepository,
  RemoteRepository,
} from "../repository";
export type {
  PluginPackage,
  PluginRepository,
  PackageMetadata,
  PackageSignature,
  RepositoryKind,
  BundledSource,
  RemoteRepositoryOptions,
  RepositoryDiagnosticsEntry,
} from "../repository";
export {
  signManifest,
  verifyManifestSignature,
  isTrustedPublisher,
  canonicalize,
  sha256,
} from "../signature";
export {
  satisfies,
  compareVersions,
  parseVersion,
  checkHostCompatibility,
  SDK_VERSION,
  HOST_VERSION,
} from "../versioning";
export { validatePackage } from "../manifest";
export type { ExtendedValidationResult } from "../manifest";
