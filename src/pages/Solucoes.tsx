import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CalendarPlus, Plus, Sparkles, Trash, Trash2 } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createMelhoria,
  createSolucao,
  deleteMelhoria,
  deleteSolucao,
  listSolicitacoes,
  listMelhorias,
  listSolucoes,
  updateMelhoria,
} from "@/lib/supabaseData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import type { Melhoria, MelhoriaStatus } from "@/lib/types";

const MELHORIA_STATUS: Record<MelhoriaStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export default function Solucoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const solucoes = useSupabaseData(() => listSolucoes(), []);
  const melhorias = useSupabaseData(() => listMelhorias(), []);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleCriarSolucao = async () => {
    if (!novoTitulo.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await createSolucao({
        titulo: novoTitulo.trim(),
        descricao: novoDescricao.trim(),
        createdBy: user?.id,
        solicitacaoId: null,
      });
      setNovoTitulo("");
      setNovoDescricao("");
      toast({ title: "Solução cadastrada" });
    } catch (err) {
      toast({
        title: "Erro ao cadastrar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="size-5 text-accent" /> Soluções desenvolvidas
        </h1>
        <p className="text-sm text-muted-foreground">Catálogo de entregas e histórico de melhorias futuras.</p>
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Cadastrar nova solução</CardTitle>
          <CardDescription>Registre uma solução avulsa, sem precisar vincular a uma demanda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Título da solução"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
          />
          <Textarea
            placeholder="Descrição (opcional)"
            value={novoDescricao}
            onChange={(e) => setNovoDescricao(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleCriarSolucao} disabled={salvando}>
              <Plus className="size-4" /> {salvando ? "Salvando..." : "Cadastrar solução"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {solucoes.length === 0 ? (
        <Card className="surface-1">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma solução cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {solucoes.map((s) => (
            <SolucaoCard
              key={s.id}
              titulo={s.titulo}
              descricao={s.descricao}
              demandaTitulo={solicitacoes.find((item) => item.id === s.solicitacaoId)?.titulo}
              melhorias={melhorias.filter((m) => m.solucaoId === s.id)}
              onAdd={async (descricao) => {
                if (!descricao.trim()) return;
                await createMelhoria({ solucaoId: s.id, descricao, status: "planejada", data: new Date().toISOString() });
                toast({ title: "Melhoria registrada" });
              }}
              onUpdateStatus={(mid, status) => updateMelhoria(mid, { status })}
              onDelete={(mid) => deleteMelhoria(mid)}
              onDeleteSolucao={async () => {
                try {
                  await deleteSolucao(s.id);
                  toast({ title: "Solução excluída", description: "Removida também da demanda vinculada." });
                } catch (err) {
                  toast({
                    title: "Erro ao excluir",
                    description: err instanceof Error ? err.message : "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SolucaoCard({
  titulo,
  descricao,
  demandaTitulo,
  melhorias,
  onAdd,
  onUpdateStatus,
  onDelete,
  onDeleteSolucao,
}: {
  titulo: string;
  descricao: string;
  demandaTitulo?: string;
  melhorias: Melhoria[];
  onAdd: (s: string) => void;
  onUpdateStatus: (id: string, s: MelhoriaStatus) => void;
  onDelete: (id: string) => void;
  onDeleteSolucao: () => void;
}) {
  const [draft, setDraft] = useState("");
  const sorted = useMemo(() => [...melhorias].sort((a, b) => +new Date(b.data) - +new Date(a.data)), [melhorias]);

  return (
    <Card className="surface-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">{titulo}</CardTitle>
            {demandaTitulo && <CardDescription>Demanda: {demandaTitulo}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-accent/40 text-accent">
              {sorted.length} melhoria{sorted.length === 1 ? "" : "s"}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Excluir solução">
                  <Trash className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta solução?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá a solução da demanda vinculada e apagará todas as melhorias registradas. Não é possível desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteSolucao}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {descricao && <p className="text-sm text-muted-foreground mt-2">{descricao}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button onClick={() => { onAdd(draft); setDraft(""); }}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
        {sorted.length > 0 && (
          <ul className="divide-y divide-border border border-border rounded-md">
            {sorted.map((m) => (
              <li key={m.id} className="p-3 flex items-center gap-3">
                <CalendarPlus className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{m.descricao}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.data).toLocaleDateString("pt-BR")}</div>
                </div>
                <Select value={m.status} onValueChange={(v) => onUpdateStatus(m.id, v as MelhoriaStatus)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MELHORIA_STATUS) as MelhoriaStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{MELHORIA_STATUS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => onDelete(m.id)}>
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
