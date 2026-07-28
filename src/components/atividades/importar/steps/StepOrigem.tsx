import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trello } from "lucide-react";

interface Props {
  value: "trello";
  onChange: (v: "trello") => void;
}

export function StepOrigem({ value }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Escolha a origem do quadro que será importado. Nesta fase, apenas Trello é suportado.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          className={`cursor-pointer transition ${
            value === "trello" ? "border-primary ring-1 ring-primary" : "opacity-95"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trello className="size-4" /> Trello
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Exportação oficial (JSON de quadro ou ZIP de workspace).
          </CardContent>
        </Card>
        <Card className="opacity-50 pointer-events-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jira</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Em breve</CardContent>
        </Card>
        <Card className="opacity-50 pointer-events-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CSV</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Em breve</CardContent>
        </Card>
      </div>
    </div>
  );
}
