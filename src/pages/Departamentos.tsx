import { useState } from "react";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { useSetoresRows } from "@/hooks/useSetores";
import { createSetor, deleteSetor } from "@/lib/setores";

export default function Departamentos() {
  const { rows, refresh } = useSetoresRows();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nome.trim();
    if (trimmed.length < 2) {
      toast({ title: "Nome muito curto", description: "Informe ao menos 2 caracteres.", variant: "destructive" });
      return;
    }
    if (rows.some((r) => r.nome.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Departamento já existe", description: trimmed, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createSetor(trimmed, descricao);
      setNome("");
      setDescricao("");
      toast({ title: "Departamento criado", description: trimmed });
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Não foi possível criar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    setRemoving(id);
    try {
      await deleteSetor(id);
      toast({ title: "Departamento removido", description: nome });
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      toast({ title: "Não foi possível remover", description: msg, variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="size-5" /> Departamentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os departamentos disponíveis para classificar solicitações.
        </p>
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Novo departamento</CardTitle>
          <CardDescription>O nome aparecerá nos formulários e filtros.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label htmlFor="setor-nome">Nome</Label>
              <Input
                id="setor-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Suprimentos"
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="setor-desc">Descrição (opcional)</Label>
              <Textarea
                id="setor-desc"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={300}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Cadastrados ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum departamento cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.nome}</div>
                    {r.descricao && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.descricao}</div>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removing === r.id}
                        aria-label={`Remover ${r.nome}`}
                      >
                        {removing === r.id ? (
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
                          Solicitações existentes que já referenciam esse departamento permanecerão
                          inalteradas, mas ele deixará de aparecer como opção em novos cadastros.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id, r.nome)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
