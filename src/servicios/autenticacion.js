// Verificación de PIN. En la fase 10 los PIN pasan a guardarse con hash;
// esta función es el único lugar que los compara.

import { estado } from '../state.js';

/**
 * Devuelve el usuario si el PIN es correcto, o null.
 * @param {string} usuarioId
 * @param {string} pin
 */
export async function verificarPin(usuarioId, pin) {
  if (!usuarioId || !pin) return null;
  const usuario = estado.obtener('usuarios', usuarioId);
  if (!usuario) return null;
  return String(usuario.pin) === String(pin).trim() ? usuario : null;
}
