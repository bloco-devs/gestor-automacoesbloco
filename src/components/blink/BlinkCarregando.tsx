import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "./Blink";

/**
 * BLINK SALTANDO — o carregador do sistema.
 *
 * DE ONDE VEIO
 * A curva do salto é adaptada de um efeito do Uiverse (forzayt): agachar,
 * esticar no impulso, girar no ar, achatar no impacto, assentar. É essa
 * sequência que faz parecer PESO — um `translateY` puro lê como elevador.
 *
 * Do original ficou só o movimento. O ovo de páscoa, as listras e a paleta
 * saíram: quem salta aqui é o Blink, que já existe em SVG e já é o rosto da
 * IA no sistema. Um mascote diferente no carregamento seria um segundo
 * personagem, e o sistema não tem dois.
 *
 * ONDE USAR, E ONDE NÃO
 * Serve para espera com rosto: rota carregando, o Blink pensando, tela cheia.
 * NÃO substitui `Skeleton` em lista nem em tabela — ali o que informa é a
 * forma do conteúdo que vai chegar, e trocar isso por um boneco pulando
 * esconde a estrutura e ainda rouba a atenção para o lado errado da tela.
 *
 * Regra prática: se a espera tem um lugar definido na tela, use Skeleton. Se
 * a tela inteira está esperando, use isto.
 *
 * MOVIMENTO E ENJOO
 * Como aparece em toda espera, o salto seria repetição constante para quem
 * tem sensibilidade vestibular. Com `prefers-reduced-motion` ele não para —
 * vira pulsação suave. Parar de vez tiraria o sinal de "algo está
 * acontecendo" justamente de quem mais precisa dele.
 */

/**
 * A referência é o efeito original: o ovo tem 150×200px e ocupa a tela de
 * verdade. A primeira versão daqui saiu com 96px no maior tamanho, e o
 * resultado foi um boneco pequeno demais para se ver saltando — o movimento
 * existia e não comunicava nada, que é o pior dos dois mundos: custa
 * atenção e não entrega presença.
 *
 * A caixa precisa ser bem mais alta que o Blink: o salto sobe 64px e a
 * sombra fica embaixo. Caixa apertada corta o ápice do pulo.
 */
const TAMANHOS = {
  sm: { caixa: "h-28", blink: "size-14", sombra: "w-12", salto: 28, desloc: 14, nuvem: 0.6 },
  md: { caixa: "h-44", blink: "size-24", sombra: "w-20", salto: 48, desloc: 22, nuvem: 0.8 },
  lg: { caixa: "h-56", blink: "size-36", sombra: "w-28", salto: 64, desloc: 28, nuvem: 1 },
} as const;

/**
 * Uma nuvem: a barra deitada mais a bolha por cima.
 *
 * As duas medidas são em pixel, não em percentual. A bolha é filha absoluta
 * de uma barra de poucos pixels de altura, e `size-[70%]` resolvia a altura
 * contra essa altura minúscula — o resultado era um risco achatado no lugar
 * de uma bolha redonda.
 *
 * A cor é `foreground` com opacidade baixa, que atende os dois temas: no
 * claro vira forma cinza sobre fundo branco, no escuro forma clara sobre
 * fundo preto. Nos dois casos lê como nuvem passando, sem competir com o
 * Blink.
 */
function Nuvem({
  topo,
  largura,
  altura,
  bolha,
  opacidade,
  duracao,
  atraso,
}: {
  topo: string;
  largura: number;
  altura: number;
  bolha: number;
  opacidade: number;
  duracao: string;
  atraso: string;
}) {
  return (
    <div
      className="blink-nuvem pointer-events-none absolute rounded-full bg-foreground/[0.09]"
      style={{
        top: topo,
        width: largura,
        height: altura,
        opacity: opacidade,
        animationDuration: duracao,
        animationDelay: atraso,
      }}
      aria-hidden
    >
      <div
        className="absolute rounded-full bg-foreground/[0.09]"
        style={{ width: bolha, height: bolha, top: -bolha * 0.55, left: largura * 0.22 }}
      />
    </div>
  );
}

export const BlinkCarregando = memo(function BlinkCarregando({
  tamanho = "md",
  mensagem,
  nuvens = true,
  className,
}: {
  tamanho?: keyof typeof TAMANHOS;
  /** Uma linha dizendo o que está acontecendo. Silêncio também é resposta. */
  mensagem?: string;
  /** Desligue em espaço apertado — elas precisam de largura para atravessar. */
  nuvens?: boolean;
  className?: string;
}) {
  const t = TAMANHOS[tamanho];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      /**
       * `status` + `aria-live="polite"` anuncia a espera a quem usa leitor de
       * tela, sem interromper o que estiver sendo lido. O SVG do Blink já tem
       * rótulo próprio, então é escondido aqui para não anunciar duas vezes.
       */
      role="status"
      aria-live="polite"
    >
      <div
        className={cn("relative flex w-full items-end justify-center overflow-hidden", t.caixa)}
        /**
         * A altura e o deslocamento do salto entram por variável. Fixos em
         * pixel, o mesmo pulo que cabe no tamanho grande estoura a caixa do
         * pequeno e o ápice fica cortado pelo `overflow-hidden`.
         */
        style={
          {
            "--blink-salto": `${t.salto}px`,
            "--blink-desloc": `${t.desloc}px`,
          } as React.CSSProperties
        }
      >
        {nuvens && (
          <>
            <Nuvem
              topo="12%"
              largura={72 * t.nuvem}
              altura={16 * t.nuvem}
              bolha={28 * t.nuvem}
              opacidade={1}
              duracao="9s"
              atraso="0s"
            />
            <Nuvem
              topo="42%"
              largura={52 * t.nuvem}
              altura={12 * t.nuvem}
              bolha={20 * t.nuvem}
              opacidade={0.65}
              duracao="7s"
              atraso="-2.5s"
            />
            <Nuvem
              topo="26%"
              largura={60 * t.nuvem}
              altura={13 * t.nuvem}
              bolha={22 * t.nuvem}
              opacidade={0.45}
              duracao="11s"
              atraso="-5s"
            />
          </>
        )}

        <div className="relative flex flex-col items-center">
          <div className="blink-salta" aria-hidden>
            <Blink className={t.blink} />
          </div>
          {/* A sombra fica FORA do elemento que salta: se estivesse dentro,
              herdaria o mesmo transform e subiria junto com ele — que é
              exatamente o que uma sombra não faz.

              PRETO NOS DOIS TEMAS, com opacidades diferentes. Usava
              `bg-foreground`, que no tema escuro é claro — ou seja, uma sombra
              BRANCA embaixo do boneco. Sombra é escurecimento da superfície, e
              não muda de cor com o tema; o que muda é o quanto ela precisa
              pesar para aparecer sobre um fundo já escuro. */}
          <div
            className={cn("blink-chao mt-1.5 h-2 rounded-[50%] bg-black/25 dark:bg-black/60", t.sombra)}
            aria-hidden
          />
        </div>
      </div>

      {mensagem && (
        <p className="max-w-xs text-center text-[13px] text-muted-foreground">{mensagem}</p>
      )}
      {!mensagem && <span className="sr-only">Carregando</span>}
    </div>
  );
});
