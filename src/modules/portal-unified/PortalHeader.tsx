import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export function PortalHeader() {
  const { user } = useAuth();
  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);
  const nome = (user?.nome ?? "").split(" ")[0];

  return (
    <header className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {saudacao}
        {nome ? `, ${nome}` : ""}.
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Como podemos ajudar hoje?
      </h1>
    </header>
  );
}
