import { describe, it, expect } from 'vitest';
import { sha256, hashPin, pinCorrecto, pinValido } from '../src/domain/seguridad.js';
import { puede, exigirPermiso, pantallaInicial, PANTALLAS_POR_ROL } from '../src/domain/permisos.js';
import { ErrorDeValidacion } from '../src/domain/utilidades.js';
import { crearSeed } from '../src/data/seed.js';

describe('hash de PIN', () => {
  it('SHA-256 coincide con los vectores conocidos', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('a'.repeat(100))).toBe('2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e');
    expect(sha256('ñandú')).toHaveLength(64);
  });

  it('la sal cambia el hash y pinCorrecto lo verifica', () => {
    const u = { sal: 's1', pinHash: hashPin('1234', 's1') };
    expect(hashPin('1234', 's1')).not.toBe(hashPin('1234', 's2'));
    expect(pinCorrecto(u, '1234')).toBe(true);
    expect(pinCorrecto(u, ' 1234 ')).toBe(true);
    expect(pinCorrecto(u, '1235')).toBe(false);
    expect(pinCorrecto(u, '')).toBe(false);
    expect(pinCorrecto({}, '1234')).toBe(false);
    expect(pinCorrecto(null, '1234')).toBe(false);
  });

  it('valida el formato del PIN', () => {
    expect(pinValido('1234')).toBe(true);
    expect(pinValido('12345678')).toBe(true);
    expect(pinValido('123')).toBe(false);
    expect(pinValido('12a4')).toBe(false);
  });

  it('el seed no guarda ningún PIN en texto plano', () => {
    const seed = crearSeed({ ahora: 0 });
    for (const u of seed.usuarios) {
      expect(u).not.toHaveProperty('pin');
      expect(u.pinHash).toHaveLength(64);
    }
    const ing = seed.usuarios.find((u) => u.id === 'U-ING');
    expect(pinCorrecto(ing, '1111')).toBe(true);
  });
});

describe('permisos por rol', () => {
  const seed = crearSeed({ ahora: 0 });
  const ctx = { cuadrillas: seed.cuadrillas, usuarios: seed.usuarios };
  const usuario = (id) => seed.usuarios.find((u) => u.id === id);
  const ing = usuario('U-ING');
  const capEste = usuario('U-CAP2'); // Cuadrilla Este: G3 y G4
  const trabajador = usuario('U-T05');

  it('pantallas por rol y pantalla de inicio', () => {
    expect(puede(ing, 'ver:configuracion')).toBe(true);
    expect(puede(capEste, 'ver:configuracion')).toBe(false);
    expect(puede(capEste, 'ver:mapa')).toBe(true);
    expect(puede(capEste, 'ver:chapas')).toBe(true);
    expect(puede(trabajador, 'ver:mapa')).toBe(false);
    expect(PANTALLAS_POR_ROL.trabajador).toEqual(['balizas']);
    expect(pantallaInicial('trabajador')).toBe('balizas');
    expect(pantallaInicial('ingeniero')).toBe('panel');
    expect(pantallaInicial('otro')).toBe('ingreso');
    expect(puede(null, 'ver:panel')).toBe(false);
  });

  it('un capataz no puede cambiar límites de seguridad ni la configuración', () => {
    expect(puede(capEste, 'galeria:limites', ctx)).toBe(false);
    expect(puede(capEste, 'config:editar', ctx)).toBe(false);
    expect(puede(ing, 'galeria:limites', ctx)).toBe(true);
  });

  it('el capataz carga avances, apuntalamientos, fisuras y cargas solo de su cuadrilla', () => {
    expect(puede(capEste, 'galeria:avance', { ...ctx, galeriaId: 'G3' })).toBe(true);
    expect(puede(capEste, 'galeria:apuntalar', { ...ctx, galeriaId: 'G4' })).toBe(true);
    expect(puede(capEste, 'galeria:fisuras', { ...ctx, galeriaId: 'G1' })).toBe(false);
    expect(puede(capEste, 'carga:crear', { ...ctx, cuadrillaId: 'CU-ESTE' })).toBe(true);
    expect(puede(capEste, 'carga:pesar', { ...ctx, cuadrillaId: 'CU-NORTE' })).toBe(false);
  });

  it('llaves del desbloqueo: la primera es del ingeniero y la segunda del capataz', () => {
    expect(puede(ing, 'desbloqueo:llave1')).toBe(true);
    expect(puede(ing, 'desbloqueo:llave2')).toBe(false);
    expect(puede(capEste, 'desbloqueo:llave2')).toBe(true);
    expect(puede(capEste, 'desbloqueo:llave1')).toBe(false);
  });

  it('escaneos: el trabajador solo el suyo; el capataz los de su cuadrilla', () => {
    expect(puede(trabajador, 'escaneo:registrar', { objetivoId: 'U-T05' })).toBe(true);
    expect(puede(trabajador, 'escaneo:registrar', { objetivoId: 'U-T06' })).toBe(false);
    expect(puede(trabajador, 'galeria:avance', { ...ctx, galeriaId: 'G3' })).toBe(false);
    expect(puede(capEste, 'escaneo:registrar', { ...ctx, objetivoId: 'U-T06' })).toBe(true);
    expect(puede(capEste, 'escaneo:registrar', { ...ctx, objetivoId: 'U-CAP2' })).toBe(true);
    expect(puede(capEste, 'escaneo:registrar', { ...ctx, objetivoId: 'U-T01' })).toBe(false);
    expect(puede(ing, 'escaneo:registrar', { objetivoId: 'U-T01' })).toBe(true);
  });

  it('exigirPermiso explica qué falta', () => {
    expect(() => exigirPermiso(null, 'galeria:avance')).toThrow(/Ingresá/);
    expect(() => exigirPermiso(trabajador, 'galeria:avance', { ...ctx, galeriaId: 'G3' })).toThrow(ErrorDeValidacion);
    expect(() => exigirPermiso(capEste, 'galeria:limites', ctx)).toThrow(/Capataz.*límites de seguridad/);
    expect(exigirPermiso(ing, 'config:editar', ctx)).toBe(true);
    expect(puede({ rol: 'visita' }, 'galeria:avance')).toBe(false);
  });
});
