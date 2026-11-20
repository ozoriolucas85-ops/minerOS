import { describe, it, expect, beforeEach } from 'vitest';
import { estado } from '../src/state.js';
import { crearAlmacenLocal } from '../src/storage/local.js';
import {
  crearCarga,
  registrarPesaje,
  guardarPureza,
  calcularPurezaDeCarga,
  buscarCargaPorCodigo,
  puntosDeCarga,
} from '../src/servicios/cargas.js';
import { registrarAvance } from '../src/servicios/galerias.js';
import { crearAlmacenFalso } from './ayudas.js';

beforeEach(async () => {
  await estado.iniciar(crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null }));
});

const datos = { cuadrillaId: 'CU-ESTE', galeriaId: 'G3', mineral: 'hierro', volumen: 0.25 };

describe('servicio de cargas', () => {
  it('crea cargas con códigos únicos correlativos', async () => {
    const a = await crearCarga({ ...datos, ahora: 1 });
    const b = await crearCarga({ ...datos, ahora: 2 });
    expect(a.codigo).toBe('CAN-0001');
    expect(b.codigo).toBe('CAN-0002');
    expect(buscarCargaPorCodigo('can-0002').id).toBe(b.id);
    expect(buscarCargaPorCodigo('CAN-9999')).toBeNull();
  });

  it('valida los datos y no deja crear cargas en una galería bloqueada', async () => {
    await expect(crearCarga({ ...datos, volumen: 0 })).rejects.toThrow(/volumen/);
    await expect(crearCarga({ ...datos, galeriaId: 'NADA' })).rejects.toThrow(/no existe/);
    await expect(crearCarga({ ...datos, cuadrillaId: 'NADA' })).rejects.toThrow(/cuadrilla no existe/);
    await registrarAvance('G3', { metros: 3 });
    await expect(crearCarga(datos)).rejects.toThrow(/bloqueada/);
  });

  it('sugiere los puntos de pesaje y el próximo', async () => {
    const c = await crearCarga(datos);
    expect(puntosDeCarga(c)).toEqual({ recorrido: ['G3-F', 'G3-P', 'C2', 'C1', 'BOCA', 'ACOPIO'], proximo: 'G3-F' });
  });

  it('registra pesajes y marca el tramo sospechoso con un evento (900 → 850)', async () => {
    const c = await crearCarga(datos);
    let r = await registrarPesaje(c.id, { nodoId: 'G3-F', peso: 900, ahora: 10 });
    expect(r.tramo).toBeNull();
    r = await registrarPesaje(c.id, { nodoId: 'C2', peso: 850, ahora: 20 });
    expect(r.tramo.sospechoso).toBe(true);
    const ev = estado.listar('eventos', (e) => e.tipo === 'sospechoso');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ codigo: 'CAN-0001', cuadrillaId: 'CU-ESTE', timestamp: 20 });
    expect(ev[0].detalle).toMatch(/Cuadrilla Este/);
    r = await registrarPesaje(c.id, { nodoId: 'BOCA', peso: 849, ahora: 30 });
    expect(r.tramo.sospechoso).toBe(false);
    expect(estado.obtener('cargas', c.id).pesajes).toHaveLength(3);
  });

  it('rechaza pesajes inválidos', async () => {
    const c = await crearCarga(datos);
    await expect(registrarPesaje(c.id, { nodoId: 'G3-F', peso: 0 })).rejects.toThrow(/mayor que 0/);
    await expect(registrarPesaje(c.id, { nodoId: 'BOCA', peso: 10 })).rejects.toThrow(/frente/);
    await expect(registrarPesaje('NADA', { nodoId: 'G3-F', peso: 10 })).rejects.toThrow(/no existe/);
  });

  it('pureza por densidad: hierro 900 kg en 0,25 m³ ≈ 38,5 % y se guarda', async () => {
    const c = await crearCarga(datos);
    await registrarPesaje(c.id, { nodoId: 'G3-F', peso: 900, ahora: 1 });
    const guardada = await guardarPureza(c.id, { modo: 'densidad' });
    expect(guardada.pureza).toBeCloseTo(38.46, 2);
    expect(guardada.modoPureza).toBe('densidad');
    expect(guardada.purezaDetalle).toMatchObject({ clasificacion: 'Baja' });
    expect(guardada.purezaDetalle.densidad).toBeCloseTo(3.6, 10);
  });

  it('pureza manual con el peso final de la carga', async () => {
    const c = await crearCarga({ ...datos, mineral: 'caliza' });
    await registrarPesaje(c.id, { nodoId: 'G3-F', peso: 1000, ahora: 1 });
    const r = calcularPurezaDeCarga(estado.obtener('cargas', c.id), { modo: 'manual', muestra: 10, util: 9 });
    expect(r).toMatchObject({ pureza: 90, clasificacion: 'Alta', mineralUtil: 900 });
    const sinPesajes = calcularPurezaDeCarga({ ...c, pesajes: [] }, { modo: 'manual', muestra: 10, util: 5 });
    expect(sinPesajes.mineralUtil).toBeNull();
    expect(() => calcularPurezaDeCarga(c, { modo: 'otro' })).toThrow(/modo/);
  });
});
