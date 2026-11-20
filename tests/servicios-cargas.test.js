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
import { siguienteCodigo } from '../src/domain/traslados.js';
import { crearAlmacenFalso } from './ayudas.js';
import { cambiarUsuario } from '../src/sesion.js';

beforeEach(async () => {
  cambiarUsuario('U-ING');
  await estado.iniciar(crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null }));
});

const datos = { cuadrillaId: 'CU-ESTE', galeriaId: 'G3', mineral: 'hierro', volumen: 0.25 };

describe('servicio de cargas', () => {
  it('crea cargas con códigos únicos correlativos', async () => {
    const esperado = siguienteCodigo(estado.listar('cargas'));
    const a = await crearCarga({ ...datos, ahora: 1 });
    const b = await crearCarga({ ...datos, ahora: 2 });
    expect(a.codigo).toBe(esperado);
    expect(Number(b.codigo.slice(4))).toBe(Number(a.codigo.slice(4)) + 1);
    expect(buscarCargaPorCodigo(b.codigo.toLowerCase()).id).toBe(b.id);
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
    expect(ev[0]).toMatchObject({ codigo: c.codigo, cuadrillaId: 'CU-ESTE', timestamp: 20 });
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

describe('servicio de productividad', () => {
  it('calcula el período por turno y por fechas, y el resumen del panel', async () => {
    const { productividadDelPeriodo, resumenDelPanel } = await import('../src/servicios/productividad.js');
    const t = estado.obtener('turnos', 'T-H1');
    const uno = productividadDelPeriodo({ turnoId: 'T-H1', ahora: t.fin + 1 });
    expect(uno.turnos).toHaveLength(1);
    expect(uno.toneladas).toBeGreaterThan(0);
    expect(uno.cuadrillas).toHaveLength(3);
    expect(uno.trabajadores[0].toneladasPorHora).toBeGreaterThanOrEqual(uno.trabajadores.at(-1).toneladasPorHora ?? 0);
    const todos = productividadDelPeriodo({ ahora: Date.now() + 1e12 });
    expect(todos.evolucion).toHaveLength(6);
    expect(todos.toneladas).toBeGreaterThan(uno.toneladas);
    expect(productividadDelPeriodo({ desde: '1999-01-01', hasta: '1999-01-02' }).toneladas).toBe(0);
    const panel = resumenDelPanel(estado.obtener('turnos', 'T-ACTUAL').inicio + 1000);
    expect(panel.turno.id).toBe('T-ACTUAL');
    expect(panel.purezaPromedio).toBeGreaterThan(0);
    expect(panel.sospechososTurno).toEqual([]);
  });
});
