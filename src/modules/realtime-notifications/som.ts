import { somLigado } from "./preferencia";

/**
 * Duas notas curtas, geradas na hora — sem arquivo para baixar.
 *
 * Um mp3 seria um pedido de rede a mais para tocar 200ms de som, e falharia em
 * silêncio se o arquivo sumisse do build. O WebAudio já está no navegador.
 *
 * O `catch` não é zelo: navegador nenhum deixa tocar áudio antes de a pessoa
 * interagir com a página. Uma notificação que chega nesse intervalo não pode
 * derrubar nada — ela simplesmente aparece sem som.
 */
export function tocarAvisoDeMensagem(): void {
  if (!somLigado()) return;
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const agora = ctx.currentTime;
    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0.0001, agora);
    ganho.gain.exponentialRampToValueAtTime(0.06, agora + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.32);
    ganho.connect(ctx.destination);

    [
      { freq: 880, inicio: agora, fim: agora + 0.14 },
      { freq: 1174, inicio: agora + 0.11, fim: agora + 0.32 },
    ].forEach(({ freq, inicio, fim }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, inicio);
      osc.connect(ganho);
      osc.start(inicio);
      osc.stop(fim);
    });

    window.setTimeout(() => void ctx.close().catch(() => undefined), 600);
  } catch {
    // Sem som é aceitável; sem aviso não é.
  }
}
