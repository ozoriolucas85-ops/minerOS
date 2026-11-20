// Servicio de escaneos de balizas: valida (galería bloqueada → rechazo) y registra.

import { estado } from '../state.js';
import { generarId } from '../storage/index.js';
import { usuarioActualId } from '../sesion.js';
import { validarEscaneo, estadoDePersona, escaneosDe } from '../domain/ubicacion.js';
import { ErrorDeValidacion } from '../domain/utilidades.js';
import { nodosPorId, galeriasPorId } from './ubicacion.js';
import { ahora as relojAhora } from '../reloj.js';
import { exigir } from './permisos.js';

/**
 * Registra que una persona escaneó una baliza.
 * Si la baliza pertenece a una galería bloqueada, el escaneo se rechaza y queda
 * un evento "escaneo-rechazado".
 * @returns {Promise<{ escaneo: object, nodo: object, adentro: boolean }>}
 */
export async function registrarEscaneo({ nodoId, usuarioId = usuarioActualId(), operadorId = usuarioActualId(), ahora = relojAhora(), simulado = false }) {
  const usuario = estado.obtener('usuarios', usuarioId);
  if (!usuario) throw new ErrorDeValidacion('Elegí quién está escaneando.');
  // Quien registra (operador) puede ser la misma persona o alguien con permiso sobre ella.
  exigir(operadorId, 'escaneo:registrar', { objetivoId: usuarioId });
  const nodos = nodosPorId();
  // Galería donde está ahora la persona (si está adentro): puede escanear para salir de ella.
  const actual = estadoDePersona(escaneosDe(estado.listar('escaneos'), usuarioId), nodos);
  const galeriaActualId = actual.adentro ? (nodos.get(actual.ultimo?.nodoId)?.galeriaId ?? null) : null;
  let nodo;
  try {
    nodo = validarEscaneo({ nodoId, nodosPorId: nodos, galeriasPorId: galeriasPorId(), galeriaActualId });
  } catch (error) {
    const galeriaId = nodos.get(nodoId)?.galeriaId ?? null;
    if (galeriaId) {
      await estado.guardar('eventos', {
        id: generarId('ev'),
        tipo: 'escaneo-rechazado',
        galeriaId,
        detalle: `${usuario.nombre} intentó entrar en ${nodos.get(nodoId).nombre}: acceso rechazado (galería bloqueada).`,
        usuarioId,
        timestamp: ahora,
        simulado,
      });
    }
    throw error;
  }
  const escaneo = { id: generarId('esc'), usuarioId, nodoId, timestamp: ahora, simulado };
  await estado.guardar('escaneos', escaneo);
  const { adentro } = estadoDePersona(escaneosDe(estado.listar('escaneos'), usuarioId), nodos);
  return { escaneo, nodo, adentro };
}
