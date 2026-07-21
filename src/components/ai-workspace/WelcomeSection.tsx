import { memo } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  nome: string;
}

export const WelcomeSection = memo(function WelcomeSection({ nome }: Props) {
  const primeiroNome = nome?.trim().split(/\s+/)[0] || "por aqui";
  return (
    <div className="space-y-2 text-center sm:text-left">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="size-3.5" aria-hidden /> AI Workspace
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Olá, {primeiroNome} <span aria-hidden>👋</span>
      </h1>
      <p className="text-muted-foreground">
        Como posso ajudar você hoje? Escolha uma opção ou descreva livremente.
      </p>
    </div>
  );
});
