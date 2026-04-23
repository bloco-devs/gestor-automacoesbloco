import { Link, NavLink, useLocation } from "react-router-dom";
import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid place-items-center size-8 rounded-md bg-accent text-accent-foreground">
            <Blocks className="size-4" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">Bloco</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Construções
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(l.to);
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {l.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
