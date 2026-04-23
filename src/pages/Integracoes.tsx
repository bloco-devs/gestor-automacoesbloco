import { useState } from "react";
import { ArrowLeftRight, Network, Plus, Trash2 } from "lucide-react";
import { useStoreSubscription } from "@/hooks/useStore";
import { createIntegracao, deleteIntegracao, listIntegracoes, listSolucoes } from "@/lib/store";
import type { IntegracaoTipo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const TIPO_LABEL: Record<IntegracaoTipo, string> = {
  consome: "consome",
  alimenta: "alimenta",
  bidirecional: "↔ bidirecional",
};

export default function Integracoes() {
  const solucoes = useStoreSubscription(() => listSolucoes());
  const integracoes = useStoreSubscription(() => listIntegracoes());
  const { toast } = useToast();
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [tipo, setTipo] = useState<IntegracaoTipo>("consome");
  const [descricao, setDescricao] = useState("");

  const nameOf = (id: string) => solucoes.find((s) => s.id === id)?.titulo ?? "—";

  function handleAdd() {
    if (!origem || !destino || origem === destino) {
      toast({ title: "Selecione origem e destino diferentes", variant: "destructive" });
      return;
    }
    createIntegracao({ origemId: origem, destinoId: destino, tipo, descricao: descricao.trim() || undefined });
    setOrigem(""); setDestino(""); setDescricao(""); setTipo("consome");
    toast({ title: "Integração cadastrada" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Network className="size-5 text-accent" /> Integrações entre soluções
        </h1>
        <p className="text-sm text-muted-foreground">Mapeie quais soluções consomem ou alimentam outras.</p>
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Nova integração</CardTitle>
          <CardDescription>É necessário ter pelo menos duas soluções cadastradas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto]">
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue placeholder="Solução de origem" /></SelectTrigger>
            <SelectContent>
              {solucoes.map((s) => <SelectItem key={s.id} value={s.id}>{s.titulo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={(v) => setTipo(v as IntegracaoTipo)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TIPO_LABEL) as IntegracaoTipo[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger><SelectValue placeholder="Solução de destino" /></SelectTrigger>
            <SelectContent>
              {solucoes.map((s) => <SelectItem key={s.id} value={s.id}>{s.titulo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <Button onClick={handleAdd} disabled={solucoes.length < 2}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Mapa de integrações</CardTitle>
        </CardHeader>
        <CardContent>
          {integracoes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma integração cadastrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {integracoes.map((i) => (
                <li key={i.id} className="py-3 flex items-center gap-3">
                  <ArrowLeftRight className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-medium">{nameOf(i.origemId)}</span>
                    <span className="text-accent mx-2">{TIPO_LABEL[i.tipo]}</span>
                    <span className="font-medium">{nameOf(i.destinoId)}</span>
                    {i.descricao && <p className="text-xs text-muted-foreground mt-0.5">{i.descricao}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteIntegracao(i.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
