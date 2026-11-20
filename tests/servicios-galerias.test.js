import { describe, it, expect, beforeEach } from 'vitest';
import { estado } from '../src/state.js';
import { crearAlmacenLocal } from '../src/storage/local.js';
import {
  registrarAvance,
  registrarApuntalamiento,
  registrarFisuras,
  desbloquearGaleria,
  historialGaleria,
} from '../src/servicios/galerias.js';
import { verificarPin } from '../src/servicios/autenticacion.js';
import { turnoActual } from '../src/servicios/turnos.js';
import { crearAlmacenFalso } from './ayudas.js';
import { cambiarUsuario } from '../src/sesion.js';

beforeEach(async () => {
  cambiarUsuario('U-ING');
  await estado.iniciar(crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null }));
});

const llaves = { ingenieroId: 'U-ING', pinIngeniero: '1111', capatazId: 'U-CAP2', pinCapataz: '3333' };

describe('servicio de galerías', () => {
  it('registrar avance guarda galería, avance y evento de cambio de estado', async () => {
    // G3 (media, 1,5 m) + 1 m = 2,5 m → amarillo
    const r = await registrarAvance('G3', { metros: 1, ahora: 1000 });
    expect(r.estadoNuevo).toBe('amarillo');
    expect(estado.obtener('galerias', 'G3').metrosSinApuntalar).toBe(2.5);
    expect(estado.listar('avances')).toHaveLength(1);
    const eventos = estado.listar('eventos');
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ tipo: 'cambio-estado', estadoAnterior: 'verde', estadoNuevo: 'amarillo' });
  });

  it('al llegar a rojo bloquea y registra el evento de bloqueo; luego no deja cargar', async () => {
    await registrarAvance('G3', { metros: 2.5, ahora: 1000 });
    expect(estado.obtener('galerias', 'G3').bloqueada).toBe(true);
    expect(estado.listar('eventos').map((e) => e.tipo).sort()).toEqual(['bloqueo', 'cambio-estado']);
    await expect(registrarAvance('G3', { metros: 0.1 })).rejects.toThrow(/bloqueada/);
  });

  it('valida la galería y los metros', async () => {
    await expect(registrarAvance('NO', { metros: 1 })).rejects.toThrow(/no existe/);
    await expect(registrarAvance('G3', { metros: 0 })).rejects.toThrow(/mayor que 0/);
  });

  it('fisuras y apuntalamiento generan eventos y el apuntalamiento recupera la estabilidad', async () => {
    await registrarFisuras('G3', { ahora: 10 });
    expect(estado.obtener('galerias', 'G3').hayFisuras).toBe(true);
    await registrarApuntalamiento('G3', { ahora: 20 });
    const g = estado.obtener('galerias', 'G3');
    expect(g.metrosSinApuntalar).toBe(0);
    expect(g.hayFisuras).toBe(false);
    const tipos = estado.listar('eventos').map((e) => e.tipo);
    expect(tipos).toContain('fisuras');
    expect(tipos).toContain('apuntalamiento');
  });

  it('desbloqueo de dos llaves: exige apuntalamiento y PIN correctos', async () => {
    await registrarAvance('G3', { metros: 3, ahora: 1000 });

    let r = await desbloquearGaleria('G3', { ...llaves, ahora: 2000 });
    expect(r.valido).toBe(false);
    expect(r.errores).toContain('Falta registrar un apuntalamiento después del bloqueo.');

    await registrarApuntalamiento('G3', { ahora: 1500 });
    r = await desbloquearGaleria('G3', { ...llaves, pinCapataz: '0000', ahora: 2000 });
    expect(r).toEqual({ valido: false, errores: ['El PIN del capataz no es correcto.'] });

    r = await desbloquearGaleria('G3', { ...llaves, ingenieroId: '', ahora: 2000 });
    expect(r.errores).toEqual(['Falta la llave de un ingeniero.']);

    r = await desbloquearGaleria('G3', { ...llaves, ahora: 2000 });
    expect(r.valido).toBe(true);
    expect(estado.obtener('galerias', 'G3').bloqueada).toBe(false);
    expect(estado.listar('desbloqueos')[0]).toMatchObject({ galeriaId: 'G3', ingenieroId: 'U-ING', capatazId: 'U-CAP2', timestamp: 2000 });
    expect(estado.listar('eventos').some((e) => e.tipo === 'desbloqueo')).toBe(true);
  });

  it('historial: eventos y avances del más nuevo al más viejo', async () => {
    await registrarAvance('G3', { metros: 0.2, ahora: 100 });
    await registrarAvance('G3', { metros: 1, ahora: 200 });
    const h = historialGaleria('G3');
    expect(h.map((x) => x.timestamp)).toEqual([200, 200, 100]);
    expect(historialGaleria('G1')).toEqual([]);
  });
});

describe('autenticación y turnos', () => {
  it('verificarPin', async () => {
    expect((await verificarPin('U-ING', '1111')).id).toBe('U-ING');
    expect(await verificarPin('U-ING', '9999')).toBeNull();
    expect(await verificarPin('NADIE', '1111')).toBeNull();
    expect(await verificarPin('', '')).toBeNull();
  });

  it('turnoActual devuelve el turno en curso o el más reciente', () => {
    const t = estado.obtener('turnos', 'T-ACTUAL');
    expect(turnoActual(t.inicio + 1).id).toBe('T-ACTUAL');
    expect(turnoActual(t.inicio - 60 * 60 * 1000).id).toBe('T-H1');
    expect(turnoActual(t.fin + 999999999).id).toBe('T-ACTUAL');
  });
});
