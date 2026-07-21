import { memo } from "react";
import { Sparkles } from "lucide-react";
import { useIsLayUser } from "@/modules/ux";

interface Props {
  nome: string;
}

export const WelcomeSection = memo(function WelcomeSection({ nome }: Props) {
  const primeiroNome = nome?.trim().split(/\s+/)[0] || "por aqui";
  const layUser = useIsLayUser();
  const badge = layUser ? "Assistente" : "AI Workspace";
  const heading = layUser
    ? `Olá, ${primeiroNome}. Como podemos ajudar?`
    : `Olá, ${primeiroNome}`;
  const sub = layUser
    ? "Conte o que aconteceu com suas palavras. Nós cuidamos do resto."
    : "Como posso ajudar você hoje? Escolha uma opção ou descreva livremente.";
  return (
    <div className="space-y-2 text-center sm:text-left">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="size-3.5" aria-hidden /> {badge}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {heading} <span aria-hidden>👋</span>
      </h1>
      <p className="text-muted-foreground">{sub}</p>
    </div>
  );
});
