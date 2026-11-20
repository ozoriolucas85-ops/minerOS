import { describe, it, expect } from 'vitest';
import {
  calcularDensidad,
  purezaPorDensidad,
  purezaManual,
  mineralUtil,
  clasificarPureza,
  sugerirModo,
  nombreMineral,
  MINERALES,
} from '../src/domain/pureza.js';
import { ErrorDeValidacion } from '../src/domain/utilidades.js';
import { CONFIG_POR_DEFECTO as config } from '../src/data/seed.js';

describe('densidad', () => {
  it('hierro, 900 kg en 0,25 m³ → 3,6 g/cm³', () => {
    expect(calcularDensidad(900, 0.25)).toBeCloseTo(3.6, 10);
  });
  it('rechaza peso 0 y volumen 0', () => {
    expect(() => calcularDensidad(0, 0.25)).toThrow(ErrorDeValidacion);
    expect(() => calcularDensidad(900, 0)).toThrow(/volumen/);
    expect(() => calcularDensidad(-5, 0.25)).toThrow(/peso/);
  });
});

describe('purezaPorDensidad', () => {
  it('hierro, 900 kg en 0,25 m³ → pureza ≈ 38,5 %', () => {
    const r = purezaPorDensidad({ peso: 900, volumen: 0.25, mineral: 'hierro' }, config);
    expect(r.densidad).toBeCloseTo(3.6, 10);
    expect(r.pureza).toBeCloseTo(38.46, 2);
    expect(r.mineralUtil).toBeCloseTo(346.15, 2);
    expect(r.modo).toBe('densidad');
  });

  it('acota a 0 si la densidad es menor que la del estéril (pureza negativa)', () => {
    const r = purezaPorDensidad({ peso: 500, volumen: 0.25, mineral: 'hierro' }, config); // 2,0 g/cm³
    expect(r.pureza).toBe(0);
    expect(r.mineralUtil).toBe(0);
  });

  it('acota a 100 si la densidad supera la del mineral puro', () => {
    const r = purezaPorDensidad({ peso: 1500, volumen: 0.25, mineral: 'cobre' }, config); // 6,0 g/cm³
    expect(r.pureza).toBe(100);
  });

  it('cobre: densidad exacta del mineral → 100 %', () => {
    expect(purezaPorDensidad({ peso: 1050, volumen: 0.25, mineral: 'cobre' }, config).pureza).toBeCloseTo(100, 8);
  });

  it('valida peso, volumen y mineral', () => {
    expect(() => purezaPorDensidad({ peso: 0, volumen: 0.25, mineral: 'hierro' }, config)).toThrow(ErrorDeValidacion);
    expect(() => purezaPorDensidad({ peso: 900, volumen: 0, mineral: 'hierro' }, config)).toThrow(ErrorDeValidacion);
    expect(() => purezaPorDensidad({ peso: 900, volumen: 0.25, mineral: 'oro' }, config)).toThrow(/oro/);
  });

  it('rechaza un mineral con la misma densidad que el estéril', () => {
    const igual = { ...config, densidades: { ...config.densidades, cuarzo: 2.6 } };
    expect(() => purezaPorDensidad({ peso: 900, volumen: 0.25, mineral: 'cuarzo' }, igual)).toThrow(/manual/);
  });
});

describe('purezaManual', () => {
  it('útil / muestra × 100', () => {
    expect(purezaManual({ muestra: 10, util: 8.5 }).pureza).toBeCloseTo(85, 10);
  });
  it('útil 0 da 0 % y útil = muestra da 100 %', () => {
    expect(purezaManual({ muestra: 10, util: 0 }).pureza).toBe(0);
    expect(purezaManual({ muestra: 10, util: 10 }).pureza).toBe(100);
  });
  it('valida los pesos', () => {
    expect(() => purezaManual({ muestra: 0, util: 0 })).toThrow(/muestra/);
    expect(() => purezaManual({ muestra: 10, util: -1 })).toThrow(/útil/);
    expect(() => purezaManual({ muestra: 10, util: 11 })).toThrow(/más que la muestra/);
  });
});

describe('mineralUtil', () => {
  it('peso × pureza / 100', () => {
    expect(mineralUtil(1000, 40)).toBe(400);
  });
  it('acota la pureza y valida el peso', () => {
    expect(mineralUtil(1000, 150)).toBe(1000);
    expect(mineralUtil(1000, -10)).toBe(0);
    expect(() => mineralUtil(-1, 50)).toThrow(ErrorDeValidacion);
  });
});

describe('clasificarPureza', () => {
  it('Alta > 80, Media 50–80, Baja < 50 (bordes incluidos en Media)', () => {
    expect(clasificarPureza(80.1, config)).toBe('Alta');
    expect(clasificarPureza(80, config)).toBe('Media');
    expect(clasificarPureza(50, config)).toBe('Media');
    expect(clasificarPureza(49.9, config)).toBe('Baja');
    expect(clasificarPureza(0, config)).toBe('Baja');
  });
});

describe('sugerirModo', () => {
  it('manual para caliza y cuarzo, con explicación', () => {
    expect(sugerirModo('caliza', config).modo).toBe('manual');
    const cuarzo = sugerirModo('cuarzo', config);
    expect(cuarzo.modo).toBe('manual');
    expect(cuarzo.motivo).toMatch(/casi igual/);
  });
  it('densidad para hierro y cobre', () => {
    expect(sugerirModo('hierro', config).modo).toBe('densidad');
    expect(sugerirModo('cobre', config).modo).toBe('densidad');
  });
});

describe('minerales', () => {
  it('nombre legible y clave desconocida', () => {
    expect(MINERALES).toHaveLength(4);
    expect(nombreMineral('hierro')).toBe('Hierro (hematita)');
    expect(nombreMineral('xyz')).toBe('xyz');
  });
});
