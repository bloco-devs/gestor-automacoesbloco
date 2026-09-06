import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DadosEscritorio } from "./dados";
import { culpaDeTerceiro, estadoDoSistema } from "./estado";

interface Props {
  sistemaId: string | null;
  dados: DadosEscritorio;
  onFechar: () => void;
}

const ROTULO = {
  trabalhando: { texto: "Trabalhando", variante: "default" as const },
  ocioso: { texto: "Ocioso", variante: "secondary" as const },
  falha: { texto: "Em falha", variante: "destructive" as const },
};

function quando(iso: string | null): string {
  if (!iso) return "sem registro";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "sem registro";
  const horas = Math.floor((Date.now() - t) / 3_600_000);
  if (horas < 1) return "há menos de uma hora";
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function PainelSistema({ sistemaId, dados, onFechar }: Props) {
  const sistema = dados.sistemas.find((s) => s.id === sistemaId);
  const conector = dados.conectores.find((c) => c.id === sistemaId);
  const nome = sistema?.nome ?? conector?.nome ?? "";
  const saude = sistemaId ? dados.saude[sistemaId] : undefined;
  const estado = estadoDoSistema(saude);
  const rotulo = ROTULO[estado];

  const nomeDe = (id: string) =>
    dados.sistemas.find((s) => s.id === id)?.nome ?? dados.conectores.find((c) => c.id === id)?.nome ?? id;

  const saidas = dados.integracoes.filter((i) => i.origem === sistemaId);
  const entradas = dados.integracoes.filter((i) => i.destino === sistemaId);
  const taxa = saude?.execs ? Math.round((saude.falhas / saude.execs) * 1000) / 10 : 0;

  return (
    <Sheet open={!!sistemaId} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {nome}
            <Badge variant={rotulo.variante}>{rotulo.texto}</Badge>
          </SheetTitle>
          <SheetDescription>
            {sistema ? `Sala ${sistema.grupo}` : "Serviço de fora do escritório"}
            <span className="block font-mono text-xs mt-1">{sistemaId}</span>
          </SheetDescription>
        </SheetHeader>

        <section className="mt-6">
          <h3 className="text-sm font-medium mb-2">Saúde dos últimos 30 dias</h3>
          {saude ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">Execuções</dt>
                <dd className="font-medium">{saude.execs.toLocaleString("pt-BR")}</dd>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">Falhas</dt>
                <dd className="font-medium">
                  {saude.falhas.toLocaleString("pt-BR")} <span className="text-xs text-muted-foreground">({taxa}%)</span>
                </dd>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">Última execução</dt>
                <dd className="font-medium">{quando(saude.ultima)}</dd>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs text-muted-foreground">Falhas do outro lado</dt>
                <dd className="font-medium">{(saude.falhas_upstream ?? 0).toLocaleString("pt-BR")}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              O HUB não devolveu histórico para este sistema. Sem histórico, ele fica parado na mesa.
            </p>
          )}
          {culpaDeTerceiro(saude) && (
            <p className="mt-2 text-xs text-muted-foreground">
              A maior parte das falhas veio de quem está do outro lado da integração, não daqui.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <ArrowUpRight className="size-4" aria-hidden /> Leva informação para ({saidas.length})
          </h3>
          {saidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não entrega nada para ninguém — nunca sai da mesa.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {saidas.map((i, n) => (
                <li key={`s-${n}`} className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1">
                  <span>{nomeDe(i.destino)}</span>
                  <span className="font-mono text-xs text-muted-foreground text-right">{i.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <ArrowDownLeft className="size-4" aria-hidden /> Recebe informação de ({entradas.length})
          </h3>
          {entradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém traz nada até esta mesa.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {entradas.map((i, n) => (
                <li key={`e-${n}`} className="flex items-baseline justify-between gap-2 border-b border-border/50 py-1">
                  <span>{nomeDe(i.origem)}</span>
                  <span className="font-mono text-xs text-muted-foreground text-right">{i.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button asChild variant="outline" size="sm" className="mt-6 w-full justify-between">
          <a href={`/diagrama?sistema=${encodeURIComponent(sistemaId ?? "")}`}>
            Ver no diagrama
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
