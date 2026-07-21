import { useEffect, useState } from "react";
import { Plus, Send, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useDeleteWebhook,
  useTestWebhook,
  useUpsertWebhook,
  useWebhooks,
  WEBHOOK_EVENTS,
  type Webhook,
  type WebhookEvent,
} from "@/modules/notifications";

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "demand.created": "Demanda criada",
  "demand.status_changed": "Status alterado",
  "demand.assigned": "Demanda atribuída",
  "sla.breached": "SLA estourado",
  "knowledge.article_published": "Artigo publicado",
};

interface DraftState {
  id?: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string;
}

const EMPTY: DraftState = { name: "", url: "", events: [], active: true, secret: "" };

export default function WebhooksAdmin() {
  const { data, isLoading } = useWebhooks();
  const upsert = useUpsertWebhook();
  const del = useDeleteWebhook();
  const test = useTestWebhook();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY);

  function newHook() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function editHook(h: Webhook) {
    setDraft({
      id: h.id, name: h.name, url: h.url,
      events: h.events, active: h.active, secret: h.secret ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim() || !/^https?:\/\//i.test(draft.url)) {
      toast.error("Informe um nome e uma URL válida (http/https).");
      return;
    }
    if (draft.events.length === 0) {
      toast.error("Selecione ao menos um evento.");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: draft.id, name: draft.name.trim(), url: draft.url.trim(),
        events: draft.events, active: draft.active,
        secret: draft.secret.trim() || null,
      });
      toast.success(draft.id ? "Webhook atualizado" : "Webhook criado");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  }

  async function remove(h: Webhook) {
    if (!confirm(`Excluir webhook "${h.name}"?`)) return;
    try {
      await del.mutateAsync(h.id);
      toast.success("Webhook excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  }

  async function toggleActive(h: Webhook, value: boolean) {
    try {
      await upsert.mutateAsync({
        id: h.id, name: h.name, url: h.url, events: h.events,
        active: value, secret: h.secret,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar");
    }
  }

  async function runTest(url: string, secret: string | null) {
    if (!/^https?:\/\//i.test(url)) {
      toast.error("URL inválida");
      return;
    }
    const r = await test.mutateAsync({ url, secret });
    if (r.ok) toast.success(`Disparo OK (HTTP ${r.status ?? 200})`);
    else toast.error(`Falhou: ${r.error ?? `HTTP ${r.status ?? "?"}`}`);
  }

  function toggleEvent(ev: WebhookEvent) {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(ev) ? d.events.filter((e) => e !== ev) : [...d.events, ev],
    }));
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-brand font-bold">Webhooks & Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Envie eventos deste sistema para n8n, Slack, WhatsApp ou qualquer endpoint HTTP.
          </p>
        </div>
        <Button onClick={newHook}><Plus className="size-4 mr-2" />Novo webhook</Button>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0,1,2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (data ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum webhook cadastrado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground" title={h.url}>
                      {h.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {h.events.map((ev) => (
                          <Badge key={ev} variant="outline" className="text-[10px]">
                            {EVENT_LABELS[ev as WebhookEvent] ?? ev}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={h.active} onCheckedChange={(v) => toggleActive(h, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => runTest(h.url, h.secret)} disabled={test.isPending}>
                          <Send className="size-3.5 mr-1" />Testar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => editHook(h)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(h)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar webhook" : "Novo webhook"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Ex: Slack #operações" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Secret (opcional — assinatura HMAC SHA-256)</Label>
              <Input value={draft.secret} onChange={(e) => setDraft((d) => ({ ...d, secret: e.target.value }))} placeholder="Deixe em branco para não assinar" />
            </div>
            <div>
              <Label>Eventos</Label>
              <div className="mt-1.5 space-y-1.5 rounded-md border p-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={draft.events.includes(ev)} onCheckedChange={() => toggleEvent(ev)} />
                    <span>{EVENT_LABELS[ev]}</span>
                    <code className="ml-auto text-[10px] text-muted-foreground">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.active} onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
              <span className="text-sm">Ativo</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => runTest(draft.url, draft.secret || null)} disabled={test.isPending || !draft.url}>
              <Send className="size-4 mr-2" />Testar disparo
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
