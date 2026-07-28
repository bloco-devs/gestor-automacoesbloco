import { lazy, Suspense } from "react";
import { PageShell, PageHeader } from "@/design-system";
import { Loader2 } from "lucide-react";

const PlatformOverviewPanel = lazy(() => import("./components/PlatformOverviewPanel").then((m) => ({ default: m.PlatformOverviewPanel })));
const QualityScorePanel = lazy(() => import("./components/QualityScorePanel").then((m) => ({ default: m.QualityScorePanel })));
const ReleaseReadinessPanel = lazy(() => import("./components/ReleaseReadinessPanel").then((m) => ({ default: m.ReleaseReadinessPanel })));
const ArchitectureCatalogPanel = lazy(() => import("./components/ArchitectureCatalogPanel").then((m) => ({ default: m.ArchitectureCatalogPanel })));
const DependencyMapPanel = lazy(() => import("./components/DependencyMapPanel").then((m) => ({ default: m.DependencyMapPanel })));
const ReuseDashboardPanel = lazy(() => import("./components/ReuseDashboardPanel").then((m) => ({ default: m.ReuseDashboardPanel })));
const CodeHealthPanel = lazy(() => import("./components/CodeHealthPanel").then((m) => ({ default: m.CodeHealthPanel })));
const DocumentationCenterPanel = lazy(() => import("./components/DocumentationCenterPanel").then((m) => ({ default: m.DocumentationCenterPanel })));
const TechnicalDebtPanel = lazy(() => import("./components/TechnicalDebtPanel").then((m) => ({ default: m.TechnicalDebtPanel })));
const FeatureTimelinePanel = lazy(() => import("./components/FeatureTimelinePanel").then((m) => ({ default: m.FeatureTimelinePanel })));

function Fallback() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Carregando painel…
    </div>
  );
}

export default function GovernancePage() {
  return (
    <PageShell>
      <PageHeader
        title="Quality Center"
        subtitle="Governança técnica da plataforma — catalog, saúde, dependências, reuso e documentação. Somente leitura."
      />
      <Suspense fallback={<Fallback />}>
        <PlatformOverviewPanel />
        <QualityScorePanel />
        <ReleaseReadinessPanel />
        <ArchitectureCatalogPanel />
        <DependencyMapPanel />
        <ReuseDashboardPanel />
        <CodeHealthPanel />
        <DocumentationCenterPanel />
        <TechnicalDebtPanel />
        <FeatureTimelinePanel />
      </Suspense>
    </PageShell>
  );
}
