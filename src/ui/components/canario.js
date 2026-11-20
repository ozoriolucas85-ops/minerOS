// El canario de cada galería, en SVG inline.
// Tres estados animados con CSS: canta (verde), agitado (amarillo), caído (rojo).

import { ESTADOS } from '../../domain/semaforo.js';

const NOTAS = `
  <g class="canario__notas" aria-hidden="true">
    <path class="canario__nota" d="M96 34v-12l8-2v12" /><circle class="canario__nota" cx="94" cy="34" r="2.6" /><circle class="canario__nota" cx="102" cy="32" r="2.6" />
    <path class="canario__nota canario__nota--2" d="M106 16v-10" /><circle class="canario__nota canario__nota--2" cx="104" cy="16" r="2.4" />
    <path class="canario__nota canario__nota--3" d="M88 14v-9" /><circle class="canario__nota canario__nota--3" cx="86" cy="14" r="2.2" />
  </g>`;

const PLUMAS_ERIZADAS = '<path class="canario__plumas" d="M68 33l-3-7M73 31l0-8M78 32l3-7M50 46l-4-6M57 44l-1-7" />';

function ave(estado) {
  const ojo =
    estado === 'rojo'
      ? '<path class="canario__ojo-x" d="M74.5 37.5l5 5M79.5 37.5l-5 5" />'
      : '<circle class="canario__ojo" cx="77" cy="40" r="2.2" />';
  const pico =
    estado === 'verde'
      ? '<path class="canario__pico canario__pico--abierto" d="M84 38l10-1-9 4 9 3-10-1z" />'
      : '<path class="canario__pico" d="M84 39l10 3-10 3z" />';
  return `
    <g class="canario__ave">
      <path class="canario__cola" d="M40 60L20 74l6-16z" />
      <ellipse class="canario__cuerpo" cx="56" cy="58" rx="21" ry="15" />
      <path class="canario__ala" d="M42 55q14-11 26 2q-12 9-26 3z" />
      <circle class="canario__cuerpo" cx="74" cy="42" r="11" />
      ${pico}
      ${ojo}
      ${estado === 'amarillo' ? PLUMAS_ERIZADAS : ''}
      <path class="canario__patas" d="M52 72v6M60 72v6" />
    </g>`;
}

/**
 * SVG del canario para un estado del semáforo.
 * @param {'verde'|'amarillo'|'rojo'} estado
 * @param {{ tamano?: number }} [opciones]
 */
export function canario(estado, { tamano = 96 } = {}) {
  const info = ESTADOS[estado];
  return `
    <svg class="canario canario--${estado}" width="${tamano}" height="${tamano * 0.85}" viewBox="0 0 120 102"
         role="img" aria-label="Canario: ${info.descripcionCanario}">
      <circle class="canario__halo" cx="60" cy="52" r="46" />
      <path class="canario__percha" d="M28 80h64" />
      ${estado === 'rojo' ? '<path class="canario__piso" d="M16 94h88" />' : ''}
      ${estado === 'verde' ? NOTAS : ''}
      ${ave(estado)}
    </svg>`;
}
