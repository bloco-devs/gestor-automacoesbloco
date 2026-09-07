import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Maximize2, Minus, Pause, Play, Plus } from "lucide-react";
import { PageShell, PageHeader } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EscritorioCanvas } from "@/modules/escritorio/EscritorioCanvas";
import { PainelLateral } from "@/modules/escritorio/PainelLateral";
import { PreviaSistema } from "@/modules/escritorio/PreviaSistema";
import { carregarEscritorio, DADOS_SEMENTE, type DadosEscritorio } from "@/modules/escritorio/dados";
import { PROPORCAO_PADRAO, montarAndar } from "@/modules/escritorio/layout";
import { fonteDeDemandas, type EventoEcossistema } from "@/modules/escritorio/eventos";
import { useDemands } from "@/modules/demands/hooks";
import { resumoDeEstados } from "@/modules/escritorio/estado";

/** Recarrega o retrato do HUB de tempos em tempos; não é evento a evento. */
const INTERVALO_RECARGA_MS = 60_000;
/**
 * Quem representa o Kanban na planta.
 *
 * Roteamento VISUAL provisório: a demanda não pertence a este sistema, ela só
 * é mostrada por ele enquanto não houver vínculo real demanda → sistema.
 */
const SISTEMA_DO_KANBAN = "automacoes";

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
  /*
   * A planta só é remontada quando a ESTRUTURA muda — sistema entrou, saiu,
   * trocou de grupo, conector novo. `efetivos.sistemas` é array novo a cada
   * busca do HUB, então depender dele remontava o andar inteiro (e apagava o
   * motor junto) de minuto em minuto, mesmo sem nada ter mudado.
   */
  const estrutura = useMemo(
    () =>
      `${efetivos.sistemas.map((s) => `${s.id}:${s.grupo}`).join("|")}::` +
      efetivos.conectores.map((c) => c.id).join("|"),
    [efetivos.sistemas, efetivos.conectores],
  );
  /*
   * A planta também acompanha a PROPORÇÃO da área de desenho.
   *
   * O andar tem uma proporção própria e o zoom "andar inteiro" cabe pelo lado
   * mais apertado: numa tela larga com um andar estreito sobravam centenas de
   * pixels pretos dos dois lados. Informando a proporção real, a planta
   * escolhe a divisão de salas certa e transforma a sobra em corredor.
   *
   * O valor é arredondado em degraus de 0,25 para arrastar a janela não ficar
   * remontando o andar — e com ele o motor — a cada pixel.
   */
  const [proporcao, setProporcao] = useState(PROPORCAO_PADRAO);
  const [areaPx, setAreaPx] = useState<{ largura: number; altura: number } | undefined>(undefined);
  useEffect(() => {
    const alvo = areaRef.current;
    if (!alvo || typeof ResizeObserver === "undefined") return;
    const medir = () => {
      const { clientWidth: l, clientHeight: a } = alvo;
      if (l < 80 || a < 80) return;
      setProporcao(Math.max(0.5, Math.min(4, Math.round((l / a) * 4) / 4)));
      // arredondado em 100 px: redimensionar não remonta o andar a cada pixel
      setAreaPx({ largura: Math.round(l / 100) * 100, altura: Math.round(a / 100) * 100 });
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(alvo);
    return () => obs.disconnect();
  }, []);

  const plantaRef = useRef<{ chave: string; andar: ReturnType<typeof montarAndar> } | null>(null);
  const chavePlanta = `${estrutura}@@${proporcao}@@${areaPx?.largura ?? 0}x${areaPx?.altura ?? 0}`;
  if (!plantaRef.current || plantaRef.current.chave !== chavePlanta) {
    plantaRef.current = {
      chave: chavePlanta,
      andar: montarAndar(efetivos.sistemas, efetivos.conectores, proporcao, areaPx),
    };
  }
  const andar = plantaRef.current.andar;

  /*
   * DEMANDAS REAIS — trabalho que não vem do HUB.
   *
   * `useDemands` já existe e já escuta `demands` por Supabase Realtime, então
   * aqui não há assinatura nova nem polling: o escritório pega carona no que
   * o Kanban já mantém atualizado.
   *
   * O evento é endereçado ao BLINK do Gestor de Automações como RESPONSÁVEL
   * VISUAL do trabalho. Isso não é posse: hoje não existe chave confiável
   * entre uma demanda e o sistema do ecossistema, e inventar uma seria pior
   * que não ter. Quando existir, muda-se o destinatário em `fonteDeDemandas`.
   */
  const { data: demandas } = useDemands();
  const fonteDemandasRef = useRef(fonteDeDemandas(SISTEMA_DO_KANBAN));
  const [eventosDeDemanda, setEventosDeDemanda] = useState<EventoEcossistema[]>([]);
  const [trabalhoPorSistema, setTrabalhoPorSistema] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!demandas) return;
    const resumo = demandas.map((d) => ({ id: d.id, status: d.status as string }));
    const novos = fonteDemandasRef.current.observar(resumo, Date.now());
    if (novos.length) setEventosDeDemanda(novos);
    setTrabalhoPorSistema({ [SISTEMA_DO_KANBAN]: fonteDemandasRef.current.emTrabalho() });
  }, [demandas]);

  const contagem = useMemo(
    () => resumoDeEstados(efetivos.sistemas, efetivos.saude),
    [efetivos],
  );

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
        {contagem.semExecucao > 0 && (
          <span title="O HUB registra execução de integração, não uso da tela.">
            {contagem.semExecucao} sem execução registrada
          </span>
        )}
        {contagem.semDados > 0 && <span>{contagem.semDados} sem dados no HUB</span>}
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
            eventosExternos={eventosDeDemanda}
            trabalhoPorSistema={trabalhoPorSistema}
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
