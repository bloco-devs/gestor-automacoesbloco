/**
 * Motor de animação do Escritório.
 *
 * Quem levanta da cadeira, quando levanta e COM QUEM fala sai dos dados
 * reais: só existe viagem onde existe integração, e a frequência vem do
 * volume de execuções. O modo demonstração ignora isso e põe todo mundo a
 * andar.
 *
 * A conversa nasce, em primeiro lugar, de um EVENTO REAL. A cada retrato novo
 * do HUB o motor compara com o anterior e enfileira o que mudou de verdade;
 * o sistema afetado então procura quem precisa saber. Quem precisa saber sai
 * do grafo de integrações do HUB, com preferência para o Gestor de
 * Automações — que é onde as integrações são acompanhadas.
 *
 * Só quando NÃO há evento pendente sobra a conversa ambiental, e ela é rara
 * de propósito: escritório calado com um acontecimento real vale mais que
 * vários BLINKs falando à toa.
 *
 * O motor é PERSISTENTE. `atualizarDados` recebe o retrato novo sem recriar
 * nada: quem está andando continua andando, quem está conversando continua
 * conversando.
 *
 * Um conector EXTERNO não conversa: ele entrega. Continua fazendo a viagem de
 * ida e volta com o rótulo da integração, como sempre fez.
 */

import {
  caminhoAtePorta,
  caminhoDaPorta,
  caminhoEntreMesas,
  caminhoEntreTiles,
  chaveDaCelula,
  pontoDeEncontro,
  type Andar,
  type Mesa,
  type Ponto,
  type PortaExterna,
} from "./layout";
import { estaParado, estadoDoSistema, intervaloEntreViagens, type Estado, type SaudeSistema } from "./estado";
import { criarRoteirista, type Fala } from "./conversas";
import {
  criarFilaDeEventos,
  executouAgora,
  fonteDeRetratos,
  type EventoEcossistema,
  type FilaDeEventos,
  type FonteDeEventos,
  type Par,
} from "./eventos";
import type { DadosEscritorio } from "./dados";
import { PERSONAGEM_H, TILE, type Direcao } from "./sprites";

/*
 * 85 px/s, e nao 38.
 *
 * Medido no Munder Difflin, quadro a quadro a 24 fps: 5 px por quadro num
 * personagem de ~32 px de altura, ou seja 1,9 alturas de corpo por segundo.
 * Os 38 px/s do nosso BLINK de 46 px davam 0,83 — ele passeava. 85 px/s
 * coloca a gente na mesma proporcao (1,85).
 *
 * O ciclo de pernas nao muda: `passoDe` ja alterna a 6 Hz, e o video nem tem
 * animacao de membros. A fluidez de la vem de velocidade, e era so isso.
 */
const VELOCIDADE = 85;          // pixels internos por segundo
const SEG_FALANDO = 1.8;
const SEG_FALA = 2.6;           // cada linha da conversa
const SEG_ENCARAR = 1.0;        // param, se viram, e só então falam
const SEG_PAUSA = 0.5;          // respiro entre a despedida e a saída
const SEG_DESPEDIDA = 0.6;      // encerramento, ainda frente a frente
const MAX_VIAGENS = 6;
const MAX_CONVERSAS = 2;        // dois grupos, nunca o andar inteiro falando
const LIMITE_ENCONTRO = 40;     // segundos até desistir de um encontro travado
/*
 * Descanso na mesa entre uma conversa e outra, no modo demonstração.
 *
 * Eram 7 s, calibrados quando a viagem era solo e durava poucos segundos.
 * Hoje um ciclo completo — sair, caminhar, encontrar, conversar, despedir,
 * voltar — leva perto de 25 s, e com 7 s de descanso o escritório virava um
 * vaivém sem pausa: dava para ver a saída, não dava para ver a volta. Com 40
 * o ciclo inteiro cabe na vista antes do próximo começar.
 */
const INTERVALO_DEMO = 40;
/*
 * Descanso do ANDAR entre uma conversa e a próxima, na demonstração.
 *
 * Subir o intervalo de cada um para 40 s não bastou: são quinze
 * temporizadores independentes, então as conversas se encavalavam e o
 * intervalo entre elas caía para segundos. Este é um respiro global — depois
 * que uma conversa termina, o andar fica quieto antes de começar outra, que é
 * o que dá tempo de ver o ciclo inteiro.
 */
const DESCANSO_DEMO = 14;
/**
 * Conversa ambiental é secundária: só respira quando a fila está vazia e
 * nenhum sistema está com problema em aberto. O intervalo é longo de
 * propósito — antes era de 6 a 16 s e enchia o corredor.
 */
const INTERVALO_AMBIENTE = 180;
const MAX_REGISTROS = 50;
/**
 * O Gestor de Automações é onde as integrações e demandas são acompanhadas,
 * então tem preferência para receber um evento. NÃO é atalho: a preferência
 * só vale se existir integração REAL entre ele e o sistema afetado. Se não
 * existir, o destino sai do grafo como qualquer outro.
 */
