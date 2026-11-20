// Pureza del material (sección 3.5 de CLAUDE.md).
// Pesos en kg, volumen en m³, densidades en g/cm³ (1 g/cm³ = 1000 kg/m³).

import { ErrorDeValidacion, acotar, exigirPositivo, exigirNoNegativo } from './utilidades.js';

export const MINERALES = Object.freeze([
  { clave: 'hierro', nombre: 'Hierro (hematita)' },
  { clave: 'cobre', nombre: 'Cobre (calcopirita)' },
  { clave: 'caliza', nombre: 'Caliza' },
  { clave: 'cuarzo', nombre: 'Cuarzo' },
]);

export function nombreMineral(clave) {
  return MINERALES.find((m) => m.clave === clave)?.nombre ?? clave;
}

function densidadDe(mineral, config) {
  const d = config.densidades?.[mineral];
  if (!d) throw new ErrorDeValidacion(`No hay densidad configurada para "${mineral}".`);
  return d;
}

/** Densidad en g/cm³ a partir del peso (kg) y el volumen (m³). */
export function calcularDensidad(peso, volumen) {
  exigirPositivo(peso, 'El peso');
  exigirPositivo(volumen, 'El volumen');
  return peso / volumen / 1000;
}

/**
 * Pureza por densidad (estimación):
 *   pureza = (densidad − densidadEsteril) / (densidadMineral − densidadEsteril) × 100, acotada 0–100
 */
export function purezaPorDensidad({ peso, volumen, mineral }, config) {
  const densidad = calcularDensidad(peso, volumen);
  const densidadMineral = densidadDe(mineral, config);
  const densidadEsteril = densidadDe('esteril', config);
  if (densidadMineral === densidadEsteril) {
    throw new ErrorDeValidacion('La densidad del mineral es igual a la del estéril: usá el modo manual.');
  }
  const cruda = ((densidad - densidadEsteril) / (densidadMineral - densidadEsteril)) * 100;
  const pureza = acotar(cruda, 0, 100);
  return { densidad, pureza, mineralUtil: mineralUtil(peso, pureza), modo: 'densidad' };
}

/** Pureza manual: pureza = útil / muestra × 100. */
export function purezaManual({ muestra, util }) {
  exigirPositivo(muestra, 'El peso de la muestra');
  exigirNoNegativo(util, 'El peso de mineral útil');
  if (util > muestra) {
    throw new ErrorDeValidacion('El mineral útil no puede pesar más que la muestra.');
  }
  return { pureza: (util / muestra) * 100, modo: 'manual' };
}

/** Kilos de mineral útil en una carga: peso × pureza / 100. */
export function mineralUtil(peso, pureza) {
  exigirNoNegativo(peso, 'El peso');
  return (peso * acotar(pureza, 0, 100)) / 100;
}

/** Alta (> alta), Media (media a alta, inclusive) o Baja (< media). */
export function clasificarPureza(pureza, config) {
  const { alta, media } = config.pureza;
  if (pureza > alta) return 'Alta';
  if (pureza >= media) return 'Media';
  return 'Baja';
}

const decimal = (n) => String(n).replace('.', ',');

/**
 * Sugiere el modo según el contraste de densidad entre el mineral y el estéril.
 * Si la diferencia relativa es menor que config.pureza.contrasteMinimo (caliza y
 * cuarzo), la densidad no distingue mineral de roca y conviene el modo manual.
 * @returns {{ modo: 'densidad'|'manual', motivo: string }}
 */
export function sugerirModo(mineral, config) {
  const densidadMineral = densidadDe(mineral, config);
  const densidadEsteril = densidadDe('esteril', config);
  const contraste = Math.abs(densidadMineral - densidadEsteril) / densidadEsteril;
  if (contraste < config.pureza.contrasteMinimo) {
    return {
      modo: 'manual',
      motivo: `La densidad de ${nombreMineral(mineral).toLowerCase()} (${decimal(densidadMineral)} g/cm³) es casi igual a la de la roca estéril (${decimal(densidadEsteril)} g/cm³), así que pesar la carretilla no permite distinguirlos. Conviene medir una muestra.`,
    };
  }
  return {
    modo: 'densidad',
    motivo: `${nombreMineral(mineral)} (${decimal(densidadMineral)} g/cm³) es bastante más denso que la roca estéril (${decimal(densidadEsteril)} g/cm³): el peso de la carga permite estimar la pureza.`,
  };
}
