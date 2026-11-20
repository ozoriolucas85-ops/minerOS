// Insignia de estado del semáforo: SIEMPRE color + ícono + texto.

import { ESTADOS } from '../../domain/semaforo.js';
import { icono } from './iconos.js';

export function insigniaEstado(estado, { texto } = {}) {
  return `<span class="estado estado--${estado}">${icono(`estado-${estado}`)} ${texto ?? ESTADOS[estado].mensaje}</span>`;
}
