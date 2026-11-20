// Turnos: cuál es el turno en curso.

import { estado } from '../state.js';
import { generarId } from '../storage/index.js';
import { reiniciarTurno } from '../domain/semaforo.js';
import { ahora as relojAhora } from '../reloj.js';

/** Turno que contiene el momento dado (el que empezó último, si se superponen); si ninguno, el más reciente. */
export function turnoActual(ahora = relojAhora()) {
  const turnos = estado.listar('turnos').sort((a, b) => a.inicio - b.inicio);
  return turnos.filter((t) => ahora >= t.inicio && ahora < t.fin).at(-1) ?? turnos.at(-1) ?? null;
}

const DURACION_TURNO = 8 * 60 * 60 * 1000;
const TIPO_POR_HORA = (h) => (h >= 6 && h < 14 ? 'mañana' : h >= 14 && h < 22 ? 'tarde' : 'noche');

/**
 * Empieza un turno nuevo: lo registra y pone en 0 el avance del turno de
 * todas las galerías (la velocidad máxima es por turno).
 */
export async function iniciarTurno({ inicio = relojAhora(), simulado = false } = {}) {
  const fecha = new Date(inicio);
  const turno = {
    id: generarId('turno'),
    fecha: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`,
    tipo: TIPO_POR_HORA(fecha.getHours()),
    inicio,
    fin: inicio + DURACION_TURNO,
    simulado,
  };
  await estado.guardar('turnos', turno);
  await estado.guardarVarios('galerias', estado.listar('galerias').map(reiniciarTurno));
  return turno;
}
