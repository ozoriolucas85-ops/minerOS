// Validación de permisos en los servicios (además de ocultar en la UI).

import { estado } from '../state.js';
import { exigirPermiso, puede } from '../domain/permisos.js';

function contexto(extra) {
  return { cuadrillas: estado.listar('cuadrillas'), usuarios: estado.listar('usuarios'), ...extra };
}

/** Lanza ErrorDeValidacion si el usuario no puede hacer la acción. */
export function exigir(usuarioId, accion, extra = {}) {
  return exigirPermiso(usuarioId ? estado.obtener('usuarios', usuarioId) : null, accion, contexto(extra));
}

/** ¿Puede? (para mostrar u ocultar en la UI). */
export function permite(usuarioId, accion, extra = {}) {
  return puede(usuarioId ? estado.obtener('usuarios', usuarioId) : null, accion, contexto(extra));
}
