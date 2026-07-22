import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface HealthCardProps {
  title: string;
  value: number | null;
  unit?: string;
  hint?: string;
}

export function HealthCard({ title, value, unit = "%", hint }: HealthCardProps) {
  const v = value == null ? null : Math.max(0, Math.min(100, value));
  const tone = v == null ? "text-muted-foreground" : v >= 85 ? "text-success" : v >= 60 ? "text-warning" : "text-destructive";
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={cn("text-2xl font-semibold", tone)}>
          {v == null ? "—" : `${v.toFixed(1)}${unit}`}
        </div>
        <Progress value={v ?? 0} aria-label={title} />
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
