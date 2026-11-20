import { describe, it, expect } from 'vitest';
import {
  ESTADOS,
  limitesParaRoca,
  calcularEstabilidad,
  estadoDeEstabilidad,
  evaluarGaleria,
  aplicarAvance,
  reportarFisuras,
  aplicarApuntalamiento,
  reiniciarTurno,
  validarDesbloqueo,
  desbloquear,
  motivoBloqueo,
} from '../src/domain/semaforo.js';
import { ErrorDeValidacion } from '../src/domain/utilidades.js';
import { CONFIG_POR_DEFECTO as config } from '../src/data/seed.js';

const galeriaMedia = (extra = {}) => ({
  id: 'G3',
  nombre: 'Galería Este',
  roca: 'media',
  metrosMax: 4,
  velocidadMax: 2,
  metrosSinApuntalar: 0,
  avanceTurno: 0,
  hayFisuras: false,
  bloqueada: false,
  ...extra,
});

const ingeniero = { id: 'U-ING', rol: 'ingeniero' };
const capataz = { id: 'U-CAP1', rol: 'capataz' };

describe('calcularEstabilidad y estado (casos de verificación)', () => {
  it('roca media, 1,5 m sin apuntalar → 62,5 verde', () => {
    const g = galeriaMedia({ metrosSinApuntalar: 1.5 });
    expect(calcularEstabilidad(g, config)).toBe(62.5);
    expect(evaluarGaleria(g, config).estado).toBe('verde');
  });

  it('roca media, 2,5 m sin apuntalar → 37,5 amarillo', () => {
    const g = galeriaMedia({ metrosSinApuntalar: 2.5 });
    expect(calcularEstabilidad(g, config)).toBe(37.5);
    expect(evaluarGaleria(g, config).estado).toBe('amarillo');
  });

  it('roca media, 4 m sin apuntalar con avance 2,5 → rojo (estabilidad 0)', () => {
    const g = galeriaMedia({ metrosSinApuntalar: 4, avanceTurno: 2.5 });
    expect(calcularEstabilidad(g, config)).toBe(0);
    expect(evaluarGaleria(g, config).estado).toBe('rojo');
  });
});

describe('calcularEstabilidad', () => {
  it('sin desgaste es 100', () => {
    expect(calcularEstabilidad(galeriaMedia(), config)).toBe(100);
  });

  it('penaliza por velocidad solo si avanceTurno supera la máxima', () => {
    expect(calcularEstabilidad(galeriaMedia({ metrosSinApuntalar: 2, avanceTurno: 2 }), config)).toBe(50);
    expect(calcularEstabilidad(galeriaMedia({ metrosSinApuntalar: 2, avanceTurno: 2.1 }), config)).toBe(37.5);
  });

  it('las fisuras suman 20 de desgaste', () => {
    expect(calcularEstabilidad(galeriaMedia({ metrosSinApuntalar: 1, hayFisuras: true }), config)).toBe(55);
  });

  it('la velocidad multiplica antes de sumar las fisuras', () => {
    const g = galeriaMedia({ metrosSinApuntalar: 2, avanceTurno: 3, hayFisuras: true });
    // 50 × 1,25 = 62,5 + 20 = 82,5 → 17,5
    expect(calcularEstabilidad(g, config)).toBe(17.5);
  });

  it('nunca baja de 0', () => {
    expect(calcularEstabilidad(galeriaMedia({ metrosSinApuntalar: 40, hayFisuras: true }), config)).toBe(0);
  });

  it('usa los valores de la config (nada escrito a mano)', () => {
    const otra = { ...config, penalizacionFisuras: 50 };
    expect(calcularEstabilidad(galeriaMedia({ hayFisuras: true }), otra)).toBe(50);
  });

  it('rechaza metrosMax inválido', () => {
    expect(() => calcularEstabilidad(galeriaMedia({ metrosMax: 0 }), config)).toThrow(ErrorDeValidacion);
  });
});

describe('estadoDeEstabilidad: umbrales exactos', () => {
  it('40 exacto es amarillo y 40,01 es verde', () => {
    expect(estadoDeEstabilidad(40, config)).toBe('amarillo');
    expect(estadoDeEstabilidad(40.01, config)).toBe('verde');
  });
  it('15 exacto es rojo y 15,01 es amarillo', () => {
    expect(estadoDeEstabilidad(15, config)).toBe('rojo');
    expect(estadoDeEstabilidad(15.01, config)).toBe('amarillo');
  });
  it('0 y 100', () => {
    expect(estadoDeEstabilidad(0, config)).toBe('rojo');
    expect(estadoDeEstabilidad(100, config)).toBe('verde');
  });
});

