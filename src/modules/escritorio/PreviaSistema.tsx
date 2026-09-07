import { useLayoutEffect, useRef, useState } from "react";
import { estadoDoSistema, type Estado } from "./estado";
import type { DadosEscritorio } from "./dados";
import { cn } from "@/lib/utils";

interface Props {
  dados: DadosEscritorio;
  id: string;
  /** Posição do ponteiro dentro da área da planta. */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

const CHIP: Record<Estado, string> = {
  trabalhando: "bg-success/15 text-success",
  ocioso: "bg-warning/15 text-warning",
  falha: "bg-destructive/15 text-destructive",
  "sem-execucao": "bg-muted text-foreground/70",
  "sem-dados": "bg-muted text-muted-foreground",
};
const ROTULO: Record<Estado, string> = {
  trabalhando: "trabalhando",
  ocioso: "ocioso",
  falha: "em falha",
  "sem-execucao": "sem execução em 30 d",
  "sem-dados": "sem dados no HUB",
};

const LARGURA = 260;

function quando(iso: string | null | undefined): string {
  if (!iso) return "sem registro";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "sem registro";
  const horas = Math.floor((Date.now() - t) / 3_600_000);
  if (horas < 1) return "há menos de uma hora";
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/**
 * Prévia que abre ao apontar para um BLINK, sem precisar clicar.
 *
 * `pointer-events-none`: se a prévia captasse o ponteiro, ela apareceria sob o
 * cursor, roubaria o hover do personagem e piscaria sem parar.
 */
export function PreviaSistema({ dados, id, x, y, largura, altura }: Props) {
  const sistema = dados.sistemas.find((s) => s.id === id);
  if (!sistema) return null;

  const saude = dados.saude[id];
  const estado = estadoDoSistema(saude);
  const saidas = dados.integracoes.filter((i) => i.origem === id);
  const entradas = dados.integracoes.filter((i) => i.destino === id);
  const taxa = saude?.execs ? Math.round((saude.falhas / saude.execs) * 1000) / 10 : 0;

  return (
    <Ancorada x={x} y={y} largura={largura} altura={altura} chave={id}>
      <div className="flex items-start justify-between gap-2">
        <p className="ds-card-title leading-tight">{sistema.nome}</p>
        <span className={cn("ds-label shrink-0 rounded px-1.5 py-0.5", CHIP[estado])}>{ROTULO[estado]}</span>
      </div>
      <p className="ds-caption text-muted-foreground">Sala {sistema.grupo}</p>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <dt className="ds-label text-muted-foreground">Execuções</dt>
          <dd className="ds-caption">{(saude?.execs ?? 0).toLocaleString("pt-BR")}</dd>
        </div>
        <div>
          <dt className="ds-label text-muted-foreground">Falhas</dt>
          <dd className="ds-caption">
            {(saude?.falhas ?? 0).toLocaleString("pt-BR")}
            {saude?.execs ? <span className="text-muted-foreground"> ({taxa}%)</span> : null}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="ds-label text-muted-foreground">Última execução</dt>
          <dd className="ds-caption">{quando(saude?.ultima)}</dd>
        </div>
      </dl>

      {estado === "sem-dados" && (
        <p className="mt-2 ds-caption text-muted-foreground">
          O HUB não tem registro de saúde deste sistema. Não dá para dizer se ele executou
          ou não.
        </p>
      )}
      {estado === "sem-execucao" && (
        <p className="mt-2 ds-caption text-muted-foreground">
          O HUB acompanha este sistema e não registrou execução nos últimos 30 dias.
          Não é falha: é ausência de uso na janela.
        </p>
      )}
      <p className="mt-2 ds-caption text-muted-foreground">
        Leva para {saidas.length} · recebe de {entradas.length}
      </p>
      {saidas[0] && (
        <p className="ds-label truncate font-mono normal-case tracking-normal text-muted-foreground">
          {saidas[0].label}
        </p>
      )}
      <p className="mt-2 ds-label text-muted-foreground">Clique para abrir a ficha</p>
    </Ancorada>
  );
}

/**
 * Posiciona a prévia junto ao ponteiro sem deixá-la sair da área da planta.
 *
 * A altura era estimada em 150px e a prévia vazava pela borda de baixo em 60
 * das 288 posições varridas — o cartão é mais alto que isso quando o sistema
 * tem muitas ligações. Aqui ela é MEDIDA depois de montar e só então
 * posicionada; até lá fica invisível, para não piscar no lugar errado.
 */
function Ancorada({
  x,
  y,
  largura,
  altura,
  chave,
  children,
}: {
  x: number;
  y: number;
  largura: number;
  altura: number;
  chave: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(8, x + 16), Math.max(8, largura - LARGURA - 8));
    let top = y + 16;
    if (top + h + 8 > altura) top = y - h - 12;
    top = Math.min(Math.max(8, top), Math.max(8, altura - h - 8));
    setPos({ left, top });
  }, [x, y, largura, altura, chave]);

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute z-10 rounded-lg border border-border bg-popover p-3 shadow-lg ${
        pos ? "" : "invisible"
      }`}
      style={{ left: pos?.left ?? x + 16, top: pos?.top ?? y + 16, width: LARGURA }}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
