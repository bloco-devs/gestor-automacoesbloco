import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
// platforms fetched inline via supabase
import { useAddAttachment, useCreateDemand } from "../hooks";
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

export function CreateDemandDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateDemand();
  const addAtt = useAddAttachment();
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
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSystemId("");
    setType("melhoria");
    setPriority("media");
    setComplexity("media");
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const demand = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        system_id: systemId || null,
        type,
        priority,
        complexity,
      });

      for (const file of files) {
        const path = `${demand.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("demand-attachments")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        await addAtt.mutateAsync({
          demandId: demand.id,
          file_url: path,
          file_type: file.type,
          file_name: file.name,
        });
      }

      toast({ title: "Demanda criada com sucesso" });
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
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...list]);
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
