// Geometría del mapa en corte lateral: cálculos puros a partir de nodos y galerías.
// No es lógica de negocio, pero es pura y se testea igual.

/** Margen alrededor de la mina dentro del lienzo. */
export const MARGEN = { izquierda: 70, derecha: 70, abajo: 90 };

/** Alto de la franja de cielo: la superficie es el nodo más alto (la boca). */
export function alturaSuperficie(nodos) {
  const superficie = nodos.filter((n) => n.tipo === 'boca' || n.tipo === 'acopio');
  return superficie.length ? Math.min(...superficie.map((n) => n.y)) : 80;
}

/** Tamaño del lienzo según los nodos. */
export function limitesDelMapa(nodos) {
  const maxX = Math.max(...nodos.map((n) => n.x));
  const maxY = Math.max(...nodos.map((n) => n.y));
  return { ancho: maxX + MARGEN.derecha, alto: maxY + MARGEN.abajo };
}

/**
 * Niveles de profundidad con su altura en el dibujo: el promedio de y de los
 * nodos de las galerías de ese nivel. Ordenados de arriba hacia abajo.
 * @returns {Array<{ nivel: number, y: number }>}
 */
export function nivelesDelMapa(galerias, nodos) {
  const porNivel = new Map();
  for (const g of galerias) {
    const ys = nodos.filter((n) => n.galeriaId === g.id).map((n) => n.y);
    if (!ys.length) continue;
    if (!porNivel.has(g.nivel)) porNivel.set(g.nivel, []);
    porNivel.get(g.nivel).push(...ys);
  }
  return [...porNivel]
    .map(([nivel, ys]) => ({ nivel, y: ys.reduce((a, b) => a + b, 0) / ys.length }))
    .sort((a, b) => a.y - b.y);
}

/**
 * Límites entre estratos: a mitad de camino entre la superficie y cada nivel,
 * y entre niveles consecutivos, más uno debajo del último.
 */
export function limitesDeEstratos(superficie, niveles, alto) {
  const ys = [superficie, ...niveles.map((n) => n.y)];
  const limites = [];
  for (let i = 1; i < ys.length; i++) limites.push((ys[i - 1] + ys[i]) / 2);
  const ultimo = ys.at(-1);
  limites.push(ultimo + (alto - ultimo) / 2);
  return limites;
}

/** Vecinos de un nodo según las aristas. */
export function vecinos(nodoId, aristas) {
  return aristas.flatMap((a) => (a.desde === nodoId ? [a.hasta] : a.hasta === nodoId ? [a.desde] : []));
}

/**
 * Hacia dónde mira un frente de excavación: +1 (derecha) o −1 (izquierda),
 * según de qué lado viene el túnel.
 */
export function ladoDelFrente(frente, nodosPorId, aristas) {
  const [vecinoId] = vecinos(frente.id, aristas);
  const vecino = nodosPorId.get(vecinoId);
  if (!vecino) return 1;
  return frente.x >= vecino.x ? 1 : -1;
}

/** Punto medio de un tramo. */
export function puntoMedio(p, q) {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

/** Extremos (x mín y máx) de los nodos de una galería, para ubicar su etiqueta. */
export function extensionDeGaleria(galeriaId, nodos) {
  const propios = nodos.filter((n) => n.galeriaId === galeriaId);
  if (!propios.length) return null;
  const xs = propios.map((n) => n.x);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), y: propios[0].y };
}
