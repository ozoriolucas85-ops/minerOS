import { describe, it, expect } from 'vitest';
import {
  pesoEnAcopio,
  produccionCuadrilla,
  produccionPorTrabajador,
  horasEfectivas,
  toneladasPorHora,
  calcularProductividad,
  rankingTrabajadores,
  evolucionPorTurno,
} from '../src/domain/productividad.js';
import { indexarPorId } from '../src/domain/utilidades.js';
import { crearSeed } from '../src/data/seed.js';

const seed = crearSeed({ ahora: 0 });
const nodosPorId = indexarPorId(seed.nodos);
const H = 60 * 60 * 1000;

const cargaAcopio = (cuadrillaId, pesoFinal, turnoId = 'T1') => ({
  cuadrillaId,
  turnoId,
  pesajes: [
    { nodoId: 'G3-F', peso: pesoFinal + 20, timestamp: 0 },
    { nodoId: 'ACOPIO', peso: pesoFinal, timestamp: 10 },
  ],
});
const cargaEnCamino = (cuadrillaId) => ({ cuadrillaId, turnoId: 'T1', pesajes: [{ nodoId: 'G3-F', peso: 900, timestamp: 0 }] });

describe('producción', () => {
  it('pesoEnAcopio solo cuenta el pesaje del acopio', () => {
    expect(pesoEnAcopio(cargaAcopio('X', 800), nodosPorId)).toBe(800);
    expect(pesoEnAcopio(cargaEnCamino('X'), nodosPorId)).toBeNull();
    expect(pesoEnAcopio({}, nodosPorId)).toBeNull();
  });

  it('producción de la cuadrilla = suma al llegar al acopio', () => {
    const cargas = [cargaAcopio('CU-ESTE', 800), cargaAcopio('CU-ESTE', 700), cargaEnCamino('CU-ESTE'), cargaAcopio('CU-NORTE', 999)];
    expect(produccionCuadrilla(cargas, 'CU-ESTE', nodosPorId)).toBe(1500);
    expect(produccionCuadrilla([], 'CU-ESTE', nodosPorId)).toBe(0);
  });

  it('por trabajador = producción / cantidad (0 trabajadores → 0)', () => {
    expect(produccionPorTrabajador(1500, 5)).toBe(300);
    expect(produccionPorTrabajador(1500, 0)).toBe(0);
  });

  it('t/hora = toneladas / horas (sin horas → null)', () => {
    expect(toneladasPorHora(3000, 2)).toBe(1.5);
    expect(toneladasPorHora(3000, 0)).toBeNull();
  });
});

describe('horasEfectivas', () => {
  const e = (nodoId, horas, usuarioId = 'U1') => ({ usuarioId, nodoId, timestamp: horas * H });

  it('entre la entrada al frente y la salida', () => {
    const escaneos = [e('BOCA', 0), e('C2', 0.5), e('G3-F', 1), e('C2', 4), e('BOCA', 4.5)];
    expect(horasEfectivas(escaneos, 'U1', nodosPorId, { hasta: 10 * H })).toBe(3);
  });

  it('suma varios períodos y re-escaneos en el mismo frente no cortan', () => {
    const escaneos = [e('G3-F', 1), e('G3-F', 2), e('C2', 3), e('G4-F', 4), e('C2', 5)];
    expect(horasEfectivas(escaneos, 'U1', nodosPorId, { hasta: 10 * H })).toBe(3);
  });

  it('pasar de un frente a otro cierra el primero y abre el segundo', () => {
    const escaneos = [e('G3-F', 1), e('G4-F', 2), e('C2', 4)];
    expect(horasEfectivas(escaneos, 'U1', nodosPorId, { hasta: 10 * H })).toBe(3);
  });

  it('si sigue en el frente cuenta hasta el final del período', () => {
    expect(horasEfectivas([e('G3-F', 6)], 'U1', nodosPorId, { hasta: 8 * H })).toBe(2);
  });

  it('ignora otros usuarios y escaneos fuera del período; sin frente → 0', () => {
    const escaneos = [e('G3-F', 1, 'U2'), e('G3-F', 0), e('C2', 1), e('BOCA', 2)];
    expect(horasEfectivas(escaneos, 'U1', nodosPorId, { desde: 0.5 * H, hasta: 10 * H })).toBe(0);
    expect(horasEfectivas([], 'U1', nodosPorId, { hasta: 1 })).toBe(0);
  });
});

describe('calcularProductividad', () => {
  const cuadrillas = [
    { id: 'CU-ESTE', nombre: 'Este', trabajadorIds: ['U1', 'U2'] },
    { id: 'CU-NORTE', nombre: 'Norte', trabajadorIds: ['U3'] },
  ];
  const escaneos = [
    { usuarioId: 'U1', nodoId: 'G3-F', timestamp: 0 },
    { usuarioId: 'U1', nodoId: 'C2', timestamp: 2 * H },
    { usuarioId: 'U2', nodoId: 'G3-F', timestamp: 0 },
    { usuarioId: 'U2', nodoId: 'C2', timestamp: 4 * H },
  ];
  const cargas = [cargaAcopio('CU-ESTE', 6000), cargaAcopio('CU-ESTE', 6000)];
  const r = calcularProductividad({ cargas, cuadrillas, escaneos, nodosPorId, desde: 0, hasta: 8 * H });

  it('por cuadrilla', () => {
    const este = r.cuadrillas[0];
    expect(este.toneladas).toBe(12);
    expect(este.porTrabajador).toBe(6);
    expect(este.horasEfectivas).toBe(6);
    expect(este.toneladasPorHora).toBe(2);
    expect(r.cuadrillas[1]).toMatchObject({ toneladas: 0, toneladasPorHora: null });
  });

  it('por trabajador', () => {
    const u1 = r.trabajadores.find((t) => t.usuarioId === 'U1');
    expect(u1).toMatchObject({ toneladas: 6, horasEfectivas: 2, toneladasPorHora: 3 });
    expect(r.trabajadores).toHaveLength(3);
  });

  it('ranking por t/hora con los sin horas al final', () => {
    expect(rankingTrabajadores(r.trabajadores).map((t) => t.usuarioId)).toEqual(['U1', 'U2', 'U3']);
  });
});

describe('evolucionPorTurno', () => {
  it('toneladas por turno en orden cronológico', () => {
    const turnos = [
      { id: 'T2', fecha: '2026-11-20', tipo: 'tarde', inicio: 2 },
      { id: 'T1', fecha: '2026-11-20', tipo: 'mañana', inicio: 1 },
    ];
    const cargas = [cargaAcopio('A', 1000, 'T1'), cargaAcopio('A', 2500, 'T2'), cargaEnCamino('A')];
    expect(evolucionPorTurno(cargas, turnos, nodosPorId)).toEqual([
      { turnoId: 'T1', etiqueta: '2026-11-20 mañana', toneladas: 1 },
      { turnoId: 'T2', etiqueta: '2026-11-20 tarde', toneladas: 2.5 },
    ]);
  });
});
