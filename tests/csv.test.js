import { describe, it, expect } from 'vitest';
import { aCsv } from '../src/ui/csv.js';

describe('aCsv', () => {
  it('usa ; como separador, coma decimal y BOM', () => {
    const csv = aCsv([{ titulo: 'Nombre', valor: (f) => f.n }, { titulo: 't/h', valor: (f) => f.v }], [{ n: 'Ana', v: 1.234 }, { n: 'Lu"z;', v: null }]);
    expect(csv).toBe('﻿Nombre;t/h\r\nAna;1,23\r\n"Lu""z;";\r\n');
  });
});
