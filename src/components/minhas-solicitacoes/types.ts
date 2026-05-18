import type { Solicitacao } from "@/lib/types";

export interface SolicitacaoCardProps {
  solicitacao: Solicitacao;
  onOpen: () => void;
  onAbrirChamado: () => void;
  editHref: string;
}
