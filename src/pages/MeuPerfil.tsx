import { useRef, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

async function resizeToDataUrl(file: File, size = 256, quality = 0.85): Promise<string> {
  const img = document.createElement("img");
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Falha ao carregar a imagem"));
      img.src = url;
    });
    // Crop centralizado em quadrado — garante que o rosto fique no centro do círculo.
    const side = Math.min(img.width, img.height);
    const sx = Math.round((img.width - side) / 2);
    const sy = Math.round((img.height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MeuPerfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 256, 0.85);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(dataUrl);
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
            <Avatar className="h-20 w-20 ring-2 ring-white shadow">
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
                if (f) void handleFile(f);
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
              <Button variant="outline" onClick={handleRemove} disabled={busy}>
                <Trash2 className="size-4" />
                <span className="ml-2">Remover</span>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            A imagem será redimensionada automaticamente para 256×256 px.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
