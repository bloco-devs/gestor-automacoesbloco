import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { createTask, deleteTask, listDevelopers, listTasks, updateTask } from "@/lib/supabaseData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/lib/types";

const UNASSIGNED = "__none__";

export function TasksChecklist({ solicitacaoId }: { solicitacaoId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const remoteTasks = useSupabaseData(() => listTasks(solicitacaoId), [] as Task[], [solicitacaoId]);
  const devs = useSupabaseData(() => listDevelopers(), []);
  const [tasks, setTasks] = useState<Task[]>(remoteTasks);
  const [novoTitulo, setNovoTitulo] = useState("");

  useEffect(() => {
    setTasks(remoteTasks);
  }, [remoteTasks]);

  async function handleAdd() {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    try {
      await createTask({ solicitacaoId, titulo, createdBy: user?.id });
      setNovoTitulo("");
    } catch (err) {
      toast({ title: "Erro ao criar task", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleToggle(id: string, concluida: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, concluida } : t)));
    try {
      await updateTask(id, { concluida });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, concluida: !concluida } : t)));
      toast({ title: "Erro ao atualizar", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleAssign(id: string, value: string) {
    const assignedTo = value === UNASSIGNED ? null : value;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo } : t)));
    try {
      await updateTask(id, { assignedTo });
    } catch (err) {
      toast({ title: "Erro ao atribuir", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      toast({ title: "Erro ao remover", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <Card className="surface-1">
      <CardHeader>
        <CardTitle className="text-base">Tasks</CardTitle>
        <CardDescription>Checklist interno dos desenvolvedores para esta solicitação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nova task..."
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button onClick={handleAdd}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>

        {tasks.length === 0 ? null : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="py-2 flex items-center gap-3">
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
                  <SelectTrigger className="w-[180px] h-8">
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
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