const SISTEMA_HUB_OPERACIONAL = "automacoes";

export type Fase = "mesa" | "indo" | "encarando" | "falando" | "voltando" | "oculto";

/**
 * Comportamento social durante a conversa.
 *
 * É um campo SEPARADO de `fase` de propósito: `fase` governa o ciclo de
 * movimento, e o nome "falando" já é usado ali pela entrega do serviço
 * externo. Misturar os dois quebraria a viagem do conector.
 */
export type Papel = "aguardando" | "falando" | "escutando" | "despedindo";

export interface Conversa {
  a: Personagem;
  b: Personagem;
  linhas: Fala[];
  i: number;
  t: number;
  fase: "indo" | "encarando" | "falando" | "despedida" | "pausa";
  /** Evento que provocou a conversa; ausente na conversa ambiental. */
  evento?: EventoEcossistema;
}

/** Rastro de depuração. Só ids e decisões — nada de dado sensível. */
export interface RegistroConversa {
  em: number;
  evento: string;
  origem: string;
  destino: string | null;
  prioridade: number;
  resultado: "iniciada" | "sem-destino" | "sem-vaga" | "sem-rota";
}

export interface Viagem {
  destinoId: string;
  label: string;
  falha: boolean;
  pontos: Ponto[];
  idx: number;
  espera: number;
}

export interface Personagem {
  id: string;
  nome: string;
  tipo: "sistema" | "externo";
  estado: Estado;
  mesa?: Mesa;
  porta?: PortaExterna;
  x: number;
  y: number;
  direcao: Direcao;
  fase: Fase;
  passoT: number;
  digitaT: number;
  proxima: number;
  viagem?: Viagem;
  /** Conversa em curso; os dois lados apontam para o mesmo objeto. */
  conversa?: Conversa;
  /** Texto do balão neste instante. Um balão por vez em cada conversa. */
  fala?: string;
  /** O que ele está fazendo socialmente; some quando volta ao posto. */
  papel?: Papel;
  /** Segundos dentro do papel atual — base das microanimações. */
  papelT: number;
  /**
   * EXECUTOU desde o retrato anterior. Não confundir com `estado`.
   *
   * `estado` responde "está operacional?" — e chama de trabalhando quem rodou
   * nas últimas 24 h. `executando` responde "rodou agora?", que é o que
   * justifica o serviço sair pela porta e a lâmpada acender.
   */
  executando?: boolean;
  /**
   * Quantas demandas reais estão em trabalho sob a responsabilidade visual
   * deste BLINK. Alimentado de fora; zero significa nenhuma.
   */
  demandasEmTrabalho?: number;
  /**
   * O primeiro intervalo já foi calculado por `intervaloDe`?
   *
   * O construtor sorteava `proxima` entre 2 e 10 s, o que passava por cima do
   * piso da conversa ambiental: logo depois de abrir a tela alguém levantava
   * para bater papo, mesmo com evento pendente. Agora o primeiro agendamento
   * também passa pela regra — e continua respeitando o modo demonstração.
   */
  agendado?: boolean;
}

export interface Motor {
  personagens: Personagem[];
  porId: Map<string, Personagem>;
  conversas: Conversa[];
  atualizar(dt: number, demo: boolean): void;
  viagensAtivas(): number;
  /**
   * Retrato novo do HUB. NÃO recria nada: atualiza a saúde de cada BLINK e
   * enfileira o que mudou. É o que faz uma conversa sobreviver ao refresh.
   */
  atualizarDados(novos: DadosEscritorio, agora?: number): EventoEcossistema[];
  /** Sistemas com problema em aberto, ainda pendentes. */
  pendentes(): string[];
  /**
   * Eventos vindos de fora do retrato do HUB — hoje, das demandas. O motor
   * não sabe de onde vieram; só os enfileira com as mesmas regras.
   */
  registrarEventos(eventos: EventoEcossistema[]): void;
  /**
   * Quantas demandas reais estão em trabalho sob a responsabilidade VISUAL de
   * um BLINK. Não é posse: é só quem representa aquele trabalho na tela.
   */
  definirTrabalhoDeDemanda(sistemaId: string, quantidade: number): void;
  fila: FilaDeEventos;
  registros: RegistroConversa[];
}

/**
 * Para onde o corpo aponta, dado o vetor do passo.
 *
 * O limiar de 0,4 px existe para o BLINK não girar no lugar quando o resto do
 * deslocamento do quadro é ruído numérico.
 *
 * Subir a tela é ir para o FUNDO da sala, e quem vai para o fundo mostra as
 * costas. Antes as duas verticais devolviam "frente", e o BLINK atravessava a
 * sala de ré, encarando a câmera — de longe ficava parecido, e é justamente
 * por isso que ninguém tinha notado.
 */
export function direcaoEntre(dx: number, dy: number, atual: Direcao): Direcao {
  if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) return atual;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "direita" : "esquerda";
  return dy < 0 ? "costas" : "frente";
}

