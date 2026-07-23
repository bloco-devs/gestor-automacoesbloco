import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogEntry } from "../types";

interface Props {
  entry: CatalogEntry;
  onOpen: (id: string) => void;
  selected?: boolean;
}

export function PluginCard({ entry, onOpen, selected }: Props) {
  return (
    <Card
      className={`cursor-pointer transition hover:border-primary ${selected ? "border-primary" : ""}`}
      onClick={() => onOpen(entry.id)}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{entry.name}</div>
            <div className="text-xs text-muted-foreground">
              {entry.id} · v{entry.version}
              {entry.author ? ` · ${entry.author}` : ""}
            </div>
          </div>
          <Badge
            variant={
              entry.status === "active"
                ? "default"
                : entry.status === "error" || entry.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {entry.status}
          </Badge>
        </div>
        {entry.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-1 text-[10px]">
          <Badge variant="outline">{entry.category}</Badge>
          <Badge variant="outline">{entry.commands} cmd</Badge>
          <Badge variant="outline">{entry.widgets} widget</Badge>
          {entry.extensionPoints.slice(0, 3).map((ep) => (
            <Badge key={ep} variant="outline" className="font-mono">
              {ep}
            </Badge>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(entry.id);
            }}
          >
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
