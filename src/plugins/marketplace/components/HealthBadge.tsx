import { Badge } from "@/components/ui/badge";
import type { PluginHealth } from "../types";

export function HealthBadge({ health }: { health: PluginHealth | null }) {
  if (!health) return <Badge variant="outline">–</Badge>;
  const map: Record<PluginHealth["lifecycleState"], "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    loaded: "secondary",
    disabled: "outline",
    error: "destructive",
    pending: "outline",
  };
  return <Badge variant={map[health.lifecycleState]}>{health.lifecycleState}</Badge>;
}
