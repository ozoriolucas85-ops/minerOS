import { describe, it, expect } from 'vitest';
import { crearSeed, CONFIG_POR_DEFECTO } from '../src/data/seed.js';

const seed = crearSeed({ ahora: new Date('2026-11-20T10:00:00').getTime() });

describe('mina demo', () => {
  it('tiene 3 niveles y 6 galerías con distintos tipos de roca', () => {
    expect(new Set(seed.galerias.map((g) => g.nivel))).toEqual(new Set([-20, -40, -60]));
    expect(seed.galerias).toHaveLength(6);
    expect(new Set(seed.galerias.map((g) => g.roca))).toEqual(new Set(['dura', 'media', 'blanda']));
  });

  it('usa los límites por defecto según la roca', () => {
    for (const g of seed.galerias) {
      expect(g.metrosMax).toBe(CONFIG_POR_DEFECTO.limitesPorRoca[g.roca].metrosMax);
      expect(g.velocidadMax).toBe(CONFIG_POR_DEFECTO.limitesPorRoca[g.roca].velocidadMax);
    }
  });

  it('tiene boca, acopio, 2 refugios, cruces y frentes', () => {
    const tipos = seed.nodos.map((n) => n.tipo);
    expect(tipos.filter((t) => t === 'boca')).toHaveLength(1);
    expect(tipos.filter((t) => t === 'acopio')).toHaveLength(1);
    expect(tipos.filter((t) => t === 'refugio')).toHaveLength(2);
    expect(tipos.filter((t) => t === 'frente')).toHaveLength(6);
    expect(tipos.filter((t) => t === 'cruce').length).toBeGreaterThan(0);
  });

  it('cada arista une nodos existentes y cada galería tiene tramos', () => {
    const ids = new Set(seed.nodos.map((n) => n.id));
    for (const a of seed.aristas) {
      expect(ids.has(a.desde)).toBe(true);
      expect(ids.has(a.hasta)).toBe(true);
    }
    for (const g of seed.galerias) {
      expect(seed.aristas.some((a) => a.galeriaId === g.id)).toBe(true);
    }
  });

  it('tiene 1 ingeniero y 3 cuadrillas con capataz y 4 a 5 trabajadores', () => {
    expect(seed.usuarios.filter((u) => u.rol === 'ingeniero')).toHaveLength(1);
    expect(seed.cuadrillas).toHaveLength(3);
    for (const c of seed.cuadrillas) {
      expect(seed.usuarios.find((u) => u.id === c.capatazId).rol).toBe('capataz');
      expect(c.trabajadorIds.length).toBeGreaterThanOrEqual(4);
      expect(c.trabajadorIds.length).toBeLessThanOrEqual(5);
    }
  });

  it('los ids son únicos en cada colección', () => {
    for (const [coleccion, lista] of Object.entries(seed)) {
      const ids = lista.map((o) => o.id);
      expect(new Set(ids).size, coleccion).toBe(ids.length);
    }
  });

  it('los escaneos referencian usuarios y nodos válidos', () => {
    const usuarios = new Set(seed.usuarios.map((u) => u.id));
    const nodos = new Set(seed.nodos.map((n) => n.id));
    for (const e of seed.escaneos) {
      expect(usuarios.has(e.usuarioId)).toBe(true);
      expect(nodos.has(e.nodoId)).toBe(true);
    }
  });

  it('no modifica la configuración por defecto', () => {
    seed.config[0].toleranciaPerdida = 50;
    expect(CONFIG_POR_DEFECTO.toleranciaPerdida).toBe(3);
  });
});
