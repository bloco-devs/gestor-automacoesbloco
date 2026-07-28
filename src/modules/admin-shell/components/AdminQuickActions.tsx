import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ADMIN_QUICK_ACTIONS } from "../navigation/registry";

export function AdminQuickActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ADMIN_QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Button key={a.id} asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <Link to={a.href}>
              <Icon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{a.label}</span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
