import { describe, it, expect } from 'vitest';
import { crearGrafo, bfs, rutaDeSalida, hiloDeAriadna, caminoDelHilo, volverPorElHilo } from '../src/domain/rutas.js';
import { indexarPorId } from '../src/domain/utilidades.js';
import { crearSeed } from '../src/data/seed.js';

const seed = crearSeed({ ahora: 0 });
const nodosPorId = indexarPorId(seed.nodos);
const grafo = crearGrafo(seed.nodos, seed.aristas);

describe('crearGrafo', () => {
  it('tiene un nodo por baliza y aristas en los dos sentidos', () => {
    expect(grafo.size).toBe(seed.nodos.length);
    expect(grafo.get('C1').map((p) => p.vecino)).toContain('BOCA');
    expect(grafo.get('BOCA').map((p) => p.vecino)).toContain('C1');
  });
  it('ignora aristas con nodos inexistentes', () => {
    const g = crearGrafo([{ id: 'A' }], [{ id: 'x', desde: 'A', hasta: 'B' }]);
    expect(g.get('A')).toEqual([]);
  });
});

describe('bfs', () => {
  it('encuentra el camino más corto en tramos', () => {
    const r = bfs(grafo, 'G1-F', (id) => id === 'BOCA');
    expect(r.camino).toEqual(['G1-F', 'G1-P', 'C1', 'BOCA']);
    expect(r.aristas).toEqual(['A-G1b', 'A-G1a', 'A-R1']);
  });
  it('origen desconocido o sin camino → null', () => {
    expect(bfs(grafo, 'NADA', () => true)).toBeNull();
    expect(bfs(grafo, 'C1', (id) => id === 'NADA')).toBeNull();
  });
  it('si el origen ya es destino, camino de un nodo', () => {
    expect(bfs(grafo, 'BOCA', (id) => id === 'BOCA')).toEqual({ camino: ['BOCA'], aristas: [] });
  });
});

describe('rutaDeSalida', () => {
  it('va al refugio si está más cerca que la boca', () => {
    const r = rutaDeSalida({ grafo, origen: 'G1-F', nodosPorId });
    expect(r.camino).toEqual(['G1-F', 'G1-P', 'R1']);
    expect(r.destino).toBe('R1');
    expect(r.tramos).toBe(2);
  });

  it('desde el nivel −40 sube por la rampa a la boca', () => {
    const r = rutaDeSalida({ grafo, origen: 'G3-F', nodosPorId });
    expect(r.camino).toEqual(['G3-F', 'G3-P', 'C2', 'C1', 'BOCA']);
  });

  it('esquiva las galerías bloqueadas', () => {
    // Desde C3 el refugio R2 está por G6. Si G6 está bloqueada, sube por la rampa.
    const libre = rutaDeSalida({ grafo, origen: 'C3', nodosPorId });
    expect(libre.destino).toBe('R2');
    const conBloqueo = rutaDeSalida({ grafo, origen: 'C3', nodosPorId, galeriasBloqueadas: new Set(['G6']) });
    expect(conBloqueo.camino).toEqual(['C3', 'C2', 'C1', 'BOCA']);
    expect(conBloqueo.aristas.some((a) => a.startsWith('A-G6'))).toBe(false);
  });

  it('quien está dentro de una galería bloqueada puede salir de ella', () => {
    const r = rutaDeSalida({ grafo, origen: 'G5-F', nodosPorId, galeriasBloqueadas: new Set(['G5']) });
    expect(r.camino).toEqual(['G5-F', 'G5-P', 'C3', 'G6-P', 'R2']);
  });

  it('sin camino de salida → null', () => {
    const nodos = [
      { id: 'F', tipo: 'frente', galeriaId: 'GX' },
      { id: 'C', tipo: 'cruce', galeriaId: null },
      { id: 'B', tipo: 'boca', galeriaId: null },
    ];
    const g = crearGrafo(nodos, [
      { id: 'a1', desde: 'F', hasta: 'C', galeriaId: 'GX' },
      { id: 'a2', desde: 'C', hasta: 'B', galeriaId: 'GY' },
    ]);
    expect(rutaDeSalida({ grafo: g, origen: 'F', nodosPorId: indexarPorId(nodos), galeriasBloqueadas: new Set(['GY']) })).toBeNull();
  });

  it('solo a la boca si se piden solo bocas', () => {
    const r = rutaDeSalida({ grafo, origen: 'G1-F', nodosPorId, tiposDestino: ['boca'] });
    expect(r.destino).toBe('BOCA');
  });
});

describe('hilo de Ariadna', () => {
  const escaneos = [
    { usuarioId: 'U1', nodoId: 'C1', timestamp: 2 },
    { usuarioId: 'U1', nodoId: 'BOCA', timestamp: 1 },
    { usuarioId: 'U1', nodoId: 'C1', timestamp: 3 },
    { usuarioId: 'U1', nodoId: 'G3-F', timestamp: 4 },
    { usuarioId: 'U2', nodoId: 'G1-F', timestamp: 5 },
  ];

  it('secuencia de balizas sin repeticiones consecutivas', () => {
    expect(hiloDeAriadna(escaneos, 'U1')).toEqual(['BOCA', 'C1', 'G3-F']);
    expect(hiloDeAriadna(escaneos, 'U1', { desde: 3 })).toEqual(['C1', 'G3-F']);
    expect(hiloDeAriadna(escaneos, 'nadie')).toEqual([]);
  });

  it('camino continuo por los túneles entre balizas salteadas', () => {
    expect(caminoDelHilo(grafo, ['BOCA', 'C1', 'G3-F'])).toEqual(['BOCA', 'C1', 'C2', 'G3-P', 'G3-F']);
    expect(caminoDelHilo(grafo, [])).toEqual([]);
    expect(caminoDelHilo(grafo, ['BOCA', 'DESCONOCIDO'])).toEqual(['BOCA', 'DESCONOCIDO']);
  });

  it('volver por el hilo lo recorre al revés sin modificar el original', () => {
    const camino = ['BOCA', 'C1', 'C2'];
    expect(volverPorElHilo(camino)).toEqual(['C2', 'C1', 'BOCA']);
    expect(camino).toEqual(['BOCA', 'C1', 'C2']);
  });
});