export function criarMotor(andar: Andar, dados: DadosEscritorio, agora = Date.now()): Motor {
  /*
   * `dadosAtual` é mutável de propósito: o refresh do HUB troca o retrato sem
   * recriar o motor. Tudo que deriva dele é recalculado em `recalcular`.
   */
  let dadosAtual = dados;
  const saudeDe = (id: string): SaudeSistema | undefined => dadosAtual.saude[id];
  let maiorExecs = Math.max(1, ...Object.values(dados.saude).map((s) => s.execs ?? 0));

  const personagens: Personagem[] = [];

  for (const mesa of andar.mesas) {
    const estado = estadoDoSistema(saudeDe(mesa.sistemaId), agora);
    personagens.push({
      id: mesa.sistemaId,
      nome: mesa.nome,
      tipo: "sistema",
      estado,
      executando: executouAgora(saudeDe(mesa.sistemaId), agora),
      mesa,
      x: mesa.pessoaX,
      y: mesa.pessoaY,
      direcao: "frente",
      fase: "mesa",
      passoT: 0,
      papelT: 0,
      digitaT: Math.random() * 2,
      proxima: 2 + Math.random() * 8,
    });
  }
  for (const porta of andar.portas) {
    /*
     * O serviço externo tinha "trabalhando" chumbado: a porta acendia sempre,
     * independentemente de o conector ter executado ou não. O HUB manda saúde
     * por conector — `saude[slug]` — e é a mesma regra dos sistemas.
     */
    personagens.push({
      id: porta.conectorId,
      nome: porta.nome,
      tipo: "externo",
      estado: estadoDoSistema(saudeDe(porta.conectorId), agora),
      executando: executouAgora(saudeDe(porta.conectorId), agora),
      porta,
      x: porta.frenteX,
      y: porta.frenteY,
      direcao: "frente",
      fase: "oculto",
      passoT: 0,
      papelT: 0,
      digitaT: 0,
      proxima: 6 + Math.random() * 18,
    });
  }

  const porId = new Map(personagens.map((p) => [p.id, p]));

  // Só vira viagem a integração cujos dois lados existem no andar.
  const saidasDe = new Map<string, { destino: Mesa; label: string }[]>();
  /** Grafo não direcionado: quem troca dados com quem, de verdade. */
  const vizinhos = new Map<string, Set<string>>();

  const recalcular = () => {
    maiorExecs = Math.max(1, ...Object.values(dadosAtual.saude).map((s) => s.execs ?? 0));
    saidasDe.clear();
    vizinhos.clear();
    for (const it of dadosAtual.integracoes) {
      const destino = andar.mesaPorSistema.get(it.destino);
      if (it.origem === it.destino) continue;
      const origemTemMesa = andar.mesaPorSistema.has(it.origem);
      const origemTemPorta = andar.portaPorConector.has(it.origem);
      if (destino && (origemTemMesa || origemTemPorta)) {
        if (!saidasDe.has(it.origem)) saidasDe.set(it.origem, []);
        saidasDe.get(it.origem)!.push({ destino, label: it.label || "dados" });
      }
      if (origemTemMesa && destino) {
        if (!vizinhos.has(it.origem)) vizinhos.set(it.origem, new Set());
        if (!vizinhos.has(it.destino)) vizinhos.set(it.destino, new Set());
        vizinhos.get(it.origem)!.add(it.destino);
        vizinhos.get(it.destino)!.add(it.origem);
      }
    }
  };
  recalcular();

  const intervaloDe = (p: Personagem, demo: boolean): number => {
    if (demo) return INTERVALO_DEMO * (0.6 + Math.random() * 0.8);
    /*
     * A checagem de parado vem ANTES do ramo do externo. Estava depois, e por
     * isso um conector sem execução recente continuava saindo pela porta para
     * entregar — animação que o dado não sustenta.
     */
    if (estaParado(p.estado)) return Infinity;
    /*
     * A PORTA SEGUE A JANELA DE 24 H, NÃO A DE 2 MINUTOS.
     *
     * Ela exigia `executando` — execução nos últimos 120 segundos. Parecia a
     * regra mais honesta e na prática era precisão que o HUB não sustenta: ele
     * reporta em blocos (09:00, 11:00), e a página lê um retrato. Medido com o
     * dado real de 08/09: a janela de 2 minutos coincidia com o retrato em UM
     * conector, e as outras doze portas ficavam fechadas o dia inteiro — com o
     * Sienge tendo executado 457 vezes no mês.
     *
     * A afirmação passa a ser "este serviço executou hoje", que é verdade e é
     * o que o retrato tem como sustentar. `estaParado` acima já barrou quem
     * não executou em 24 h, quem tem registro zerado e quem o HUB não conhece
     * — nada disso anda. `executando` deixa de ser porteiro e passa a ser
     * ritmo: quem rodou agora sai mais vezes.
     */
    if (p.tipo === "externo") return (p.executando ? 26 : 70) + Math.random() * 40;
    const execs = saudeDe(p.id)?.execs ?? 0;
    const base = execs > 0 ? intervaloEntreViagens(execs, maiorExecs) : 45;
    /*
     * A frequência derivada do volume continua mandando em QUANDO um sistema
     * tem vontade de se mexer, mas a conversa ambiental agora é secundária:
     * o piso longo evita que ela concorra com evento real.
     */
    return Math.max(INTERVALO_AMBIENTE, base) * (0.7 + Math.random() * 0.6);
  };

  const viagensAtivas = () => personagens.filter((p) => p.fase !== "mesa" && p.fase !== "oculto").length;

  const iniciarViagem = (p: Personagem, demo: boolean) => {
    /*
     * "Parado não anda" precisa ser conferido AQUI, não só no intervalo.
     * O `proxima` inicial é sorteado no construtor, então um sistema ocioso
     * chegava a levantar uma vez antes de `intervaloDe` devolver Infinity.
     */
    if (!demo && estaParado(p.estado)) {
      p.proxima = Infinity;
      return;
    }
    const opcoes = saidasDe.get(p.id);
    if (!opcoes || opcoes.length === 0) {
      p.proxima = Infinity;
      return;
    }
    const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];

    // dois sistemas se encontram e conversam; quem não tem par vai entregar
    if (p.tipo === "sistema" && p.mesa) {
      const outro = porId.get(escolha.destino.sistemaId);
      if (outro && iniciarConversa(p, outro, escolha.label, undefined, demo)) return;
      /*
       * SEM PAR ELEGÍVEL, ELE ENTREGA — não fica sentado.
       *
       * Conversa exige os DOIS lados ativos, e é justo: uma troca precisa de
       * quem responde. Entrega não. Ela afirma "quem saiu executou e levou
       * dado adiante", e isso depende só de quem sai — é a mesma regra pela
       * qual o conector externo sempre pôde entregar numa mesa parada.
       *
       * Sem isto, medido com o dado real de 08/09: o Portfólio era o único
       * sistema ativo dos dezesseis, tentava sair, não achava parceiro em
       * nenhuma das cinco integrações dele, e desistia — dezenas de vezes em
       * dez minutos, sem nunca levantar da cadeira.
       */
      if (outro && !demo && viagensAtivas() + 1 <= MAX_VIAGENS) {
        const pontos = caminhoEntreMesas(andar, p.mesa, escolha.destino);
        if (pontos) {
          porRota(p, pontos, escolha.destino.sistemaId, escolha.label);
          return;
        }
      }
      // destino ocupado ou sem rota: tenta de novo daqui a pouco
      p.proxima = 4 + Math.random() * 6;
      return;
    }

    const pontos = p.porta ? caminhoDaPorta(andar, p.porta, escolha.destino) : null;
    if (!pontos) {
      // Sem reagendar, `proxima` fica em zero e ele tenta de novo a cada
      // quadro — trinta tentativas por segundo, para sempre.
      p.proxima = 4 + Math.random() * 6;
      return;
    }
    porRota(p, pontos, escolha.destino.sistemaId, escolha.label);
  };

  const roteirista = criarRoteirista();
  const conversas: Conversa[] = [];
  let fimDaUltimaConversa = -Infinity;
  let relogio = 0; // segundos de simulação, base dos cooldowns das regras

  const interlocutor = (p: Personagem) => ({
    id: p.id,
    nome: p.nome,
    grupo: p.mesa?.grupo ?? "",
  });

  /** Rota de um personagem até uma célula da grade. */
  const rotaAte = (
    p: Personagem,
    alvo: { x: number; y: number },
    evitar?: ReadonlySet<number>,
  ): Ponto[] | null => {
    const origem = p.mesa
      ? { x: p.mesa.tileX, y: p.mesa.tileY }
      : p.porta
        ? { x: p.porta.tileX, y: p.porta.tileY }
        : null;
    return origem ? caminhoEntreTiles(andar, origem, alvo, evitar) : null;
  };

  const porRota = (p: Personagem, pontos: Ponto[], destinoId: string, label: string) => {
    p.viagem = { destinoId, label, falha: p.estado === "falha", pontos, idx: 0, espera: 0 };
    p.fase = "indo";
    p.x = pontos[0].x;
    p.y = pontos[0].y;
  };

  /**
   * Conversa entre dois sistemas. O par já veio do HUB; aqui só se resolve
   * onde os dois se encontram e o que dizem.
   */
  const iniciarConversa = (
    a: Personagem,
    b: Personagem,
    label: string,
    evento?: EventoEcossistema,
    demo = false,
  ): boolean => {
    if (!a.mesa || !b.mesa) return false;
    if (b.fase !== "mesa" || b.conversa) return false;
    /*
     * Fora da demonstração, quem está ocioso ou sem dado não conversa — a
     * regra de sempre.
     *
     * No modo demonstração a ELEGIBILIDADE é liberada, e só ela: o `estado`
     * de cada um continua exatamente o que a saúde diz, o monitor continua
     * apagado e a etiqueta continua dizendo "sem dado". Sem isso o botão de
     * demonstração fica inerte quando o retrato vem vazio — que é o caso do
     * seed, onde `saude` é `{}` e ninguém teria par elegível.
     */
    if (!demo && estaParado(b.estado)) return false;
    if (conversas.length >= MAX_CONVERSAS) return false;
    // uma conversa põe DUAS pessoas de pé: o teto tem de contar as duas
    if (viagensAtivas() + 2 > MAX_VIAGENS) return false;
    // na demonstração, o andar respira entre um ciclo e o seguinte
    if (demo && !evento && relogio - fimDaUltimaConversa < DESCANSO_DEMO) return false;

    const pe = pontoDeEncontro(
      andar,
      { x: a.mesa.tileX, y: a.mesa.tileY },
      { x: b.mesa.tileX, y: b.mesa.tileY },
      a.mesa.grupo === b.mesa.grupo,
    );
    if (!pe) return false;
    /*
     * Cada um evita a célula onde o OUTRO vai parar. Sem isso o segundo a
     * chegar atravessa por cima do primeiro — eram 8 dos 14 pares, com até
     * 36 quadros de sprite sobre sprite.
     */
    const celulaA = chaveDaCelula(andar, pe.um.x, pe.um.y);
    const celulaB = chaveDaCelula(andar, pe.outro.x, pe.outro.y);
    const rotaA = rotaAte(a, pe.um, new Set([celulaB]));
    const rotaB = rotaAte(b, pe.outro, new Set([celulaA]));
    if (!rotaA || !rotaB) return false;

    const conversa: Conversa = {
      a,
      b,
      evento,
      // fala de evento tem duas linhas; a ambiental tem três
      linhas: evento
        ? roteirista.dialogoDeEvento(evento, a.nome)
        : roteirista.dialogoPara(interlocutor(a), interlocutor(b), label, relogio),
      i: 0,
      t: 0,
      fase: "indo",
    };
    a.conversa = b.conversa = conversa;
    porRota(a, rotaA, b.id, label);
    porRota(b, rotaB, a.id, label);
    conversas.push(conversa);
    return true;
  };

  const vestir = (p: Personagem, papel: Papel | undefined) => {
    if (p.papel === papel) return;
    p.papel = papel;
    p.papelT = 0;
  };

  const encarar = (p: Personagem, alvo: Personagem) => {
    p.direcao =
      Math.abs(alvo.x - p.x) > Math.abs(alvo.y - p.y)
        ? alvo.x > p.x
          ? "direita"
          : "esquerda"
        : "frente";
  };

  const voltarParaMesa = (p: Personagem) => {
    p.conversa = undefined;
    p.fala = undefined;
    vestir(p, undefined);
    if (!p.mesa) {
      p.fase = "mesa";
      return;
    }
    // inverte `pontoDoTile`: os pés estão na base da célula
    const volta = caminhoEntreTiles(
      andar,
      {
        x: Math.round(p.x / TILE),
        y: Math.round((p.y + PERSONAGEM_H - TILE) / TILE),
      },
      { x: p.mesa.tileX, y: p.mesa.tileY },
    );
    if (volta && volta.length > 1) {
      p.viagem = { destinoId: p.id, label: "", falha: false, pontos: volta, idx: 1, espera: 0 };
      p.fase = "voltando";
    } else {
      p.viagem = undefined;
      p.fase = "mesa";
      p.x = p.mesa.pessoaX;
      p.y = p.mesa.pessoaY;
      p.direcao = "frente";
    }
  };

  /**
   * Tenta transformar o próximo evento da fila em conversa. É a via
   * principal: só quando ela não produz nada é que a ambiental tem vez.
   */
  const tentarEvento = (): boolean => {
    if (conversas.length >= MAX_CONVERSAS) return false;
    if (viagensAtivas() + 2 > MAX_VIAGENS) return false;

    const escolha = fila.proximo(relogio, resolverDestino);
    if (!escolha) return false;

    const a = porId.get(escolha.par.origem);
    const b = porId.get(escolha.par.destino);
    if (!a || !b) return false;

    /*
     * Execução vira ENTREGA, não conversa.
     *
     * Conversa exige dois lados ativos e um destinatário que responda. Uma
     * execução é um fato de mão única — o sistema chamou o serviço —, e o
     * destino pode ser um conector externo, que não tem mesa e não conversa.
     * A fala vai no balão da viagem, com a contagem que veio do dado.
     */
    if (escolha.evento.tipo === "executou") {
      const ok = iniciarEntregaDeExecucao(a, b, escolha.evento);
      anotar({
        em: relogio,
        evento: `executou:${a.id}->${b.id}`,
        origem: a.id,
        destino: b.id,
        prioridade: escolha.evento.prioridade,
        resultado: ok ? "iniciada" : "sem-rota",
      });
      if (ok) fila.confirmar(escolha.evento, escolha.par, relogio);
      return ok;
    }

    const ok = iniciarConversa(a, b, "", escolha.evento);
    anotar({
      em: relogio,
      evento: `${escolha.evento.tipo}:${escolha.evento.sistema}`,
      origem: a.id,
      destino: b.id,
      prioridade: escolha.evento.prioridade,
      resultado: ok ? "iniciada" : "sem-rota",
    });
    if (ok) fila.confirmar(escolha.evento, escolha.par, relogio);
    return ok;
  };

  /**
   * A viagem de uma execução: o sistema vai até quem ele chamou.
   *
   * Destino com mesa → para ao lado dela. Destino com porta → para na frente
   * da porta. Nos dois casos o balão carrega a fala com a contagem real.
   */
  const iniciarEntregaDeExecucao = (
    a: Personagem,
    b: Personagem,
    evento: EventoEcossistema,
  ): boolean => {
    if (!a.mesa || a.fase !== "mesa" || a.conversa) return false;
    if (viagensAtivas() + 1 > MAX_VIAGENS) return false;

    const pontos = b.mesa
      ? caminhoEntreMesas(andar, a.mesa, b.mesa)
      : b.porta
        ? caminhoAtePorta(andar, a.mesa, b.porta)
        : null;
    if (!pontos || pontos.length < 2) return false;

    const fala = roteirista.dialogoDeEvento(evento, a.nome, b.nome)[0]?.texto ?? "";
    porRota(a, pontos, b.id, fala);
    return true;
  };

  const avancarConversa = (c: Conversa, dt: number, demo: boolean) => {
    c.a.papelT += dt;
    c.b.papelT += dt;

    switch (c.fase) {
      case "indo":
        c.t += dt;
        // quem chega primeiro NÃO fica congelado: entra em espera e respira
        for (const p of [c.a, c.b]) if (p.fase === "encarando") vestir(p, "aguardando");
        if (c.a.fase === "encarando" && c.b.fase === "encarando") {
          c.fase = "encarando";
          c.t = 0;
          encarar(c.a, c.b);
          encarar(c.b, c.a);
        } else if (c.t > LIMITE_ENCONTRO) {
          for (const p of [c.a, c.b]) {
            voltarParaMesa(p);
            p.proxima = intervaloDe(p, demo);
          }
          const i = conversas.indexOf(c);
          if (i >= 0) conversas.splice(i, 1);
        }
        break;

      case "encarando":
        // pararam e se olharam; a pausa antes da primeira fala é o que dá
        // sensação de presença física
        c.t += dt;
        if (c.t >= SEG_ENCARAR) {
          c.fase = "falando";
          c.i = 0;
          c.t = 0;
        }
        break;

      case "falando": {
        c.t += dt;
        const linha = c.linhas[c.i];
        if (linha) {
          const quem = linha.quem === "a" ? c.a : c.b;
          const outro = linha.quem === "a" ? c.b : c.a;
          quem.fala = linha.texto;
          outro.fala = undefined; // um balão por vez
          vestir(quem, "falando");
          vestir(outro, "escutando");
        }
        if (c.t >= SEG_FALA) {
          c.t = 0;
          c.i++;
          if (c.i >= c.linhas.length) {
            c.fase = "despedida";
            c.a.fala = undefined;
            c.b.fala = undefined;
            vestir(c.a, "despedindo");
            vestir(c.b, "despedindo");
          }
        }
        break;
      }

      case "despedida":
        // último balão já saiu; ainda frente a frente, encerrando
        c.t += dt;
        if (c.t >= SEG_DESPEDIDA) {
          c.fase = "pausa";
          c.t = 0;
        }
        break;

      case "pausa":
        c.t += dt;
        if (c.t >= SEG_PAUSA) {
          for (const p of [c.a, c.b]) {
            voltarParaMesa(p);
            p.proxima = intervaloDe(p, demo);
          }
          const i = conversas.indexOf(c);
          if (i >= 0) conversas.splice(i, 1);
          fimDaUltimaConversa = relogio;
        }
        break;
    }
  };

  const fonte: FonteDeEventos = fonteDeRetratos(dados.saude);
  const fila = criarFilaDeEventos();
  const registros: RegistroConversa[] = [];

  const anotar = (r: RegistroConversa) => {
    registros.push(r);
    if (registros.length > MAX_REGISTROS) registros.shift();
  };

  /** Pode sair da mesa para conversar? Quem está ocioso ou sem dado, não. */
  const disponivel = (p: Personagem | undefined): p is Personagem =>
    !!p && p.tipo === "sistema" && !!p.mesa && p.fase === "mesa" && !p.conversa;

  /**
   * Quem precisa saber do evento.
   *
   * Sai do grafo REAL de integrações — nunca de uma lista escrita à mão. Em
   * cima disso há uma única preferência de negócio: se o Gestor de Automações
   * for vizinho do sistema afetado, é ele quem recebe, porque é ali que a
   * integração é acompanhada. Nada disso olha QUAL é o sistema de origem, e
   * por isso vale igual para RH, Obra, Financeiro ou qualquer um que entrar
   * no ecossistema depois.
   */
  const resolverDestino = (evento: EventoEcossistema): Par | null => {
    /*
     * O evento de execução traz o par PRONTO, e não passa pela regra de
     * "quem está parado não anda".
     *
     * Nos outros tipos o destinatário é deduzido do grafo de integrações, e a
     * elegibilidade vem da saúde agregada. Aqui não: o HUB registrou que a
     * Gestão Financeira chamou o Sienge às 09:00:38, e esse registro é prova
     * mais forte do que o agregado — que, medido, subconta o volume em cerca
     * de doze vezes. Exigir que a saúde também dissesse "trabalhando" faria a
     * tela ignorar execução que de fato aconteceu.
     */
    if (evento.tipo === "executou" && evento.destino) {
      const a = porId.get(evento.sistema);
      const b = porId.get(evento.destino);
      if (!a || !b || !a.mesa) return null;
      if (a.fase !== "mesa" || a.conversa) return null;
      return { origem: a.id, destino: b.id };
    }

    const origem = porId.get(evento.sistema);
    if (!disponivel(origem)) return null;
    // quem está em falha PODE avisar da própria falha; ocioso e sem dado, não
    if (estaParado(origem.estado)) return null;

    const candidatos = [...(vizinhos.get(evento.sistema) ?? [])]
      .map((id) => porId.get(id))
      .filter(disponivel)
      .filter((p) => !estaParado(p.estado));
    if (!candidatos.length) return null;

    const hub = candidatos.find((p) => p.id === SISTEMA_HUB_OPERACIONAL);
    const escolhido = hub ?? candidatos[Math.floor(Math.random() * candidatos.length)];
    return { origem: origem.id, destino: escolhido.id };
  };

  const andarAte = (p: Personagem, dt: number): boolean => {
    const v = p.viagem;
    if (!v) return true;
    let restante = VELOCIDADE * dt;
    while (restante > 0 && v.idx < v.pontos.length) {
      const alvo = v.pontos[v.idx];
      const dx = alvo.x - p.x;
      const dy = alvo.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= restante) {
        p.x = alvo.x;
        p.y = alvo.y;
        restante -= dist;
        v.idx++;
      } else {
        const k = restante / dist;
        p.x += dx * k;
        p.y += dy * k;
        p.direcao = direcaoEntre(dx, dy, p.direcao);
        p.passoT += dt;
        return false;
      }
    }
    return v.idx >= v.pontos.length;
  };

  return {
    personagens,
    porId,
    conversas,
    viagensAtivas,
    fila,
    registros,
    pendentes: () => fonte.pendentes(),

    registrarEventos(eventos) {
      fila.registrar(eventos, relogio);
    },

    definirTrabalhoDeDemanda(sistemaId, quantidade) {
      const p = porId.get(sistemaId);
      if (p) p.demandasEmTrabalho = Math.max(0, quantidade);
    },

    /**
     * Retrato novo do HUB.
     *
     * Não recria personagem, não mexe em posição, não cancela conversa. Só
     * atualiza a saúde de cada um e enfileira o que mudou de verdade.
     */
    atualizarDados(novos: DadosEscritorio, quando = Date.now()) {
      dadosAtual = novos;
      recalcular();
      // sistemas E serviços: cada entidade reflete a própria saúde
      for (const p of personagens) p.estado = estadoDoSistema(saudeDe(p.id), quando);
      const eventos = fonte.observar(novos.saude, quando);
      // atividade é outra coisa: só quem executou desde a leitura anterior
      const ativos = fonte.ativos();
      for (const p of personagens) p.executando = ativos.has(p.id);
      fila.registrar(eventos, relogio);
      return eventos;
    },

    atualizar(dt: number, demo: boolean) {
      relogio += dt;
      for (const c of [...conversas]) avancarConversa(c, dt, demo);

      // evento real primeiro, sempre
      tentarEvento();

      for (const p of personagens) {
        p.digitaT += dt;

        switch (p.fase) {
          case "mesa":
          case "oculto": {
            if (!p.agendado) {
              p.agendado = true;
              p.proxima = intervaloDe(p, demo);
            }
            p.proxima -= dt;
            if (p.proxima <= 0) {
              /*
               * Interação ambiental é o último da fila. Se existe evento na
               * fila ou sistema com problema em aberto, ninguém levanta para
               * bater papo — seria o escritório conversando à toa enquanto há
               * coisa real acontecendo.
               */
              const temCoisaReal = fila.tamanho() > 0 || fonte.pendentes().length > 0;
              if (temCoisaReal && !demo) {
                p.proxima = 15 + Math.random() * 20;
              } else if (viagensAtivas() < MAX_VIAGENS) {
                iniciarViagem(p, demo);
                if (p.fase === "mesa" || p.fase === "oculto") p.proxima = intervaloDe(p, demo);
              } else {
                p.proxima = 2 + Math.random() * 3;
              }
            }
            break;
          }
          case "indo": {
            if (andarAte(p, dt)) {
              if (p.conversa) {
                // espera o outro chegar; quem manda agora é a conversa
                p.fase = "encarando";
              } else {
                p.fase = "falando";
                p.direcao = "frente";
                if (p.viagem) p.viagem.espera = SEG_FALANDO;
              }
            }
            break;
          }
          case "encarando":
            break;
          case "falando": {
            const v = p.viagem;
            if (!v) {
              p.fase = "mesa";
              break;
            }
            v.espera -= dt;
            if (v.espera <= 0) {
              v.pontos = [...v.pontos].reverse();
              v.idx = 0;
              // já está no primeiro ponto do caminho invertido
              v.idx = 1;
              p.fase = "voltando";
            }
            break;
          }
          case "voltando": {
            if (andarAte(p, dt)) {
              p.viagem = undefined;
              if (p.tipo === "externo") {
                p.fase = "oculto";
                if (p.porta) {
                  p.x = p.porta.frenteX;
                  p.y = p.porta.frenteY;
                }
              } else if (p.mesa) {
                p.fase = "mesa";
                p.x = p.mesa.pessoaX;
                p.y = p.mesa.pessoaY;
                p.direcao = "frente";
              }
              p.proxima = intervaloDe(p, demo);
            }
            break;
          }
        }
      }
    },
  };
}

