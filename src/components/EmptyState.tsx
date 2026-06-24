import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("surface-1", className)}>
      <CardContent className="py-12 flex flex-col items-center text-center gap-3">
        {Icon && (
          <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
            <Icon className="size-6" />
          </div>
        )}
        <div className="space-y-1 max-w-md">
          <h3 className="font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}

export default EmptyState;
