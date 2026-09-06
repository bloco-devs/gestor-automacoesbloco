import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Minus, Plus, Play, Pause } from "lucide-react";
import { PageShell, PageHeader, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EscritorioCanvas } from "@/modules/escritorio/EscritorioCanvas";
import { PainelSistema } from "@/modules/escritorio/PainelSistema";
import { carregarEscritorio, DADOS_SEMENTE, type DadosEscritorio } from "@/modules/escritorio/dados";
import { montarAndar } from "@/modules/escritorio/layout";
import { estadoDoSistema } from "@/modules/escritorio/estado";

/** Recarrega o retrato do HUB de tempos em tempos; não é evento a evento. */
const INTERVALO_RECARGA_MS = 60_000;

export default function EscritorioPage() {
  const [dados, setDados] = useState<DadosEscritorio | null>(null);
  const [demo, setDemo] = useState(false);
  const [escala, setEscala] = useState(2);
  const [selecionado, setSelecionado] = useState<string | null>(null);

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

  return (
    <PageShell>
      <PageHeader
        title="Escritório do Ecossistema"
        subtitle="Cada sistema é uma pessoa. Quando dois sistemas trocam informação de verdade, um levanta e vai entregar na mesa do outro."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={efetivos.fonte === "hub" ? "default" : "outline"}>
              {efetivos.fonte === "hub" ? "Ao vivo · HUB" : "Semente"}
            </Badge>
            <Button
              size="sm"
              variant={demo ? "default" : "outline"}
              onClick={() => setDemo((d) => !d)}
              aria-pressed={demo}
            >
              {demo ? <Pause className="size-4 mr-1.5" aria-hidden /> : <Play className="size-4 mr-1.5" aria-hidden />}
              Modo demonstração
            </Button>
            <div className="flex items-center gap-1 rounded-md border border-border px-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Afastar"
                onClick={() => { setSelecionado(null); setEscala((e) => Math.max(1, e - 1)); }}
              >
                <Minus className="size-4" aria-hidden />
              </Button>
              <span className="text-xs font-mono w-6 text-center">{escala}x</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Aproximar"
                onClick={() => setEscala((e) => Math.min(4, e + 1))}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        }
      />

      <Section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
      </Section>

      <Section>
        <div className="h-[68vh] min-h-[440px] overflow-hidden rounded-xl border border-border bg-[#1d2420]">
          <EscritorioCanvas
            andar={andar}
            dados={efetivos}
            demo={demo}
            escala={escala}
            onEscala={setEscala}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Arraste para andar pelo escritório. Clique numa pessoa para entrar na sala dela.
          {demo && " O modo demonstração está ligado: o movimento agora é constante, não reflete o volume real."}
        </p>
      </Section>

      <PainelSistema sistemaId={selecionado} dados={efetivos} onFechar={() => setSelecionado(null)} />
    </PageShell>
  );
}
