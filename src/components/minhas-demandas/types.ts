import type { Solicitacao } from "@/lib/types";

export interface DemandaCardProps {
  solicitacao: Solicitacao;
  onOpen: () => void;
  onAbrirChamado: () => void;
  editHref: string;
}