/** Fase de caminhada: alterna as pernas 6 vezes por segundo. */
export function passoDe(p: Personagem): 0 | 1 | 2 {
  if (p.fase !== "indo" && p.fase !== "voltando") return 0;
  return (Math.floor(p.passoT * 6) % 2 === 0 ? 1 : 2) as 1 | 2;
}

/**
 * Braços levantados: digitação na mesa, gesto ao falar.
 *
 * São os mesmos 1 px do sprite de produção, em ritmos diferentes. Na mesa é
 * uma batida regular de 3 Hz, que lê como teclado. Falando é mais lento e com
 * o braço em cima menos tempo — lê como quem gesticula explicando, não como
 * quem digita.
 */
export function digitando(p: Personagem): boolean {
  if (p.papel === "falando") return p.papelT * 2.4 - Math.floor(p.papelT * 2.4) < 0.4;
  if (p.fase !== "mesa") return false;
  /*
   * Duas razões independentes para estar digitando, e nenhuma delas mexe no
   * `estado`: o sistema executou recentemente, ou existe demanda real em
   * trabalho sob a responsabilidade visual dele.
   */
  const temMotivo = p.estado === "trabalhando" || (p.demandasEmTrabalho ?? 0) > 0;
  return temMotivo && Math.floor(p.digitaT * 3) % 2 === 0;
}

