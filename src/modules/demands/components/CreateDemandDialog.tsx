import { useEffect, useState } from "react";
import { Loader2, Sparkles, Upload, Wand2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutoRespondDemand, useCreateDemand, useTriageDemand, useUserWorkloads } from "../hooks";
import { ACEITA_NO_SELETOR, enviarVarios, validarArquivo } from "../anexos";
import {
  COMPLEXITY_META,
  PRIORITY_META,
  TYPE_META,
  type DemandComplexity,
  type DemandPriority,
  type DemandType,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AUTO = "__auto__";
const UNASSIGNED = "__none__";

export function CreateDemandDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateDemand();
  const triage = useTriageDemand();
  const autoRespond = useAutoRespondDemand();
  const { data: workloads = [] } = useUserWorkloads(open);
  const [plataformas, setPlataformas] = useState<Array<{ id: string; nome: string }>>([]);
  useEffect(() => {
    supabase
      .from("plataformas")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setPlataformas(data ?? []));
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemId, setSystemId] = useState<string>("");
  const [type, setType] = useState<DemandType>("melhoria");
  const [priority, setPriority] = useState<DemandPriority>("media");
  const [complexity, setComplexity] = useState<DemandComplexity>("media");
  const [assignee, setAssignee] = useState<string>(UNASSIGNED);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiJustify, setAiJustify] = useState<string>("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setSystemId("");
    setType("melhoria");
    setPriority("media");
    setComplexity("media");
    setAssignee(UNASSIGNED);
    setFiles([]);
    setAiJustify("");
  };

  const handleAITriage = async () => {
    if (!title.trim() && description.trim().length < 10) {
      toast({
        title: "Descreva a demanda",
        description: "Informe pelo menos um título ou uma descrição de 10+ caracteres para a IA analisar.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await triage.mutateAsync({ title: title.trim(), description: description.trim() });
      setPriority(res.priority);
      setType(res.type);
      setComplexity(res.complexity);
      setAiJustify(res.justificativa || "");
      toast({ title: "Sugestão aplicada", description: res.justificativa || "IA preencheu tipo, prioridade e complexidade." });
    } catch (err) {
      toast({
        title: "IA indisponível",
        description: err instanceof Error ? err.message : "Não foi possível obter sugestão agora.",
        variant: "destructive",
      });
    }
  };

  const resolveAssignee = (): string | null => {
    if (assignee === UNASSIGNED) return null;
    if (assignee === AUTO) {
      const sorted = [...workloads].sort((a, b) => a.active_count - b.active_count);
      return sorted[0]?.user_id ?? null;
    }
    return assignee;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const assigned_to = resolveAssignee();
      const demand = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        system_id: systemId || null,
        type,
        priority,
        complexity,
        assigned_to,
      });

      // Anexo que falha não desfaz a demanda — ver o mesmo trecho no
      // NewTicketDialog para o porquê (a demanda já existe neste ponto).
      const { anexados, falhas } = await enviarVarios(demand.id, files);

      toast({
        title: "Demanda criada com sucesso",
        description:
          falhas.length > 0 ? `${anexados} de ${files.length} anexos enviados. ${falhas[0]}` : undefined,
        variant: falhas.length > 0 ? "destructive" : undefined,
      });

      // Agente Autônomo Nível 1: se ficou sem responsável, tenta responder
      // via Base de Conhecimento (fire-and-forget; falhas não bloqueiam).
      if (!assigned_to) {
        void autoRespond.mutateAsync(demand.id).then((res) => {
          if (res?.ok && res.articleTitle) {
            toast({
              title: "Agente IA respondeu",
              description: `Sugestão publicada: ${res.articleTitle}`,
            });
          }
        });
      }

      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao criar demanda";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Demanda</DialogTitle>
          <DialogDescription>
            Registre uma nova demanda, ticket ou solicitação técnica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ex.: Corrigir erro de exportação no relatório X"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Descreva o contexto, comportamento esperado e passos para reproduzir…"
            />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {aiJustify ? (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> {aiJustify}
                </span>
              ) : (
                "A IA pode sugerir tipo, prioridade e complexidade a partir da descrição."
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAITriage}
              disabled={triage.isPending}
              className="gap-1.5 shrink-0"
            >
              {triage.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Sugerir com IA
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Select value={systemId || "none"} onValueChange={(v) => setSystemId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {plataformas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as DemandType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as DemandPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Complexidade</Label>
              <Select value={complexity} onValueChange={(v) => setComplexity(v as DemandComplexity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPLEXITY_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Não atribuir</SelectItem>
                <SelectItem value={AUTO}>
                  <span className="inline-flex items-center gap-1.5">
                    <Wand2 className="size-3.5" /> Atribuir automaticamente (menor carga)
                  </span>
                </SelectItem>
                {workloads.map((w) => (
                  <SelectItem key={w.user_id} value={w.user_id}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-5">
                        {w.avatar_url && <AvatarImage src={w.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {(w.nome || w.email || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{w.nome || w.email}</span>
                      <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                        {w.active_count} {w.active_count === 1 ? "ativa" : "ativas"}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Anexos (imagens, PDFs)</Label>
            <label className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-4 cursor-pointer hover:bg-muted/40 transition-colors">
              <Upload className="size-4" />
              <span className="text-sm text-muted-foreground">
                Clique para selecionar arquivos
              </span>
              <input
                type="file"
                multiple
                accept={ACEITA_NO_SELETOR}
                className="hidden"
                onChange={(e) => {
                  // Recusa no ato da escolha, não no envio: ver NewTicketDialog.
                  const bons: File[] = [];
                  for (const f of Array.from(e.target.files ?? [])) {
                    const problema = validarArquivo(f);
                    if (problema) toast({ title: problema, variant: "destructive" });
                    else bons.push(f);
                  }
                  setFiles((prev) => [...prev, ...bons]);
                  e.target.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between text-xs rounded border border-border px-2 py-1">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${f.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Criar demanda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
