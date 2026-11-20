// Turnos: cuál es el turno en curso.

import { estado } from '../state.js';

/** Turno que contiene el momento dado; si ninguno, el más reciente. */
export function turnoActual(ahora = Date.now()) {
  const turnos = estado.listar('turnos').sort((a, b) => a.inicio - b.inicio);
  return turnos.find((t) => ahora >= t.inicio && ahora < t.fin) ?? turnos.at(-1) ?? null;
}