describe('textos de los estados', () => {
  it('son exactamente los de la especificación', () => {
    expect(ESTADOS.verde.mensaje).toBe('Puede seguir con la excavación');
    expect(ESTADOS.amarillo.mensaje).toBe('EVACUACIÓN');
    expect(ESTADOS.rojo.mensaje).toBe('PELIGRO DE DERRUMBE');
  });
  it('evaluarGaleria incluye mensaje y canario', () => {
    const r = evaluarGaleria(galeriaMedia({ metrosSinApuntalar: 4 }), config);
    expect(r).toMatchObject({ estado: 'rojo', mensaje: 'PELIGRO DE DERRUMBE', canario: 'caido', bloqueada: false });
  });
});

describe('limitesParaRoca', () => {
  it('devuelve los valores por defecto de la tabla', () => {
    expect(limitesParaRoca('dura', config)).toEqual({ metrosMax: 6, velocidadMax: 3 });
    expect(limitesParaRoca('media', config)).toEqual({ metrosMax: 4, velocidadMax: 2 });
    expect(limitesParaRoca('blanda', config)).toEqual({ metrosMax: 2, velocidadMax: 1 });
  });
  it('rechaza una roca desconocida', () => {
    expect(() => limitesParaRoca('granito', config)).toThrow(/desconocido/);
  });
});

describe('aplicarAvance', () => {
  it('suma metros sin apuntalar y avance del turno', () => {
    const r = aplicarAvance(galeriaMedia({ metrosSinApuntalar: 1 }), { metros: 0.5 }, config, 100);
    expect(r.galeria.metrosSinApuntalar).toBe(1.5);
    expect(r.galeria.avanceTurno).toBe(0.5);
    expect(r.cambioEstado).toBe(false);
  });

  it('pasa de verde a amarillo', () => {
    const r = aplicarAvance(galeriaMedia({ metrosSinApuntalar: 1.5 }), { metros: 1 }, config);
    expect(r).toMatchObject({ estadoAnterior: 'verde', estadoNuevo: 'amarillo', cambioEstado: true, seBloqueo: false });
  });

  it('al llegar a rojo bloquea automáticamente y registra cuándo', () => {
    const r = aplicarAvance(galeriaMedia({ metrosSinApuntalar: 2.5 }), { metros: 1 }, config, 1234);
    expect(r.estadoNuevo).toBe('rojo');
    expect(r.galeria.bloqueada).toBe(true);
    expect(r.galeria.bloqueadaDesde).toBe(1234);
    expect(r.seBloqueo).toBe(true);
  });

  it('marca fisuras si se reportan con el avance', () => {
    const r = aplicarAvance(galeriaMedia(), { metros: 0.2, fisuras: true }, config);
    expect(r.galeria.hayFisuras).toBe(true);
  });

  it('no deja cargar avances en una galería bloqueada', () => {
    expect(() => aplicarAvance(galeriaMedia({ bloqueada: true }), { metros: 1 }, config)).toThrow(/bloqueada/);
  });

  it('valida metros positivos', () => {
    expect(() => aplicarAvance(galeriaMedia(), { metros: 0 }, config)).toThrow(ErrorDeValidacion);
    expect(() => aplicarAvance(galeriaMedia(), { metros: -1 }, config)).toThrow(ErrorDeValidacion);
    expect(() => aplicarAvance(galeriaMedia(), { metros: NaN }, config)).toThrow(ErrorDeValidacion);
  });

  it('no modifica la galería original', () => {
    const g = galeriaMedia();
    aplicarAvance(g, { metros: 1 }, config);
    expect(g.metrosSinApuntalar).toBe(0);
  });
});

