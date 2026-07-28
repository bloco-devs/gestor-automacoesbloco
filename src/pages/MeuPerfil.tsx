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
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
          <CardDescription>
            Sua foto aparece nos cards, colunas e listas de membros. Fica visível para todos que
            têm acesso aos mesmos quadros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 ring-2 ring-white shadow">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.nome} />}
              <AvatarFallback className="bg-slate-200 text-slate-800 text-lg">
                {initials(user.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium truncate">{user.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              <span className="ml-2">Enviar nova foto</span>
            </Button>
            {avatarUrl && (
              <>
                <Button variant="secondary" onClick={handleAdjustCurrent} disabled={busy}>
                  <Crop className="size-4" />
                  <span className="ml-2">Ajustar enquadramento</span>
                </Button>
                <Button variant="outline" onClick={handleRemove} disabled={busy}>
                  <Trash2 className="size-4" />
                  <span className="ml-2">Remover</span>
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Após selecionar a imagem, você pode arrastar e dar zoom para centralizar o rosto, no
            estilo LinkedIn. A foto final é salva em 256×256 px.
          </p>
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
