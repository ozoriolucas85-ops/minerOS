import { describe, it, expect, vi } from 'vitest';
import { crearAlmacenLocal } from '../src/storage/local.js';
import { generarId } from '../src/storage/index.js';
import { crearAlmacenFalso } from './ayudas.js';

const nuevo = () => crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null });

describe('almacén local', () => {
  it('guarda, obtiene y lista', async () => {
    const s = nuevo();
    await s.guardar('galerias', { id: 'G1', nombre: 'Norte' });
    await s.guardar('galerias', { id: 'G2', nombre: 'Oeste' });
    expect(await s.obtener('galerias', 'G1')).toEqual({ id: 'G1', nombre: 'Norte' });
    expect(await s.listar('galerias')).toHaveLength(2);
    expect(await s.listar('galerias', (g) => g.nombre === 'Oeste')).toEqual([{ id: 'G2', nombre: 'Oeste' }]);
  });

  it('modifica por id y devuelve copias (no referencias)', async () => {
    const s = nuevo();
    const g = { id: 'G1', metros: 1 };
    await s.guardar('galerias', g);
    g.metros = 99;
    expect((await s.obtener('galerias', 'G1')).metros).toBe(1);
    await s.guardar('galerias', { id: 'G1', metros: 2 });
    expect(await s.listar('galerias')).toEqual([{ id: 'G1', metros: 2 }]);
  });

  it('devuelve null o vacío si no existe', async () => {
    const s = nuevo();
    expect(await s.obtener('galerias', 'X')).toBeNull();
    expect(await s.listar('cargas')).toEqual([]);
    expect(await s.borrar('cargas', 'X')).toBe(false);
  });

  it('borra', async () => {
    const s = nuevo();
    await s.guardar('cargas', { id: 'C1' });
    expect(await s.borrar('cargas', 'C1')).toBe(true);
    expect(await s.listar('cargas')).toEqual([]);
  });

  it('guardarVarios guarda una lista', async () => {
    const s = nuevo();
    await s.guardarVarios('nodos', [{ id: 'A' }, { id: 'B' }]);
    expect(await s.listar('nodos')).toHaveLength(2);
  });

  it('exige id', async () => {
    const s = nuevo();
    await expect(s.guardar('cargas', { nombre: 'sin id' })).rejects.toThrow(/id/);
  });

  it('reemplazarTodo deja solo los datos nuevos y marca que no está vacío', async () => {
    const s = nuevo();
    expect(await s.estaVacio()).toBe(true);
    await s.guardar('cargas', { id: 'vieja' });
    await s.reemplazarTodo({ galerias: [{ id: 'G1' }] });
    expect(await s.estaVacio()).toBe(false);
    expect(await s.listar('cargas')).toEqual([]);
    expect(await s.exportar()).toEqual({ galerias: [{ id: 'G1' }] });
  });

  it('avisa a los suscriptores y permite desuscribirse', async () => {
    const s = nuevo();
    const fn = vi.fn();
    const salir = s.suscribirse(fn);
    await s.guardar('galerias', { id: 'G1' });
    expect(fn).toHaveBeenCalledWith({ coleccion: 'galerias', tipo: 'guardar', id: 'G1' });
    salir();
    await s.borrar('galerias', 'G1');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('tolera JSON dañado', async () => {
    const almacen = crearAlmacenFalso();
    almacen.setItem('canario:v1:galerias', '{roto');
    const s = crearAlmacenLocal({ almacen, ventana: null });
    expect(await s.listar('galerias')).toEqual([]);
  });

  it('exige un almacén', () => {
    expect(() => crearAlmacenLocal({})).toThrow();
  });

  it('generarId crea ids únicos con prefijo', () => {
    const a = generarId('av');
    expect(a).toMatch(/^av-/);
    expect(generarId('av')).not.toBe(a);
  });
});

describe('borrarDonde', () => {
  it('borra los que cumplen el filtro y avisa', async () => {
    const s = crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null });
    await s.guardarVarios('escaneos', [{ id: 'a', simulado: true }, { id: 'b', simulado: false }, { id: 'c', simulado: true }]);
    expect(await s.borrarDonde('escaneos', (e) => e.simulado)).toBe(2);
    expect(await s.listar('escaneos')).toEqual([{ id: 'b', simulado: false }]);
    expect(await s.borrarDonde('escaneos', (e) => e.simulado)).toBe(0);
  });
});
