import { describe, it, expect, beforeEach } from 'vitest';
import { estado } from '../src/state.js';
import { crearAlmacenLocal } from '../src/storage/local.js';
import { cambiarUsuario, usuarioActualId } from '../src/sesion.js';
import { ingresar, cerrarSesion, usuarioActual, migrarPins, verificarPin } from '../src/servicios/autenticacion.js';
import { actualizarConfig, actualizarLimitesGaleria } from '../src/servicios/configuracion.js';
import { registrarAvance, desbloquearGaleria } from '../src/servicios/galerias.js';
import { crearCarga } from '../src/servicios/cargas.js';
import { registrarEscaneo } from '../src/servicios/escaneos.js';
import { permite } from '../src/servicios/permisos.js';
import { crearAlmacenFalso } from './ayudas.js';

beforeEach(async () => {
  cambiarUsuario(null);
  await estado.iniciar(crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null }));
});

describe('ingreso', () => {
  it('ingresa con usuario + PIN y cierra sesión', async () => {
    await expect(ingresar('', '1111')).rejects.toThrow(/usuario/);
    await expect(ingresar('U-ING', '')).rejects.toThrow(/PIN/);
    await expect(ingresar('U-ING', '9999')).rejects.toThrow(/no es correcto/);
    const u = await ingresar('U-ING', '1111');
    expect(u.rol).toBe('ingeniero');
    expect(usuarioActual().id).toBe('U-ING');
    cerrarSesion();
    expect(usuarioActualId()).toBeNull();
    expect(usuarioActual()).toBeNull();
    expect(await verificarPin('U-T01', '1001')).not.toBeNull();
  });

  it('migra PINs guardados en texto plano a hash', async () => {
    const viejo = { id: 'U-VIEJO', nombre: 'Viejo', rol: 'trabajador', pin: '5555' };
    await estado.guardar('usuarios', viejo);
    expect(await migrarPins()).toBe(1);
    const migrado = estado.obtener('usuarios', 'U-VIEJO');
    expect(migrado).not.toHaveProperty('pin');
    expect(await verificarPin('U-VIEJO', '5555')).not.toBeNull();
    expect(await migrarPins()).toBe(0);
  });
});

describe('permisos en los servicios', () => {
  it('un capataz no puede cambiar límites de seguridad ni la config; el ingeniero sí', async () => {
    cambiarUsuario('U-CAP2');
    await expect(actualizarLimitesGaleria('G3', { metrosMax: 10, velocidadMax: 5 })).rejects.toThrow(/límites de seguridad/);
    await expect(actualizarConfig({ toleranciaPerdida: 50 })).rejects.toThrow(/configuración/);
    expect(estado.obtener('galerias', 'G3').metrosMax).toBe(4);
    cambiarUsuario('U-ING');
    const ev = await actualizarLimitesGaleria('G3', { metrosMax: 3, velocidadMax: 2 });
    expect(ev.estabilidad).toBe(50); // 1,5 de 3 m
    await actualizarConfig({ toleranciaPerdida: 4, umbrales: { verde: 45 } });
    expect(estado.config().toleranciaPerdida).toBe(4);
    expect(estado.config().umbrales).toEqual({ verde: 45, rojo: 15 });
  });

  it('la config valida los valores', async () => {
    cambiarUsuario('U-ING');
    await expect(actualizarConfig({ toleranciaPerdida: 0 })).rejects.toThrow(/tolerancia/);
    await expect(actualizarConfig({ umbrales: { rojo: 50, verde: 40 } })).rejects.toThrow(/umbrales/);
    await expect(actualizarConfig({ densidades: { hierro: -1 } })).rejects.toThrow(/hierro/);
    await expect(actualizarConfig({ limitesPorRoca: { dura: { metrosMax: 0, velocidadMax: 1 } } })).rejects.toThrow(/metros/);
    await expect(actualizarLimitesGaleria('NADA', { metrosMax: 1, velocidadMax: 1 })).rejects.toThrow(/no existe/);
  });

  it('el capataz carga avances y cargas solo de su cuadrilla', async () => {
    cambiarUsuario('U-CAP2'); // Cuadrilla Este: G3, G4
    await expect(registrarAvance('G1', { metros: 0.1 })).rejects.toThrow(/no permite registrar avances/);
    await registrarAvance('G3', { metros: 0.1 });
    await expect(crearCarga({ cuadrillaId: 'CU-NORTE', galeriaId: 'G1', mineral: 'hierro', volumen: 0.25 })).rejects.toThrow(/cargas/);
    expect((await crearCarga({ cuadrillaId: 'CU-ESTE', galeriaId: 'G3', mineral: 'hierro', volumen: 0.25 })).cuadrillaId).toBe('CU-ESTE');
  });

  it('sin sesión no se puede operar y un trabajador solo escanea por sí mismo', async () => {
    await expect(registrarAvance('G3', { metros: 0.1 })).rejects.toThrow(/Ingresá/);
    cambiarUsuario('U-T05');
    await expect(registrarAvance('G3', { metros: 0.1 })).rejects.toThrow(/Trabajador/);
    await registrarEscaneo({ nodoId: 'BOCA' });
    await expect(registrarEscaneo({ nodoId: 'BOCA', usuarioId: 'U-T06' })).rejects.toThrow(/no permite/);
  });

  it('el desbloqueo lo inicia un ingeniero o un capataz', async () => {
    cambiarUsuario('U-T05');
    await expect(desbloquearGaleria('G3', {})).rejects.toThrow(/ingeniero o un capataz/);
  });

  it('permite() para la UI', () => {
    expect(permite('U-ING', 'ver:simulador')).toBe(true);
    expect(permite('U-CAP1', 'galeria:avance', { galeriaId: 'G1' })).toBe(true);
    expect(permite(null, 'ver:panel')).toBe(false);
  });
});
