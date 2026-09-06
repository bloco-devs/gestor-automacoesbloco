import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, DoorOpen, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DadosEscritorio } from "./dados";
import { culpaDeTerceiro, estadoDoSistema, type Estado } from "./estado";

interface Props {
  dados: DadosEscritorio;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
}

const PONTO: Record<Estado, string> = {
  trabalhando: "bg-success",
  ocioso: "bg-muted-foreground/40",
  falha: "bg-destructive",
};
const ROTULO: Record<Estado, string> = {
  trabalhando: "trabalhando",
  ocioso: "ocioso",
  falha: "em falha",
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

export function PainelLateral({ dados, selecionado, onSelecionar }: Props) {
  const porSala = useMemo(() => {
    const m = new Map<string, typeof dados.sistemas>();
    for (const s of dados.sistemas) {
      const g = s.grupo || "Outros";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(s);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [dados.sistemas]);

  const sistema = dados.sistemas.find((s) => s.id === selecionado);
  const conector = dados.conectores.find((c) => c.id === selecionado);
  const saude = selecionado ? dados.saude[selecionado] : undefined;
  const estado = estadoDoSistema(saude);
  const nomeDe = (id: string) =>
    dados.sistemas.find((s) => s.id === id)?.nome ?? dados.conectores.find((c) => c.id === id)?.nome ?? id;
  const saidas = dados.integracoes.filter((i) => i.origem === selecionado);
  const entradas = dados.integracoes.filter((i) => i.destino === selecionado);
  const taxa = saude?.execs ? Math.round((saude.falhas / saude.execs) * 1000) / 10 : 0;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      {selecionado && (sistema || conector) ? (
        /*
         * `min-h-0` + `overflow-y-auto` + teto de altura: sem isso a ficha não
         * encolhe, a área de rolagem da lista vai a zero e a lista inteira cai
         * para fora do cartão — ninguém consegue clicar em outro sistema.
         */
        <div className="max-h-[55%] min-h-0 shrink overflow-y-auto border-b border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="ds-h3 truncate">{sistema?.nome ?? conector?.nome}</h2>
              <p className="ds-caption text-muted-foreground">
                {sistema ? `Sala ${sistema.grupo}` : "Serviço de fora do escritório"}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label="Fechar" onClick={() => onSelecionar(null)}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <Badge variant={estado === "falha" ? "destructive" : estado === "ocioso" ? "secondary" : "default"} className="mt-2">
            {ROTULO[estado]}
          </Badge>

          {saude ? (
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="ds-label text-muted-foreground">Execuções</dt>
                <dd className="ds-body-strong">{saude.execs.toLocaleString("pt-BR")}</dd>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="ds-label text-muted-foreground">Falhas</dt>
                <dd className="ds-body-strong">
                  {saude.falhas.toLocaleString("pt-BR")} <span className="ds-caption text-muted-foreground">({taxa}%)</span>
                </dd>
              </div>
              <div className="col-span-2 rounded-md bg-muted/50 p-2">
                <dt className="ds-label text-muted-foreground">Última execução</dt>
                <dd className="ds-body-strong">{quando(saude.ultima)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 ds-caption text-muted-foreground">
              O HUB não devolveu histórico. Sem histórico, ele fica parado na mesa.
            </p>
          )}
          {culpaDeTerceiro(saude) && (
            <p className="mt-2 ds-caption text-muted-foreground">
              A maior parte das falhas veio de quem está do outro lado, não daqui.
            </p>
          )}

          <ListaLigacoes titulo="Leva para" icone={<ArrowUpRight className="size-3.5" aria-hidden />} itens={saidas.map((i) => [nomeDe(i.destino), i.label])} vazio="Não entrega nada — nunca sai da mesa." />
          <ListaLigacoes titulo="Recebe de" icone={<ArrowDownLeft className="size-3.5" aria-hidden />} itens={entradas.map((i) => [nomeDe(i.origem), i.label])} vazio="Ninguém traz nada até esta mesa." />

          <Button asChild variant="outline" size="sm" className="mt-3 w-full justify-between">
            <a href={`/diagrama?sistema=${encodeURIComponent(selecionado)}`}>
              Ver no diagrama
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        </div>
      ) : (
        <div className="shrink-0 border-b border-border p-4">
          <h2 className="ds-h3">Quem está no andar</h2>
          <p className="ds-caption text-muted-foreground">
            Clique num BLINK, aqui ou na planta, para ver a saúde e as ligações dele.
          </p>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {porSala.map(([sala, sistemas]) => (
            <section key={sala} className="mb-2">
              <h3 className="ds-label px-2 py-1 text-muted-foreground">{sala}</h3>
              <ul>
                {sistemas.map((s) => {
                  const e = estadoDoSistema(dados.saude[s.id]);
                  const execs = dados.saude[s.id]?.execs ?? 0;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelecionar(s.id === selecionado ? null : s.id)}
                        aria-pressed={s.id === selecionado}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                          s.id === selecionado ? "bg-accent" : "hover:bg-muted/60",
                        )}
                      >
                        <span className={cn("size-2 shrink-0 rounded-full", PONTO[e])} aria-hidden />
                        <span className="ds-caption min-w-0 flex-1 truncate">{s.nome}</span>
                        <span className="ds-label shrink-0 text-muted-foreground">
                          {execs.toLocaleString("pt-BR")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="mb-1">
            <h3 className="ds-label flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
              <DoorOpen className="size-3.5" aria-hidden /> Serviços de fora
            </h3>
            <ul>
              {dados.conectores.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(c.id === selecionado ? null : c.id)}
                    aria-pressed={c.id === selecionado}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      c.id === selecionado ? "bg-accent" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="size-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                    <span className="ds-caption min-w-0 flex-1 truncate">{c.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function ListaLigacoes({
  titulo,
  icone,
  itens,
  vazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: [string, string][];
  vazio: string;
}) {
  return (
    <section className="mt-3">
      <h3 className="ds-label flex items-center gap-1.5 text-muted-foreground">
        {icone} {titulo} ({itens.length})
      </h3>
      {itens.length === 0 ? (
        <p className="ds-caption text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {itens.map(([nome, label], i) => (
            <li key={i} className="border-b border-border/50 pb-1">
              <p className="ds-caption truncate">{nome}</p>
              <p className="ds-label font-mono normal-case tracking-normal text-muted-foreground">{label}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
