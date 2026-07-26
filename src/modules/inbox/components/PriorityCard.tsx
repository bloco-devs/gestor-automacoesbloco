import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDaysAgo } from "../utils/format";
import type { RankedInboxItem } from "../types";

interface Props {
  item: RankedInboxItem;
}

/**
 * DS 3.0 — o destaque do item prioritário passou a vir da tipografia e da
 * posição na página, não de um bloco amarelo. Sem tinta de marca no fundo,
 * sem borda colorida: o título maior e o único botão primário da tela já
 * dizem que é aqui que se começa.
 */
function PriorityCard({ item }: Props) {
  const navigate = useNavigate();
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="ds-label text-muted-foreground">Prioridade agora</span>
        <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">score {item.score}</span>
      </div>

      <h2 className="ds-h2 mt-2">{item.title}</h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 ds-caption text-muted-foreground">
        <StatusBadge status={item.status} />
        {item.system ? <Badge>{item.system}</Badge> : null}
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" aria-hidden />
          {item.responsibleName ?? item.requesterName}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          parado {formatDaysAgo(item.updatedAt)}
        </span>
        {item.sla ? <span>SLA {new Date(item.sla).toLocaleDateString()}</span> : null}
      </div>

      {item.reasons.length > 0 && (
        <p className="ds-caption mt-3 text-muted-foreground">{item.reasons.slice(0, 3).join(" · ")}</p>
      )}

      <div className="mt-5">
        <Button size="sm" onClick={() => navigate(item.href)} aria-label={`Continuar em ${item.title}`}>
          Continuar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export default memo(PriorityCard);
