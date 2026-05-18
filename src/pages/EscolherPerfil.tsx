
import { Navigate, useNavigate } from "react-router-dom";
import { Code2, Hammer, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/types";
import blocoLogo from "@/assets/bloco-logo.png";

export default function EscolherPerfil() {
  const { user, isDual, setViewAs } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  // Only Administradores may pick a profile. Others go straight to their default view.
  if (!isDual) {
    return <Navigate to={user.role === "developer" ? "/dashboard" : "/minhas-solicitacoes"} replace />;
  }

  function choose(role: Role) {
    setViewAs(role);
    navigate(role === "developer" ? "/dashboard" : "/minhas-solicitacoes");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={blocoLogo} alt="Bloco" className="size-10 rounded-lg object-cover" />
          <h1 className="text-base font-brand font-bold">Gestor de Automações</h1>
        </div>
        <Card className="surface-1">
          <CardHeader>
            <CardTitle>Como deseja entrar?</CardTitle>
            <CardDescription>
              Escolha qual visão deseja utilizar nesta sessão. Você poderá alternar depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto min-h-32 py-4 px-3 flex flex-col items-center justify-center gap-2 text-center whitespace-normal"
              onClick={() => choose("developer")}
            >
              <Code2 className="size-7 shrink-0" />
              <span className="font-semibold">Desenvolvedor</span>
              <span className="text-xs text-muted-foreground leading-snug break-words">
                Gerenciar solicitações e soluções
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-32 py-4 px-3 flex flex-col items-center justify-center gap-2 text-center whitespace-normal"
              onClick={() => choose("builder")}
            >
              <Hammer className="size-7 shrink-0" />
              <span className="font-semibold">Builder</span>
              <span className="text-xs text-muted-foreground leading-snug break-words">
                Cadastrar soluções nas próprias solicitações
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-32 py-4 px-3 flex flex-col items-center justify-center gap-2 text-center whitespace-normal"
              onClick={() => choose("requester")}
            >
              <User className="size-7 shrink-0" />
              <span className="font-semibold">Solicitante</span>
              <span className="text-xs text-muted-foreground leading-snug break-words">
                Criar e acompanhar solicitações
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
