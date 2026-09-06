import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Maximize2, Minus, Pause, Play, Plus } from "lucide-react";
import { PageShell, PageHeader } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EscritorioCanvas } from "@/modules/escritorio/EscritorioCanvas";
import { PainelLateral } from "@/modules/escritorio/PainelLateral";
import { PreviaSistema } from "@/modules/escritorio/PreviaSistema";
import { carregarEscritorio, DADOS_SEMENTE, type DadosEscritorio } from "@/modules/escritorio/dados";
import { montarAndar } from "@/modules/escritorio/layout";
import { estadoDoSistema } from "@/modules/escritorio/estado";

/** Recarrega o retrato do HUB de tempos em tempos; não é evento a evento. */
const INTERVALO_RECARGA_MS = 60_000;

export default function EscritorioPage() {
  const [dados, setDados] = useState<DadosEscritorio | null>(null);
  const [demo, setDemo] = useState(false);
  const [escala, setEscala] = useState(2);
  const [ajustar, setAjustar] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{ id: string; x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      const d = await carregarEscritorio();
      if (ativo) setDados(d);
    };
    void buscar();
    const t = setInterval(buscar, INTERVALO_RECARGA_MS);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  const efetivos = dados ?? DADOS_SEMENTE;
  const andar = useMemo(
    () => montarAndar(efetivos.sistemas, efetivos.conectores),
    [efetivos.sistemas, efetivos.conectores],
  );

  const contagem = useMemo(() => {
    let trabalhando = 0;
    let ocioso = 0;
    let falha = 0;
    for (const s of efetivos.sistemas) {
      const e = estadoDoSistema(efetivos.saude[s.id]);
      if (e === "trabalhando") trabalhando++;
      else if (e === "falha") falha++;
      else ocioso++;
    }
    return { trabalhando, ocioso, falha };
  }, [efetivos]);

  const aproximar = (delta: number) => {
    setAjustar(false);
    setEscala((e) => Math.min(4, Math.max(1, e + delta)));
  };

  return (
    <PageShell maxWidth="full">
      <PageHeader
        title="Escritório do Ecossistema"
        subtitle="Cada sistema é um BLINK, com o acessório do ofício dele. Quando dois sistemas trocam informação de verdade, um levanta e vai entregar na mesa do outro."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={efetivos.fonte === "hub" ? "default" : "outline"}>
              {efetivos.fonte === "hub" ? "Ao vivo · HUB" : "Semente"}
            </Badge>
            <Button size="sm" variant={demo ? "default" : "outline"} onClick={() => setDemo((d) => !d)} aria-pressed={demo}>
              {demo ? <Pause className="size-4 mr-1.5" aria-hidden /> : <Play className="size-4 mr-1.5" aria-hidden />}
              Modo demonstração
            </Button>
            <Button
              size="sm"
              variant={ajustar ? "default" : "outline"}
              onClick={() => { setAjustar(true); setSelecionado(null); }}
              aria-pressed={ajustar}
            >
              <Maximize2 className="size-4 mr-1.5" aria-hidden />
              Andar inteiro
            </Button>
            <div className="flex items-center gap-1 rounded-md border border-border px-1">
              <Button size="icon" variant="ghost" className="size-7" aria-label="Afastar" onClick={() => aproximar(-1)}>
                <Minus className="size-4" aria-hidden />
              </Button>
              <span className="ds-label w-8 text-center">{ajustar ? "auto" : `${escala}x`}</span>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Aproximar" onClick={() => aproximar(1)}>
                <Plus className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ds-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="size-4" aria-hidden />
          {efetivos.sistemas.length} sistemas · {efetivos.conectores.length} serviços de fora
        </span>
        <span>{contagem.trabalhando} trabalhando</span>
        <span>{contagem.ocioso} ocioso{contagem.ocioso === 1 ? "" : "s"}</span>
        <span>{contagem.falha} em falha</span>
        {!dados && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> carregando o HUB
          </span>
        )}
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={areaRef}
          className="relative h-[74vh] min-h-[460px] overflow-hidden rounded-xl border border-border bg-[hsl(var(--escritorio-fundo))]"
        >
          <EscritorioCanvas
            andar={andar}
            dados={efetivos}
            demo={demo}
            escala={escala}
            onEscala={(e) => { setAjustar(false); setEscala(e); }}
            ajustar={ajustar}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
            onApontar={(id, tela) => setPrevia(id && tela ? { id, ...tela } : null)}
          />
          {previa && (
            <PreviaSistema
              dados={efetivos}
              id={previa.id}
              x={previa.x}
              y={previa.y}
              largura={areaRef.current?.clientWidth ?? 0}
              altura={areaRef.current?.clientHeight ?? 0}
            />
          )}
        </div>
        <div className="h-[74vh] min-h-[460px]">
          <PainelLateral dados={efetivos} selecionado={selecionado} onSelecionar={setSelecionado} />
        </div>
      </div>

      <p className="ds-caption text-muted-foreground">
        {ajustar
          ? "O andar inteiro cabe na tela. Aponte para um BLINK para ver a prévia, clique para abrir a ficha."
          : "Arraste para andar pelo escritório. Toque em “Andar inteiro” para ver tudo de novo."}
        {demo && " O modo demonstração está ligado: o movimento agora é constante, não reflete o volume real."}
      </p>
    </PageShell>
  );
}
