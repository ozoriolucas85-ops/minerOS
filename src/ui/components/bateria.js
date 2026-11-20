// Batería de estabilidad: barra con el porcentaje, del color del estado.

import { numero } from '../formato.js';

/**
 * @param {number} estabilidad 0–100
 * @param {'verde'|'amarillo'|'rojo'} estado
 * @param {{ grande?: boolean }} [opciones]
 */
export function bateria(estabilidad, estado, { grande = false } = {}) {
  const valor = Math.max(0, Math.min(100, estabilidad));
  return `
    <div class="bateria bateria--${estado} ${grande ? 'bateria--grande' : ''}"
         role="meter" aria-label="Estabilidad" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${numero(valor, 1)}">
      <div class="bateria__cuerpo">
        <div class="bateria__carga" style="width: ${valor}%"></div>
        <div class="bateria__marcas" aria-hidden="true"></div>
      </div>
      <div class="bateria__borne" aria-hidden="true"></div>
      <span class="bateria__valor">${numero(valor, 1)} %</span>
    </div>`;
}
