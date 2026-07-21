import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownEditor } from "./MarkdownEditor";
import { AISuggestPanel } from "./AISuggestPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { ARTICLE_STATUSES, ARTICLE_TYPES, type ArticleRow, type ArticleStatus, type ArticleType } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useAdminArticleMutations } from "../hooks/useAdminArticles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ArticleRow | null; // null = criação
}

const EMPTY = {
  tipo: "artigo" as ArticleType,
  titulo: "",
  resumo: "",
  conteudo: "",
  categoria: "",
  sistema_slug: "",
  url_externa: "",
  status: "rascunho" as ArticleStatus,
  tagsText: "",
  keywordsText: "",
};

type FormState = typeof EMPTY;

function toForm(a: ArticleRow | null): FormState {
  if (!a) return EMPTY;
  return {
    tipo: (a.tipo as ArticleType) ?? "artigo",
    titulo: a.titulo ?? "",
    resumo: a.resumo ?? "",
    conteudo: a.conteudo ?? "",
    categoria: a.categoria ?? "",
    sistema_slug: a.sistema_slug ?? "",
    url_externa: a.url_externa ?? "",
    status: (a.status as ArticleStatus) ?? "rascunho",
    tagsText: (a.tags ?? []).join(", "),
    keywordsText: (a.palavras_chave ?? []).join(", "),
  };
}

function parseList(txt: string): string[] {
  return txt
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ArticleFormDialog({ open, onOpenChange, article }: Props) {
  const { create, update } = useAdminArticleMutations();
  const [form, setForm] = useState<FormState>(EMPTY);
  const { toast } = useToast();
  const isEdit = !!article;

  useEffect(() => {
    if (open) setForm(toForm(article));
  }, [open, article]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      resumo: form.resumo.trim() || null,
      conteudo: form.conteudo,
      categoria: form.categoria.trim() || null,
      sistema_slug: form.sistema_slug.trim() || null,
      url_externa: form.url_externa.trim() || null,
      status: form.status,
      tags: parseList(form.tagsText),
      palavras_chave: parseList(form.keywordsText),
    };
    try {
      if (isEdit && article) {
        await update.mutateAsync({ id: article.id, patch: payload });
        toast({ title: "Artigo atualizado" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Artigo criado" });
      }
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar artigo" : "Novo artigo"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="conteudo" className="flex-1 overflow-auto">
          <TabsList>
            <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
            <TabsTrigger value="metadados">Metadados</TabsTrigger>
            <TabsTrigger value="ia">Sugestões de IA</TabsTrigger>
            <TabsTrigger value="historico" disabled={!isEdit}>Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="conteudo" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as ArticleStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Resumo</Label>
              <Textarea
                rows={2}
                value={form.resumo}
                onChange={(e) => set("resumo", e.target.value)}
                placeholder="Uma frase que aparece nos resultados de busca."
              />
            </div>
            <div>
              <Label>Conteúdo (Markdown)</Label>
              <MarkdownEditor value={form.conteudo} onChange={(v) => set("conteudo", v)} />
            </div>
          </TabsContent>

          <TabsContent value="metadados" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => set("tipo", v as ArticleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => set("categoria", e.target.value)} />
              </div>
              <div>
                <Label>Sistema (slug)</Label>
                <Input value={form.sistema_slug} onChange={(e) => set("sistema_slug", e.target.value)} />
              </div>
              <div>
                <Label>URL externa</Label>
                <Input value={form.url_externa} onChange={(e) => set("url_externa", e.target.value)} placeholder="https://…" />
              </div>
              <div className="md:col-span-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input value={form.keywordsText} onChange={(e) => set("keywordsText", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ia" className="pt-3">
            <AISuggestPanel
              content={form.conteudo || form.resumo || form.titulo}
              onApply={(text, action) => {
                if (action === "titulo") {
                  const first = text.split(/\n/).map((l) => l.trim()).filter(Boolean)[0] ?? "";
                  set("titulo", first);
                } else if (action === "tags") {
                  const items = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
                  set("keywordsText", items.join(", "));
                } else if (action === "resumir") {
                  set("resumo", text);
                } else {
                  set("conteudo", text);
                }
                toast({ title: "Sugestão aplicada" });
              }}
            />
          </TabsContent>

          <TabsContent value="historico" className="pt-3">
            {article && <VersionHistoryPanel articleId={article.id} />}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
            {isEdit ? "Salvar alterações" : "Criar artigo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
