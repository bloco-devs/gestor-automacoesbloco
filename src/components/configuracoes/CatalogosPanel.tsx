import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Row = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo?: boolean;
};

type CatalogTable = "setores" | "plataformas" | "tipos_demanda";

interface CatalogProps {
  table: CatalogTable;
  singular: string;
  plural: string;
  placeholder: string;
  showAtivo?: boolean;
}

function CatalogCRUD({ table, singular, plural, placeholder, showAtivo }: CatalogProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cols =
      table === "tipos_demanda"
        ? "id,nome,descricao,ativo"
        : "id,nome,descricao";
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .order("nome", { ascending: true });
    if (error) {
      toast({ title: `Erro ao carregar ${plural.toLowerCase()}`, description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, [table, plural, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = nome.trim();
    if (t.length < 2) {
      toast({ title: "Nome muito curto", variant: "destructive" });
      return;
    }
    if (rows.some((r) => r.nome.toLowerCase() === t.toLowerCase())) {
      toast({ title: `${singular} já cadastrado`, description: t, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = { nome: t, descricao: descricao.trim() || null };
    if (table === "plataformas") payload.icone = "";
    const { error } = await supabase.from(table).insert(payload as never);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    setNome("");
    setDescricao("");
    toast({ title: `${singular} cadastrado`, description: t });
    refresh();
  }

  async function handleDelete(row: Row) {
    setBusy(row.id);
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    setBusy(null);
    if (error) {
      toast({ title: "Não foi possível remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${singular} removido`, description: row.nome });
      refresh();
    }
  }

  async function handleToggle(row: Row, ativo: boolean) {
    setBusy(row.id);
    const { error } = await supabase.from(table).update({ ativo } as never).eq("id", row.id);
    setBusy(null);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      refresh();
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Novo {singular.toLowerCase()}</CardTitle>
          <CardDescription>O nome aparecerá nos formulários e filtros.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={placeholder}
                maxLength={80}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={300}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">
            {plural} cadastrados {loading ? "" : `(${rows.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              <Loader2 className="inline size-4 mr-2 animate-spin" /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum item cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {r.nome}
                      {showAtivo && r.ativo === false && (
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">inativo</span>
                      )}
                    </div>
                    {r.descricao && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.descricao}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {showAtivo && (
                      <Switch
                        checked={r.ativo !== false}
                        disabled={busy === r.id}
                        onCheckedChange={(v) => handleToggle(r, v)}
                        aria-label="Ativo"
                      />
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busy === r.id}>
                          {busy === r.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover "{r.nome}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Registros existentes que já referenciam esse item permanecerão
                            inalterados, mas ele deixará de aparecer como opção em novos cadastros.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CatalogosPanel() {
  return (
    <Tabs defaultValue="setores">
      <TabsList>
        <TabsTrigger value="setores">Setores</TabsTrigger>
        <TabsTrigger value="plataformas">Plataformas</TabsTrigger>
        <TabsTrigger value="tipos">Tipos de demanda</TabsTrigger>
      </TabsList>
      <TabsContent value="setores" className="mt-4">
        <CatalogCRUD
          table="setores"
          singular="Setor"
          plural="Setores"
          placeholder="Ex.: Suprimentos"
        />
      </TabsContent>
      <TabsContent value="plataformas" className="mt-4">
        <CatalogCRUD
          table="plataformas"
          singular="Plataforma"
          plural="Plataformas"
          placeholder="Ex.: Make, n8n, Power Automate"
        />
      </TabsContent>
      <TabsContent value="tipos" className="mt-4">
        <CatalogCRUD
          table="tipos_demanda"
          singular="Tipo"
          plural="Tipos de demanda"
          placeholder="Ex.: Automação, Integração"
          showAtivo
        />
      </TabsContent>
    </Tabs>
  );
}
