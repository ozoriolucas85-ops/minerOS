import { describe, it, expect } from 'vitest';
import {
  generarCodigoCarga,
  siguienteCodigo,
  calcularPerdida,
  esSospechoso,
  calcularTramos,
  resumenCarga,
  validarPesaje,
  validarNuevaCarga,
  filtrarTraslados,
} from '../src/domain/traslados.js';
import { ErrorDeValidacion, indexarPorId } from '../src/domain/utilidades.js';
import { CONFIG_POR_DEFECTO as config, crearSeed } from '../src/data/seed.js';

const nodosPorId = indexarPorId(crearSeed({ ahora: 0 }).nodos);

const carga = (pesos, extra = {}) => {
  const puntos = ['G3-F', 'C2', 'BOCA', 'ACOPIO'];
  return {
    id: 'c1',
    codigo: 'CAN-0001',
    cuadrillaId: 'CU-ESTE',
    pesajes: pesos.map((peso, i) => ({ nodoId: puntos[i], peso, timestamp: 1000 + i * 100 })),
    ...extra,
  };
};

describe('códigos de carga', () => {
  it('formato CAN-0042', () => {
    expect(generarCodigoCarga(42)).toBe('CAN-0042');
    expect(generarCodigoCarga(12345)).toBe('CAN-12345');
  });
  it('siguiente código libre', () => {
    expect(siguienteCodigo([])).toBe('CAN-0001');
    expect(siguienteCodigo([{ codigo: 'CAN-0007' }, { codigo: 'CAN-0003' }, { codigo: 'otro' }])).toBe('CAN-0008');
  });
});

describe('calcularPerdida', () => {
  it('pesajes 900 → 850 → 5,6 % de pérdida, sospechoso', () => {
    const r = calcularPerdida(900, 850);
    expect(r.perdida).toBe(50);
    expect(r.porcentaje).toBeCloseTo(5.56, 2);
    expect(esSospechoso(r.porcentaje, config.toleranciaPerdida)).toBe(true);
  });
  it('sin pérdida y con ganancia', () => {
    expect(calcularPerdida(900, 900).porcentaje).toBe(0);
    expect(calcularPerdida(900, 909).porcentaje).toBe(-1);
  });
  it('peso actual 0 = pérdida total', () => {
    expect(calcularPerdida(900, 0).porcentaje).toBe(100);
  });
  it('valida los pesos (peso anterior 0, negativos)', () => {
    expect(() => calcularPerdida(0, 10)).toThrow(ErrorDeValidacion);
    expect(() => calcularPerdida(900, -1)).toThrow(ErrorDeValidacion);
    expect(() => calcularPerdida(900, NaN)).toThrow(ErrorDeValidacion);
  });
});

describe('esSospechoso', () => {
  it('estrictamente mayor que la tolerancia', () => {
    expect(esSospechoso(3, 3)).toBe(false);
    expect(esSospechoso(3.01, 3)).toBe(true);
  });
});

describe('calcularTramos', () => {
  it('un tramo por cada par de pesajes, ordenado por hora', () => {
    const c = carga([900, 890, 840, 838]);
    c.pesajes.reverse();
    const tramos = calcularTramos(c.pesajes, config);
    expect(tramos).toHaveLength(3);
    expect(tramos[0]).toMatchObject({ desde: 'G3-F', hasta: 'C2', perdida: 10, sospechoso: false });
    expect(tramos[1]).toMatchObject({ desde: 'C2', hasta: 'BOCA', perdida: 50, sospechoso: true, horaHasta: 1200 });
    expect(tramos[2].sospechoso).toBe(false);
  });
  it('sin pesajes o con uno solo no hay tramos', () => {
    expect(calcularTramos([], config)).toEqual([]);
    expect(calcularTramos(carga([900]).pesajes, config)).toEqual([]);
  });
  it('respeta la tolerancia configurada', () => {
    const tramos = calcularTramos(carga([900, 850]).pesajes, { ...config, toleranciaPerdida: 10 });
    expect(tramos[0].sospechoso).toBe(false);
  });
});

describe('resumenCarga', () => {
  it('pérdida total, tramos sospechosos y si llegó al acopio', () => {
    const r = resumenCarga(carga([900, 890, 840, 838]), config, nodosPorId);
    expect(r.pesoInicial).toBe(900);
    expect(r.pesoFinal).toBe(838);
    expect(r.perdidaTotal).toBe(62);
    expect(r.sospechosa).toBe(true);
    expect(r.tramosSospechosos).toHaveLength(1);
    expect(r.completa).toBe(true);
  });
  it('carga sin pesajes', () => {
    const r = resumenCarga({ pesajes: [] }, config, nodosPorId);
    expect(r).toMatchObject({ pesoInicial: null, perdidaTotal: 0, porcentajeTotal: 0, sospechosa: false, completa: false });
  });
  it('carga en camino no está completa', () => {
    expect(resumenCarga(carga([900, 899]), config, nodosPorId).completa).toBe(false);
  });
});

