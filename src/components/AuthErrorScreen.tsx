import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function AuthErrorScreen() {
  let retry: () => void = () => window.location.reload();
  try {
    const ctx = useAuth();
    if (ctx?.retryAuth) retry = ctx.retryAuth;
  } catch {
    /* fora do provider — usa reload */
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Não foi possível conectar</CardTitle>
          <CardDescription>
            Não foi possível conectar ao servidor de autenticação. Isso pode ser temporário.
            Tente novamente em instantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={retry} className="w-full">
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = "/auth";
            }}
          >
            Ir para o login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
