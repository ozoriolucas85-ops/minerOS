import { describe, it, expect } from 'vitest';
import {
  acotar,
  redondear,
  esNumero,
  exigirPositivo,
  exigirNoNegativo,
  indexarPorId,
  ErrorDeValidacion,
} from '../src/domain/utilidades.js';

describe('acotar', () => {
  it('deja el valor si está dentro del rango', () => {
    expect(acotar(50, 0, 100)).toBe(50);
  });
  it('acota por abajo y por arriba', () => {
    expect(acotar(-5, 0, 100)).toBe(0);
    expect(acotar(130, 0, 100)).toBe(100);
  });
});

describe('redondear', () => {
  it('redondea a los decimales pedidos', () => {
    expect(redondear(38.4615, 1)).toBe(38.5);
    expect(redondear(5.5555, 2)).toBe(5.56);
    expect(redondear(0.1 + 0.2)).toBe(0.3);
  });
});

describe('validaciones', () => {
  it('esNumero', () => {
    expect(esNumero(1)).toBe(true);
    expect(esNumero(NaN)).toBe(false);
    expect(esNumero('1')).toBe(false);
    expect(esNumero(Infinity)).toBe(false);
  });
  it('exigirPositivo', () => {
    expect(exigirPositivo(2, 'X')).toBe(2);
    expect(() => exigirPositivo(0, 'El peso')).toThrow('El peso tiene que ser un número mayor que 0.');
    expect(() => exigirPositivo(undefined, 'X')).toThrow(ErrorDeValidacion);
  });
  it('exigirNoNegativo', () => {
    expect(exigirNoNegativo(0, 'X')).toBe(0);
    expect(() => exigirNoNegativo(-1, 'X')).toThrow(ErrorDeValidacion);
  });
  it('ErrorDeValidacion tiene nombre propio', () => {
    expect(new ErrorDeValidacion('x').name).toBe('ErrorDeValidacion');
  });
});

describe('indexarPorId', () => {
  it('arma un Map por id', () => {
    const m = indexarPorId([{ id: 'a', v: 1 }]);
    expect(m.get('a').v).toBe(1);
  });
});
