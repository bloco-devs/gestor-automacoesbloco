import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Section } from "@/design-system";
import { useFeatureFlags, ALL_FLAGS } from "@/hooks/useFeatureFlags";
import { AdminShellLayout } from "./layout/AdminShellLayout";
import { ADMIN_GROUPS, ADMIN_NAV } from "./navigation/registry";

/**
 * DS 3.0 — Centro Administrativo
 *
 * Antes: ~30 cards quadrados empilhados em grid, cada um com borda, sombra e
 * ícone colorido — o retrato do "dashboard genérico". Agora: listas de
 * navegação separadas por hairline, no padrão de GitHub Settings / Vercel.
 * Mesmíssimos destinos, mesmos ícones, mesmos textos — nenhuma rota mudou.
 */
export default function AdminShellPage() {
  const { flags, setFlag } = useFeatureFlags();
  return (
    <AdminShellLayout>
      <div className="space-y-10">
        <header className="space-y-1">
          <h1 className="ds-h1">Centro Administrativo</h1>
          <p className="ds-caption max-w-2xl text-muted-foreground">
            Ponto único de navegação para plataforma, IA, operacional, segurança e desenvolvimento.
          </p>
        </header>

        {ADMIN_GROUPS.map((group) => {
          const items = ADMIN_NAV.filter((it) => it.group === group.id);
          if (!items.length) return null;
          return (
            <Section key={group.id} title={group.label} description={group.description}>
              <ul className="-mx-2 divide-y divide-border/50">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        className="group flex items-center gap-3 rounded-md px-2 py-2.5 outline-none transition-colors duration-fast ease-standard hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                          <span className="ds-body-strong flex items-center gap-2 truncate">
                            {item.label}
                            {item.status ? <Badge className="shrink-0">{item.status}</Badge> : null}
                          </span>
                          <span className="ds-caption truncate text-muted-foreground">{item.description}</span>
                        </div>
                        <ChevronRight
                          className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/70"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          );
        })}

        <Section title="Feature flags" description="Controles locais (por navegador). Não afetam outros usuários.">
          <div className="divide-y divide-border/50">
            {ALL_FLAGS.map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-6 py-3">
                <div className="min-w-0">
                  <Label htmlFor={`flag-${f.key}`} className="ds-body-strong">
                    {f.label}
                  </Label>
                  <p className="ds-caption mt-0.5 text-muted-foreground">{f.description}</p>
                </div>
                <Switch
                  id={`flag-${f.key}`}
                  checked={flags[f.key] ?? f.defaultValue}
                  onCheckedChange={(v) => setFlag(f.key, v)}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AdminShellLayout>
  );
}