/**
 * Deslocamento vertical de 1 px durante a conversa.
 *
 * É o único jeito de dar corpo à cena sem frame novo: quem fala balança no
 * ritmo do gesto, quem escuta acena de vez em quando, quem espera respira. A
 * amplitude é 1 px de propósito — 2 já parece tremor.
 */
export function balancoDaConversa(p: Personagem): number {
  switch (p.papel) {
    case "falando":
      return Math.floor(p.papelT * 4.8) % 2 === 0 ? -1 : 0;
    case "escutando": {
      // aceno curto a cada ~1,3 s
      const ciclo = p.papelT % 1.3;
      return ciclo < 0.16 ? 1 : 0;
    }
    case "aguardando":
      // respiração lenta enquanto o outro não chega
      return Math.floor(p.papelT * 0.9) % 2 === 0 ? 0 : -1;
    case "despedindo":
      return Math.floor(p.papelT * 6) % 2 === 0 ? -1 : 0;
    default:
      /*
       * NA MESA, QUEM TEM SINAL RESPIRA.
       *
       * No Munder Difflin a cabeca de quem esta sentado sobe e desce: medi
       * 4 px alternando a cada ~470 ms, cerca de 1 Hz. E o que impede um
       * escritorio parado de parecer morto — e o nosso ficava congelado nas
       * horas em que ninguem anda, que sao a maioria.
       *
       * A amplitude aqui e 1 px, nao 4: o comentario acima ja dizia que 2
       * parece tremor neste sprite, e nao vou contrariar o que ja foi
       * calibrado na tela.
       *
       * QUEM respira e a parte que importa. So quem tem sinal real: executou
       * nas ultimas 24 h, executou agora, ou tem demanda em trabalho. Fazer
       * as onze salas "sem execucao" respirarem seria sugerir atividade onde
       * o dado nao sustenta — o mesmo erro que ja corrigimos tres vezes.
       */
      if (p.fase !== "mesa") return 0;
      if (!respira(p)) return 0;
      return Math.floor(p.digitaT * 1.1) % 2 === 0 ? 0 : -1;
  }
}

/** Tem sinal real para justificar o balanço em repouso? */
function respira(p: Personagem): boolean {
  return (
    p.estado === "trabalhando" ||
    !!p.executando ||
    (p.demandasEmTrabalho ?? 0) > 0
  );
}