describe('validarPesaje', () => {
  it('acepta el orden frente → cruce → boca → acopio', () => {
    expect(validarPesaje({ pesajes: [] }, { nodoId: 'G3-F', peso: 900 }, nodosPorId)).toBe(true);
    expect(validarPesaje(carga([900]), { nodoId: 'C2', peso: 890 }, nodosPorId)).toBe(true);
    expect(validarPesaje(carga([900, 890]), { nodoId: 'C1', peso: 885 }, nodosPorId)).toBe(true); // otro cruce
    expect(validarPesaje(carga([900, 890]), { nodoId: 'BOCA', peso: 885 }, nodosPorId)).toBe(true);
  });
  it('el primer pesaje es en el frente', () => {
    expect(() => validarPesaje({ pesajes: [] }, { nodoId: 'BOCA', peso: 900 }, nodosPorId)).toThrow(/frente/);
  });
  it('rechaza peso 0 o negativo', () => {
    expect(() => validarPesaje({ pesajes: [] }, { nodoId: 'G3-F', peso: 0 }, nodosPorId)).toThrow(/mayor que 0/);
    expect(() => validarPesaje({ pesajes: [] }, { nodoId: 'G3-F', peso: -3 }, nodosPorId)).toThrow(ErrorDeValidacion);
  });
  it('rechaza puntos inexistentes, sin pesaje, repetidos o fuera de orden', () => {
    expect(() => validarPesaje({ pesajes: [] }, { nodoId: 'X', peso: 1 }, nodosPorId)).toThrow(/no existe/);
    expect(() => validarPesaje({ pesajes: [] }, { nodoId: 'R1', peso: 1 }, nodosPorId)).toThrow(/no se pesan/);
    expect(() => validarPesaje(carga([900, 890]), { nodoId: 'C2', peso: 1 }, nodosPorId)).toThrow(/ya se pesó/);
    expect(() => validarPesaje(carga([900, 890, 880]), { nodoId: 'C1', peso: 1 }, nodosPorId)).toThrow(/Orden/);
    expect(() => validarPesaje(carga([900]), { nodoId: 'G1-F', peso: 1 }, nodosPorId)).toThrow(/Orden/);
    expect(() => validarPesaje(carga([900, 890, 880, 870]), { nodoId: 'C1', peso: 1 }, nodosPorId)).toThrow(/acopio/);
  });
});

describe('validarNuevaCarga', () => {
  const ok = { cuadrillaId: 'CU-ESTE', galeriaId: 'G3', mineral: 'hierro', volumen: 0.25 };
  it('acepta datos completos', () => {
    expect(validarNuevaCarga(ok)).toBe(true);
  });
  it('exige cada campo y volumen > 0', () => {
    expect(() => validarNuevaCarga({ ...ok, cuadrillaId: '' })).toThrow(/cuadrilla/);
    expect(() => validarNuevaCarga({ ...ok, galeriaId: '' })).toThrow(/galería/);
    expect(() => validarNuevaCarga({ ...ok, mineral: '' })).toThrow(/mineral/);
    expect(() => validarNuevaCarga({ ...ok, volumen: 0 })).toThrow(/volumen/);
  });
});

describe('filtrarTraslados', () => {
  const cargas = [
    carga([900, 850], { id: 'a', cuadrillaId: 'CU-ESTE' }),
    carga([900, 899], { id: 'b', cuadrillaId: 'CU-NORTE' }),
    { id: 'c', cuadrillaId: 'CU-NORTE', creada: 5000, pesajes: [] },
  ];
  it('sin filtros devuelve todo', () => {
    expect(filtrarTraslados(cargas, {}, config)).toHaveLength(3);
    expect(filtrarTraslados(cargas, undefined, config)).toHaveLength(3);
  });
  it('por cuadrilla, solo sospechosos y por fecha', () => {
    expect(filtrarTraslados(cargas, { cuadrillaId: 'CU-NORTE' }, config).map((c) => c.id)).toEqual(['b', 'c']);
    expect(filtrarTraslados(cargas, { soloSospechosos: true }, config).map((c) => c.id)).toEqual(['a']);
    expect(filtrarTraslados(cargas, { desde: 2000 }, config).map((c) => c.id)).toEqual(['c']);
    expect(filtrarTraslados(cargas, { hasta: 2000 }, config).map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('recorrido sugerido de una carga', () => {
  it('frente → cruces del camino → boca → acopio', async () => {
    const { recorridoDeCarga, proximoPunto } = await import('../src/domain/traslados.js');
    const { crearGrafo } = await import('../src/domain/rutas.js');
    const seed2 = crearSeed({ ahora: 0 });
    const grafo = crearGrafo(seed2.nodos, seed2.aristas);
    const recorrido = recorridoDeCarga(grafo, nodosPorId, 'G3-F');
    expect(recorrido).toEqual(['G3-F', 'G3-P', 'C2', 'C1', 'BOCA', 'ACOPIO']);
    expect(proximoPunto(recorrido, [])).toBe('G3-F');
    expect(proximoPunto(recorrido, [{ nodoId: 'G3-F' }, { nodoId: 'C2' }])).toBe('C1');
    expect(proximoPunto(recorrido, recorrido.map((nodoId) => ({ nodoId })))).toBeNull();
    expect(recorridoDeCarga(grafo, nodosPorId, 'NADA')).toEqual([]);
    expect(recorridoDeCarga(grafo, new Map([...nodosPorId].filter(([, n]) => n.tipo !== 'acopio')), 'G1-F')).toEqual(['G1-F', 'G1-P', 'C1', 'BOCA']);
  });
});
