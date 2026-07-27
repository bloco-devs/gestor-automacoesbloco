import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * O slot de contexto do header global.
 *
 * O PROBLEMA QUE RESOLVE
 * O Workspace empilhava cinco faixas horizontais antes do primeiro cartão:
 * breadcrumb (40px), tabs do shell (44px), cabeçalho do projeto (84px), filas
 * (33px) e lentes (41px). Num notebook isso é um terço da tela gasto em
 * moldura — e nenhuma dessas faixas tinha como sumir, porque cada uma era dona
 * de uma informação que a de cima não sabia mostrar.
 *
 * Este slot inverte a dependência: o header global continua sendo um só, com
 * 40px, e a PÁGINA diz o que ele deve conter. Assim o cabeçalho do projeto
 * deixa de ser uma faixa própria e vira o conteúdo da faixa que já existia.
 *
 * POR QUE UMA PILHA E NÃO UM VALOR
 * Rotas aninhadas montam de fora para dentro e desmontam em ordem imprevisível.
 * Com um valor único, uma página filha que desmonta apagaria o contexto que a
 * mãe tinha posto. A pilha devolve o contexto anterior no lugar de esvaziar.
 *
 * Não usa portal de DOM de propósito: portal quebra a ordem de foco e a leitura
 * de leitores de tela, e aqui não há necessidade — provider e slot vivem na
 * mesma árvore React.
 */

interface Registro {
  id: number;
  node: ReactNode;
}

interface Valor {
  registrar: (id: number, node: ReactNode) => void;
  remover: (id: number) => void;
  topo: ReactNode;
}

const Ctx = createContext<Valor | null>(null);

export function HeaderContextoProvider({ children }: { children: ReactNode }) {
  const [pilha, setPilha] = useState<Registro[]>([]);

  const registrar = useCallback((id: number, node: ReactNode) => {
    setPilha((p) => [...p.filter((r) => r.id !== id), { id, node }]);
  }, []);

  const remover = useCallback((id: number) => {
    setPilha((p) => p.filter((r) => r.id !== id));
  }, []);

  const valor = useMemo<Valor>(
    () => ({ registrar, remover, topo: pilha.length ? pilha[pilha.length - 1].node : null }),
    [registrar, remover, pilha],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

let proximoId = 1;

/**
 * Preenche o header com o contexto desta página.
 *
 * `deps` existe porque `node` é um elemento novo a cada render; sem ele o
 * efeito rodaria sempre e o header piscaria. Declare aí o que de fato muda.
 */
export function useContextoDeHeader(node: ReactNode, deps: unknown[]) {
  const ctx = useContext(Ctx);
  const id = useMemo(() => proximoId++, []);

  useEffect(() => {
    if (!ctx) return;
    ctx.registrar(id, node);
    return () => ctx.remover(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
}

/** Onde o contexto aparece. Devolve `null` quando nenhuma página preencheu. */
export function useHeaderTemContexto(): boolean {
  return useContext(Ctx)?.topo != null;
}

export function HeaderContexto() {
  const ctx = useContext(Ctx);
  return <>{ctx?.topo ?? null}</>;
}
