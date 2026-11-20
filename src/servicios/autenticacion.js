// Ingreso con usuario + PIN. Los PIN se guardan solo como hash con sal.

import { estado } from '../state.js';
import { pinCorrecto, hashPin } from '../domain/seguridad.js';
import { ErrorDeValidacion } from '../domain/utilidades.js';
import { cambiarUsuario, usuarioActualId } from '../sesion.js';

/**
 * Devuelve el usuario si el PIN es correcto, o null.
 * @param {string} usuarioId
 * @param {string} pin
 */
export async function verificarPin(usuarioId, pin) {
  if (!usuarioId || !pin) return null;
  const usuario = estado.obtener('usuarios', usuarioId);
  return pinCorrecto(usuario, pin) ? usuario : null;
}

/** Ingresa como el usuario si el PIN es correcto. */
export async function ingresar(usuarioId, pin) {
  if (!usuarioId) throw new ErrorDeValidacion('Elegí tu usuario.');
  if (!String(pin ?? '').trim()) throw new ErrorDeValidacion('Ingresá tu PIN.');
  const usuario = await verificarPin(usuarioId, pin);
  if (!usuario) throw new ErrorDeValidacion('El PIN no es correcto.');
  cambiarUsuario(usuario.id);
  return usuario;
}

export function cerrarSesion() {
  cambiarUsuario(null);
}

/** Usuario de la sesión (o null). */
export function usuarioActual() {
  const id = usuarioActualId();
  return id ? estado.obtener('usuarios', id) : null;
}

/**
 * Migra datos guardados con versiones anteriores: si algún usuario tiene el PIN
 * en texto plano, lo reemplaza por su hash con sal.
 * @returns {Promise<number>} cuántos usuarios se migraron
 */
export async function migrarPins() {
  const viejos = estado.listar('usuarios', (u) => u.pin != null);
  if (!viejos.length) return 0;
  await estado.guardarVarios(
    'usuarios',
    viejos.map(({ pin, ...u }) => {
      const sal = u.sal ?? `canario:${u.id}`;
      return { ...u, sal, pinHash: hashPin(pin, sal) };
    }),
  );
  return viejos.length;
}
