import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCatalog, useMarketplaceBoot } from "../hooks";
import type { CatalogFilter } from "../types";
import { PluginCard } from "../components/PluginCard";
import { MarketplaceToolbar } from "../components/MarketplaceToolbar";
import { PluginDetails } from "../components/PluginDetails";
import { DependencyGraph } from "../components/DependencyGraph";
import { DeveloperConsole } from "../components/DeveloperConsole";
import { SDK_VERSION, HOST_VERSION } from "../compatibility";

interface Props {
  /** Quando embutido em outra tela (ex.: /admin/sdk), esconde o cabeçalho. */
  embedded?: boolean;
}

export default function MarketplacePage({ embedded = false }: Props) {
  const booting = useMarketplaceBoot();
  const [filter, setFilter] = useState<CatalogFilter>({});
  const { all, filtered } = useCatalog(filter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const Wrapper = embedded ? "div" : "div";

  return (
    <Wrapper className={embedded ? "space-y-4" : "mx-auto w-full max-w-7xl space-y-4 p-6"}>
      {!embedded && (
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Plugin Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Descoberta, ativação e diagnóstico de plugins locais. SDK v{SDK_VERSION} · Host v{HOST_VERSION}.
            {booting ? " (Inicializando runtime…)" : ""}
          </p>
        </header>
      )}

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">
            Catálogo <Badge variant="outline" className="ml-2">{all.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="graph">Dependências</TabsTrigger>
          <TabsTrigger value="console">Developer Console</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <MarketplaceToolbar filter={filter} onChange={setFilter} entries={all} />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum plugin corresponde ao filtro.</p>
              ) : (
                filtered.map((entry) => (
                  <PluginCard
                    key={entry.id}
                    entry={entry}
                    onOpen={setSelectedId}
                    selected={selected?.id === entry.id}
                  />
                ))
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes do plugin</CardTitle>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <PluginDetails entry={selected} />
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione um plugin.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="graph">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependency Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <DependencyGraph entries={all} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Developer Console</CardTitle>
            </CardHeader>
            <CardContent>
              <DeveloperConsole />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Wrapper>
  );
}
