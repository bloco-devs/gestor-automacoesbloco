/**
 * Fundos prontos, um só lugar.
 *
 * A lista nasceu dentro do diálogo de novo quadro. Quando a Caixa de Entrada
 * também passou a aceitar fundo, copiar as seis URLs seria garantir que um dia
 * as duas telas oferecessem catálogos diferentes — então a lista saiu de lá.
 * São seis porque a decisão é estética e reversível: mais que isso vira
 * catálogo, e catálogo obriga a parar para escolher.
 */
export interface Fundo {
  label: string;
  url: string;
}

export const FUNDOS: Fundo[] = [
  { label: "Montanhas ao amanhecer", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80" },
  { label: "Floresta de névoa", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80" },
  { label: "Ondas do oceano", url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80" },
  { label: "Dunas de deserto", url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80" },
  { label: "Gradiente abstrato", url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80" },
  { label: "Aurora noturna", url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80" },
];

/** A miniatura pede 200px em vez de 1200: seis fundos grandes por popover custam megabytes. */
export const thumb = (url: string): string => url.replace("w=1200", "w=200");
