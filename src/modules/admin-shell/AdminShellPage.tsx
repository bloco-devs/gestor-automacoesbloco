import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Section } from "@/design-system";
import { useFeatureFlags, ALL_FLAGS } from "@/hooks/useFeatureFlags";
import { AdminShellLayout } from "./layout/AdminShellLayout";
import { ADMIN_GROUPS, ADMIN_NAV } from "./navigation/registry";

export default function AdminShellPage() {
  const { flags, setFlag } = useFeatureFlags();
  return (
    <AdminShellLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">Centro Administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Ponto único de navegação para plataforma, IA, operacional, segurança e desenvolvimento.
          </p>
        </header>

        {ADMIN_GROUPS.map((group) => {
          const items = ADMIN_NAV.filter((it) => it.group === group.id);
          if (!items.length) return null;
          return (
            <Section key={group.id} title={group.label} description={group.description}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.id} className="surface-1 transition-shadow hover:shadow-md">
                      <Link to={item.href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" aria-hidden />
                              {item.label}
                            </span>
                            {item.status && (
                              <Badge variant="secondary" className="text-[10px]">
                                {item.status}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </Section>
          );
        })}

        <Section
          title="Feature flags"
          description="Controles locais (por navegador). Não afetam outros usuários."
        >
          <Card className="surface-1">
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              {ALL_FLAGS.map((f) => (
                <div key={f.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor={`flag-${f.key}`} className="text-sm font-medium">
                      {f.label}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <Switch
                    id={`flag-${f.key}`}
                    checked={flags[f.key] ?? f.defaultValue}
                    onCheckedChange={(v) => setFlag(f.key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      </div>
    </AdminShellLayout>
  );
}
