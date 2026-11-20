import { describe, it, expect } from 'vitest';
import { interpretarHash } from '../src/router.js';

describe('interpretarHash', () => {
  it('separa ruta y parámetros', () => {
    expect(interpretarHash('#/galerias/G3')).toEqual({ ruta: 'galerias', params: ['G3'] });
  });
  it('devuelve ruta vacía sin hash', () => {
    expect(interpretarHash('')).toEqual({ ruta: '', params: [] });
    expect(interpretarHash('#/')).toEqual({ ruta: '', params: [] });
  });
  it('ignora la query y decodifica', () => {
    expect(interpretarHash('#/mapa/Galer%C3%ADa?x=1')).toEqual({ ruta: 'mapa', params: ['Galería'] });
  });
});
