import { memo } from "react";
import { FileText } from "lucide-react";
import { Section } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DOC_GROUPS, DOC_TOTAL } from "../documentation/docsIndex";

export const DocumentationCenterPanel = memo(function DocumentationCenterPanel() {
  const linked = DOC_GROUPS.reduce((s, g) => s + g.items.length, 0);
  const coverage = Math.min(100, Math.round((linked / DOC_TOTAL) * 100));

  return (
    <Section title="Documentation Center" description={`Cobertura: ${linked}/${DOC_TOTAL} documentos indexados.`}>
      <Card className="surface-1 mb-3">
        <CardContent className="pt-4">
          <Progress value={coverage} className="h-2" />
          <div className="mt-2 text-xs text-muted-foreground">{coverage}% dos documentos oficiais estão referenciados no Quality Center.</div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DOC_GROUPS.map((g) => (
          <Card key={g.id} className="surface-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-primary" aria-hidden />
                {g.label}
                <Badge variant="secondary" className="ml-auto text-[10px]">{g.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {g.items.map((doc) => (
                  <li key={doc.file} className="truncate">
                    <span className="text-foreground">{doc.title}</span>
                    <span className="ml-1 text-muted-foreground">— {doc.file}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
});
