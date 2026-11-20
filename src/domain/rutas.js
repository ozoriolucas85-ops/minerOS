// Grafo de la mina, ruta de salida (BFS) e hilo de Ariadna (sección 3.2).
// Nodos = balizas/puntos; aristas = tramos de túnel (no dirigidos).

/**
 * Arma la lista de adyacencia.
 * @returns {Map<string, Array<{ vecino: string, aristaId: string, galeriaId: string|null }>>}
 */
export function crearGrafo(nodos, aristas) {
  const grafo = new Map(nodos.map((n) => [n.id, []]));
  for (const a of aristas) {
    if (!grafo.has(a.desde) || !grafo.has(a.hasta)) continue;
    grafo.get(a.desde).push({ vecino: a.hasta, aristaId: a.id, galeriaId: a.galeriaId ?? null });
    grafo.get(a.hasta).push({ vecino: a.desde, aristaId: a.id, galeriaId: a.galeriaId ?? null });
  }
  return grafo;
}

/**
 * BFS desde `origen` hasta el primer nodo que cumpla `esDestino`.
 * `puedePasar(paso)` decide si se puede usar un tramo.
 * @returns {{ camino: string[], aristas: string[] } | null}
 */
export function bfs(grafo, origen, esDestino, puedePasar = () => true) {
  if (!grafo.has(origen)) return null;
  const previo = new Map([[origen, null]]);
  const cola = [origen];
  while (cola.length) {
    const actual = cola.shift();
    if (esDestino(actual)) {
      const camino = [];
      const aristas = [];
      for (let n = actual; n !== null; n = previo.get(n)?.desde ?? null) {
        camino.unshift(n);
        const paso = previo.get(n);
        if (paso) aristas.unshift(paso.aristaId);
      }
      return { camino, aristas };
    }
    for (const paso of grafo.get(actual)) {
      if (previo.has(paso.vecino) || !puedePasar(paso)) continue;
      previo.set(paso.vecino, { desde: actual, aristaId: paso.aristaId });
      cola.push(paso.vecino);
    }
  }
  return null;
}

/**
 * Ruta de salida más corta (en tramos) hasta la boca de mina o el refugio más
 * cercano, evitando galerías bloqueadas. Si la persona está dentro de una
 * galería bloqueada, puede usar los tramos de ESA galería para salir de ella.
 * @param {{ grafo, origen: string, nodosPorId: Map, galeriasBloqueadas: Set<string>, tiposDestino?: string[] }} datos
 * @returns {{ camino: string[], aristas: string[], destino: string, tramos: number } | null}
 */
export function rutaDeSalida({ grafo, origen, nodosPorId, galeriasBloqueadas = new Set(), tiposDestino = ['boca', 'refugio'] }) {
  const galeriaOrigen = nodosPorId.get(origen)?.galeriaId ?? null;
  const resultado = bfs(
    grafo,
    origen,
    (id) => tiposDestino.includes(nodosPorId.get(id)?.tipo),
    (paso) => !paso.galeriaId || !galeriasBloqueadas.has(paso.galeriaId) || paso.galeriaId === galeriaOrigen,
  );
  if (!resultado) return null;
  return { ...resultado, destino: resultado.camino.at(-1), tramos: resultado.aristas.length };
}

/**
 * Hilo de Ariadna: secuencia de balizas escaneadas por un trabajador
 * (sin repeticiones consecutivas), opcionalmente desde un momento dado.
 */
export function hiloDeAriadna(escaneos, usuarioId, { desde = -Infinity } = {}) {
  const secuencia = [];
  escaneos
    .filter((e) => e.usuarioId === usuarioId && e.timestamp >= desde)
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((e) => {
      if (secuencia.at(-1) !== e.nodoId) secuencia.push(e.nodoId);
    });
  return secuencia;
}

/**
 * Convierte la secuencia de balizas en un camino continuo por los túneles
 * (rellena los tramos entre balizas no consecutivas con el camino más corto).
 */
export function caminoDelHilo(grafo, secuencia) {
  if (secuencia.length === 0) return [];
  const camino = [secuencia[0]];
  for (let i = 1; i < secuencia.length; i++) {
    const tramo = bfs(grafo, secuencia[i - 1], (id) => id === secuencia[i]);
    if (tramo) camino.push(...tramo.camino.slice(1));
    else camino.push(secuencia[i]);
  }
  return camino;
}

/** "Volver por el hilo": el mismo recorrido, al revés. */
export function volverPorElHilo(camino) {
  return [...camino].reverse();
}
