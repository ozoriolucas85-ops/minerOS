import { describe, it, expect, vi } from 'vitest';
import { crearEstado } from '../src/state.js';
import { crearAlmacenLocal } from '../src/storage/local.js';
import { crearSeed } from '../src/data/seed.js';
import { crearAlmacenFalso } from './ayudas.js';

async function iniciado() {
  const storage = crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null });
  const estado = crearEstado({ crearSeed });
  const r = await estado.iniciar(storage);
  return { estado, storage, r };
}

describe('estado global', () => {
  it('carga la mina demo la primera vez', async () => {
    const { estado, r } = await iniciado();
    expect(r.sembrado).toBe(true);
    expect(estado.listar('galerias')).toHaveLength(6);
    expect(estado.config().toleranciaPerdida).toBe(3);
  });

  it('no vuelve a sembrar si ya hay datos (los datos persisten)', async () => {
    const almacen = crearAlmacenFalso();
    const e1 = crearEstado({ crearSeed });
    await e1.iniciar(crearAlmacenLocal({ almacen, ventana: null }));
    await e1.guardar('cargas', { id: 'CAN-1' });

    const e2 = crearEstado({ crearSeed });
    const r = await e2.iniciar(crearAlmacenLocal({ almacen, ventana: null }));
    expect(r.sembrado).toBe(false);
    expect(e2.obtener('cargas', 'CAN-1')).toEqual({ id: 'CAN-1' });
  });

  it('guarda, persiste y avisa', async () => {
    const { estado, storage } = await iniciado();
    const fn = vi.fn();
    estado.suscribirse(fn, ['galerias']);
    await estado.guardar('galerias', { ...estado.obtener('galerias', 'G1'), metrosSinApuntalar: 5 });
    expect(estado.obtener('galerias', 'G1').metrosSinApuntalar).toBe(5);
    expect((await storage.obtener('galerias', 'G1')).metrosSinApuntalar).toBe(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('el filtro de suscripción ignora otras colecciones', async () => {
    const { estado } = await iniciado();
    const fn = vi.fn();
    estado.suscribirse(fn, ['cargas']);
    await estado.guardar('eventos', { id: 'EV1' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('listar acepta filtro y guardarVarios guarda en lote', async () => {
    const { estado } = await iniciado();
    await estado.guardarVarios('eventos', [{ id: 'a', tipo: 'x' }, { id: 'b', tipo: 'y' }]);
    expect(estado.listar('eventos', (e) => e.tipo === 'y')).toEqual([{ id: 'b', tipo: 'y' }]);
  });

  it('borra', async () => {
    const { estado } = await iniciado();
    await estado.guardar('eventos', { id: 'EV1' });
    expect(await estado.borrar('eventos', 'EV1')).toBe(true);
    expect(estado.listar('eventos')).toEqual([]);
  });

  it('restablecerDemo vuelve al estado inicial y avisa', async () => {
    const { estado } = await iniciado();
    await estado.guardar('galerias', { ...estado.obtener('galerias', 'G1'), metrosSinApuntalar: 5 });
    await estado.guardar('cargas', { id: 'CAN-1' });
    const fn = vi.fn();
    estado.suscribirse(fn, ['galerias']);
    await estado.restablecerDemo();
    expect(estado.obtener('galerias', 'G1').metrosSinApuntalar).toBe(2);
    expect(estado.listar('cargas')).toEqual([]);
    expect(fn).toHaveBeenCalledWith({ coleccion: '*', tipo: 'reemplazar' });
  });

  it('un suscriptor que falla no corta a los demás', async () => {
    const { estado } = await iniciado();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fn = vi.fn();
    estado.suscribirse(() => {
      throw new Error('falla');
    });
    estado.suscribirse(fn);
    await estado.guardar('eventos', { id: 'EV1' });
    expect(fn).toHaveBeenCalled();
    error.mockRestore();
  });

  it('falla si se escribe antes de iniciar', async () => {
    const estado = crearEstado({ crearSeed });
    await expect(estado.guardar('eventos', { id: 'x' })).rejects.toThrow(/iniciado/);
  });
});