describe('reportarFisuras', () => {
  it('baja la estabilidad 20 puntos y puede cambiar el estado', () => {
    // 2 m en roca media → 50; con fisuras → 30 (amarillo)
    const r = reportarFisuras(galeriaMedia({ metrosSinApuntalar: 2 }), config);
    expect(calcularEstabilidad(r.galeria, config)).toBe(30);
    expect(r.galeria.hayFisuras).toBe(true);
    expect(r.estadoNuevo).toBe('amarillo');
  });
  it('se puede reportar en una galería bloqueada', () => {
    const r = reportarFisuras(galeriaMedia({ bloqueada: true, metrosSinApuntalar: 4 }), config);
    expect(r.galeria.hayFisuras).toBe(true);
    expect(r.seBloqueo).toBe(false);
  });
});

describe('aplicarApuntalamiento', () => {
  it('es lo único que sube la estabilidad: metros a 0 y sin fisuras', () => {
    const r = aplicarApuntalamiento(galeriaMedia({ metrosSinApuntalar: 2.5, hayFisuras: true }), config);
    expect(r.galeria.metrosSinApuntalar).toBe(0);
    expect(r.galeria.hayFisuras).toBe(false);
    expect(r.estadoNuevo).toBe('verde');
  });
  it('no desbloquea solo, pero deja registrado el apuntalamiento', () => {
    const r = aplicarApuntalamiento(galeriaMedia({ bloqueada: true, bloqueadaDesde: 10, metrosSinApuntalar: 4 }), config, 50);
    expect(r.galeria.bloqueada).toBe(true);
    expect(r.galeria.apuntaladaDesdeBloqueo).toBe(50);
  });
});

describe('reiniciarTurno', () => {
  it('pone el avance del turno en 0', () => {
    expect(reiniciarTurno(galeriaMedia({ avanceTurno: 3 })).avanceTurno).toBe(0);
  });
});

describe('desbloqueo de dos llaves', () => {
  const bloqueada = galeriaMedia({ bloqueada: true, bloqueadaDesde: 100, metrosSinApuntalar: 4 });

  it('exige apuntalamiento después del bloqueo y las dos llaves', () => {
    const r = validarDesbloqueo({ galeria: bloqueada, avances: [], ingeniero: null, capataz: null });
    expect(r.valido).toBe(false);
    expect(r.errores).toHaveLength(3);
  });

  it('un apuntalamiento anterior al bloqueo no sirve', () => {
    const avances = [{ galeriaId: 'G3', apuntalado: true, timestamp: 50 }];
    const r = validarDesbloqueo({ galeria: bloqueada, avances, ingeniero, capataz });
    expect(r.errores).toEqual(['Falta registrar un apuntalamiento después del bloqueo.']);
  });

  it('acepta con apuntalamiento (por avance o por la galería) + ingeniero + capataz', () => {
    const avances = [{ galeriaId: 'G3', apuntalado: true, timestamp: 150 }];
    expect(validarDesbloqueo({ galeria: bloqueada, avances, ingeniero, capataz }).valido).toBe(true);
    const apuntalada = aplicarApuntalamiento(bloqueada, config, 200).galeria;
    expect(validarDesbloqueo({ galeria: apuntalada, ingeniero, capataz }).valido).toBe(true);
  });

  it('el ingeniero no puede dar las dos llaves ni cambiar los roles', () => {
    const avances = [{ galeriaId: 'G3', apuntalado: true, timestamp: 150 }];
    const r1 = validarDesbloqueo({ galeria: bloqueada, avances, ingeniero, capataz: ingeniero });
    expect(r1.valido).toBe(false);
    expect(r1.errores).toContain('Las dos llaves tienen que ser de personas distintas.');
    const r2 = validarDesbloqueo({ galeria: bloqueada, avances, ingeniero: capataz, capataz });
    expect(r2.errores).toContain('Falta la llave de un ingeniero.');
  });

  it('no aplica a una galería que no está bloqueada', () => {
    expect(validarDesbloqueo({ galeria: galeriaMedia(), ingeniero, capataz }).valido).toBe(false);
  });

  it('desbloquear reabre la galería y limpia las marcas', () => {
    const g = desbloquear({ ...bloqueada, apuntaladaDesdeBloqueo: 200 });
    expect(g.bloqueada).toBe(false);
    expect(g).not.toHaveProperty('bloqueadaDesde');
    expect(g).not.toHaveProperty('apuntaladaDesdeBloqueo');
  });

  it('motivoBloqueo explica por qué no se puede cargar', () => {
    expect(motivoBloqueo(galeriaMedia())).toBeNull();
    expect(motivoBloqueo(bloqueada)).toMatch(/PELIGRO DE DERRUMBE/);
  });
});
