import {
  PortalShell,
  PortalHeader,
  PortalQuickCreate,
  PortalRecentDemands,
  PortalKnowledgeSection,
  PortalInboxPreview,
} from "@/modules/portal-unified";

export default function PortalUnifiedHome() {
  return (
    <PortalShell>
      <PortalHeader />
      <PortalQuickCreate />
      <PortalRecentDemands />
      <PortalKnowledgeSection />
      <PortalInboxPreview />
    </PortalShell>
  );
}
