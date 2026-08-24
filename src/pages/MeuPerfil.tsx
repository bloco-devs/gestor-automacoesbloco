import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Trash2, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AvatarEditorDialog from "@/components/perfil/AvatarEditorDialog";

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

async function dataUrlToFile(dataUrl: string, name = "avatar.jpg"): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type });
}

export default function MeuPerfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const openEditorWithFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    setEditorFile(file);
    setEditorOpen(true);
  };

  const handleAdjustCurrent = async () => {
    if (!avatarUrl) return;
    try {
      const file = await dataUrlToFile(avatarUrl);
      openEditorWithFile(file);
    } catch {
      toast({ title: "Não foi possível abrir a foto atual", variant: "destructive" });
    }
  };

  const saveAvatar = async (dataUrl: string) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(dataUrl);
      await qc.invalidateQueries();
      setEditorOpen(false);
      setEditorFile(null);
      toast({ title: "Foto atualizada", description: "Sua nova foto de perfil já está ativa." });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      await qc.invalidateQueries();
      toast({ title: "Foto removida" });
    } catch (e) {
      toast({
        title: "Erro ao remover",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Card className="rounded-2xl border border-border/80 bg-card shadow-lg overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Meu Perfil & Preferências
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Sua foto e identidade aparecem no atendimento, cartões do Kanban e relatórios.
              </CardDescription>
            </div>
            {user.role && (
              <span className="rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
                {user.isAdministrador ? "Administrador" : user.role === "developer" ? "Desenvolvedor" : "Solicitante"}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 rounded-xl border border-border/50 bg-slate-900/30 p-4">
            <Avatar className="size-24 ring-4 ring-primary/20 shadow-md shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.nome} />}
              <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-2xl">
                {initials(user.nome)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 text-center sm:text-left space-y-1 my-auto">
              <h2 className="text-lg font-bold text-foreground truncate">{user.nome}</h2>
              <p className="text-sm font-medium text-muted-foreground truncate">{user.email}</p>
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Conta Ativa no HUB Bloco ID
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Foto de Perfil
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) openEditorWithFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="gap-2 font-semibold shadow-xs"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span>Enviar nova foto</span>
              </Button>
              {avatarUrl && (
                <>
                  <Button variant="secondary" onClick={handleAdjustCurrent} disabled={busy} className="gap-2 font-semibold border border-border/80">
                    <Crop className="size-4" />
                    <span>Ajustar enquadramento</span>
                  </Button>
                  <Button variant="outline" onClick={handleRemove} disabled={busy} className="gap-2 font-semibold text-destructive hover:bg-destructive/10 border-destructive/30">
                    <Trash2 className="size-4" />
                    <span>Remover</span>
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você pode ajustar o enquadramento com zoom e rotação antes de salvar. A imagem final é otimizada para exibição em todos os dispositivos.
            </p>
          </div>
        </CardContent>
      </Card>

      <AvatarEditorDialog
        open={editorOpen}
        file={editorFile}
        onCancel={() => {
          if (busy) return;
          setEditorOpen(false);
          setEditorFile(null);
        }}
        onConfirm={saveAvatar}
      />
    </div>
  );
}
