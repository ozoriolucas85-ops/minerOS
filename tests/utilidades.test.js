import { describe, it, expect } from 'vitest';
import { acotar } from '../src/domain/utilidades.js';

describe('acotar', () => {
  it('deja el valor si está dentro del rango', () => {
    expect(acotar(50, 0, 100)).toBe(50);
  });
  it('acota por abajo y por arriba', () => {
    expect(acotar(-5, 0, 100)).toBe(0);
    expect(acotar(130, 0, 100)).toBe(100);
  });
});
