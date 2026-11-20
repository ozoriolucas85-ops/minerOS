import { describe, it, expect } from 'vitest';
import {
  alturaSuperficie,
  limitesDelMapa,
  nivelesDelMapa,
  limitesDeEstratos,
  vecinos,
  ladoDelFrente,
  puntoMedio,
  extensionDeGaleria,
  MARGEN,
} from '../src/ui/mapa/geometria.js';
import { dibujarMapa } from '../src/ui/mapa/dibujo.js';
import { crearSeed } from '../src/data/seed.js';

const seed = crearSeed({ ahora: 0 });
const nodosPorId = new Map(seed.nodos.map((n) => [n.id, n]));

describe('geometría del mapa', () => {
  it('la superficie es la altura de la boca y el acopio', () => {
    expect(alturaSuperficie(seed.nodos)).toBe(80);
    expect(alturaSuperficie([{ tipo: 'cruce', y: 5 }])).toBe(80);
  });

  it('el lienzo abarca todos los nodos más el margen', () => {
    expect(limitesDelMapa(seed.nodos)).toEqual({ ancho: 1110 + MARGEN.derecha, alto: 516 + MARGEN.abajo });
  });

  it('los niveles salen de los nodos de cada galería, de arriba hacia abajo', () => {
    expect(nivelesDelMapa(seed.galerias, seed.nodos)).toEqual([
      { nivel: -20, y: 210 },
      { nivel: -40, y: 340 },
      { nivel: -60, y: 470 },
    ]);
    expect(nivelesDelMapa([{ id: 'X', nivel: -5 }], seed.nodos)).toEqual([]);
  });

  it('los límites de estratos quedan entre la superficie y los niveles', () => {
    expect(limitesDeEstratos(80, [{ y: 210 }, { y: 340 }], 560)).toEqual([145, 275, 450]);
  });

  it('vecinos y lado del frente', () => {
    expect(vecinos('C1', seed.aristas).sort()).toEqual(['BOCA', 'C2', 'G1-P', 'G2-F']);
    expect(ladoDelFrente(nodosPorId.get('G1-F'), nodosPorId, seed.aristas)).toBe(1);
    expect(ladoDelFrente(nodosPorId.get('G2-F'), nodosPorId, seed.aristas)).toBe(-1);
    expect(ladoDelFrente({ id: 'solo', x: 0 }, nodosPorId, seed.aristas)).toBe(1);
  });

  it('punto medio y extensión de una galería', () => {
    expect(puntoMedio({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    expect(extensionDeGaleria('G3', seed.nodos)).toEqual({ minX: 800, maxX: 1050, y: 340 });
    expect(extensionDeGaleria('NADA', seed.nodos)).toBeNull();
  });
});

describe('dibujarMapa', () => {
  const estados = new Map(seed.galerias.map((g) => [g.id, 'verde']));
  estados.set('G3', 'amarillo');
  const galerias = seed.galerias.map((g) => (g.id === 'G5' ? { ...g, bloqueada: true } : g));
  const { contenido, ancho, alto } = dibujarMapa({ nodos: seed.nodos, aristas: seed.aristas, galerias, estados: new Map([...estados, ['G5', 'rojo']]) });

  it('cada galería es un elemento con su id, su color y es clickeable', () => {
    for (const g of seed.galerias) expect(contenido).toContain(`id="${g.svgId}"`);
    expect(contenido).toMatch(/id="galeria-G3" class="galeria galeria--amarillo/);
    expect(contenido).toMatch(/data-galeria="G3" role="link" tabindex="0"/);
  });

  it('las bloqueadas llevan rayado, X y "CERRADA"', () => {
    expect(contenido).toMatch(/galeria--rojo galeria--bloqueada/);
    expect(contenido).toContain('galeria__rayado');
    expect(contenido).toContain('galeria__x');
    expect(contenido).toContain('CERRADA');
  });

  it('dibuja niveles, íconos de boca, refugio y acopio, y deja capas para rutas y personas', () => {
    expect(contenido).toContain('−20 m');
    expect(contenido).toContain('nodo--boca');
    expect(contenido).toContain('nodo--refugio');
    expect(contenido).toContain('nodo--acopio');
    expect(contenido).toContain('id="mapa-rutas"');
    expect(contenido).toContain('id="mapa-personas"');
    expect(ancho).toBeGreaterThan(1000);
    expect(alto).toBeGreaterThan(400);
  });

  it('con otro prefijo los ids no chocan y sin interacción no es enfocable', () => {
    const mini = dibujarMapa({ nodos: seed.nodos, aristas: seed.aristas, galerias, estados }, { prefijo: 'mini', interactivo: false });
    expect(mini.contenido).toContain('id="mini-galeria-G1"');
    expect(mini.contenido).not.toContain('tabindex');
  });
});

describe('personas y caminos en el mapa', () => {
  it('una persona sola queda sobre su baliza; varias se reparten', async () => {
    const { posicionesDePersonas } = await import('../src/ui/mapa/geometria.js');
    const p = (id, nodoId) => ({ usuario: { id }, nodoId });
    const pos = posicionesDePersonas([p('a', 'C1'), p('b', 'G3-F'), p('c', 'G3-F'), p('d', 'NADA')], nodosPorId, 10);
    expect(pos.get('a')).toEqual({ x: 420, y: 200 });
    const b = pos.get('b');
    const c = pos.get('c');
    expect(Math.round(b.x)).toBe(1050);
    expect(Math.round(b.y)).toBe(330);
    expect(Math.round(c.y)).toBe(350);
    expect(pos.has('d')).toBe(false);
  });

  it('trazo de un camino por sus nodos', async () => {
    const { trazoDeCamino } = await import('../src/ui/mapa/geometria.js');
    expect(trazoDeCamino(['BOCA', 'C1', 'X'], nodosPorId)).toBe('M330 80 L420 210');
    expect(trazoDeCamino([], nodosPorId)).toBe('');
  });
});
