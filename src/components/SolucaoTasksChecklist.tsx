import { useEffect, useRef, useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createSolucaoTask,
  deleteSolucaoTask,
  listDevelopers,
  listSolucaoTasks,
  updateSolucaoTask,
} from "@/lib/supabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SolucaoTask } from "@/lib/types";

const UNASSIGNED = "__none__";

type Row = {
  id: string;
  solucao_id: string;
  titulo: string;
  concluida: boolean;
  assigned_to: string | null;
  ordem: number;
  created_at: string;
};

function rowToTask(r: Row): SolucaoTask {
  return {
    id: r.id,
    solucaoId: r.solucao_id,
    titulo: r.titulo,
    concluida: r.concluida,
    assignedTo: r.assigned_to,
    ordem: r.ordem,
    createdAt: r.created_at,
  };
}

export function SolucaoTasksChecklist({ solucaoId }: { solucaoId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const remoteTasks = useSupabaseData(() => listSolucaoTasks(solucaoId), [] as SolucaoTask[], [solucaoId]);
  const devs = useSupabaseData(() => listDevelopers(), []);
  const [tasks, setTasks] = useState<SolucaoTask[]>(remoteTasks);
  const [adding, setAdding] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTasks(remoteTasks);
  }, [remoteTasks]);

  useEffect(() => {
    const channel = supabase
      .channel(`solucao_tasks:${solucaoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solucao_tasks", filter: `solucao_id=eq.${solucaoId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const t = rowToTask(payload.new as Row);
            setTasks((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]));
          } else if (payload.eventType === "UPDATE") {
            const t = rowToTask(payload.new as Row);
            setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setTasks((prev) => prev.filter((x) => x.id !== id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [solucaoId]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function handleAdd() {
    const titulo = novoTitulo.trim();
    if (!titulo) {
      setAdding(false);
      return;
    }
    try {
      await createSolucaoTask({ solucaoId, titulo, createdBy: user?.id });
      setNovoTitulo("");
      inputRef.current?.focus();
    } catch (err) {
      toast({ title: "Erro ao criar task", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleToggle(id: string, concluida: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, concluida } : t)));
    try {
      await updateSolucaoTask(id, { concluida });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
      toast({ title: "Erro ao atualizar", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleAssign(id: string, value: string) {
    const assignedTo = value === UNASSIGNED ? null : value;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo } : t)));
    try {
      await updateSolucaoTask(id, { assignedTo });
    } catch (err) {
      toast({ title: "Erro ao atribuir", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteSolucaoTask(id);
    } catch (err) {
      toast({ title: "Erro ao remover", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <Card className="surface-1">
      <CardHeader>
        <CardTitle className="text-base">Tasks</CardTitle>
        <CardDescription>Checklist da solução, atribuível aos desenvolvedores.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 hover:border-accent/50"
          >
            <Checkbox
              checked={t.concluida}
              onCheckedChange={(v) => handleToggle(t.id, Boolean(v))}
            />
            <span className={`flex-1 text-sm ${t.concluida ? "line-through text-muted-foreground" : ""}`}>
              {t.titulo}
            </span>
            <Select
              value={t.assignedTo ?? UNASSIGNED}
              onValueChange={(v) => handleAssign(t.id, v)}
            >
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                {devs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nome || d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(t.id)}
              aria-label="Remover task"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}

        {adding ? (
          <div className="space-y-2 rounded-md border border-border bg-card p-2">
            <Textarea
              ref={inputRef}
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Insira um título para esta task..."
              rows={2}
              className="resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setNovoTitulo("");
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAdd}>
                Adicionar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setAdding(false);
                  setNovoTitulo("");
                }}
                aria-label="Cancelar"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60"
          >
            <Plus className="size-4" /> Adicionar uma task
          </button>
        )}
      </CardContent>
    </Card>
  );
}
