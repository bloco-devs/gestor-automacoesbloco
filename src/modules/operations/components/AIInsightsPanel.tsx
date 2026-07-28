import { Link } from "react-router-dom";
import { Lightbulb, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OperationsInsight } from "../types";

const ICONS = { info: Info, attention: AlertTriangle, risk: AlertOctagon } as const;
const TONE = {
  info: "text-info",
  attention: "text-warning",
  risk: "text-destructive",
} as const;

export function AIInsightsPanel({ insights }: { insights: OperationsInsight[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          Insights (sugestões)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tudo tranquilo por aqui. Nenhum padrão que exija sua atenção agora.
          </p>
        ) : null}
        {insights.map((i) => {
          const Icon = ICONS[i.severity];
          return (
            <div key={i.id} className="flex gap-3 rounded-md border p-3">
              <Icon className={cn("size-4 mt-0.5", TONE[i.severity])} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.detail}</p>
                {i.action ? (
                  <Button asChild size="sm" variant="link" className="px-0 h-7">
                    <Link to={i.action.href}>{i.action.label}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
