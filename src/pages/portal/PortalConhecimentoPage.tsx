import { PortalShell, PortalKnowledgeSection } from "@/modules/portal-unified";

export default function PortalConhecimentoPage() {
  return (
    <PortalShell>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Artigos, manuais e procedimentos — encontre respostas antes de abrir uma demanda.
        </p>
      </header>
      <PortalKnowledgeSection />
    </PortalShell>
  );
}
