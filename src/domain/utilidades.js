// Utilidades puras compartidas por la lógica de dominio.

/** Error de datos ingresados: su mensaje se puede mostrar tal cual al usuario. */
export class ErrorDeValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeValidacion';
  }
}

/**
 * Acota un número entre un mínimo y un máximo.
 * @param {number} valor
 * @param {number} minimo
 * @param {number} maximo
 */
export function acotar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Redondea a `decimales` cifras (evita 0.30000000000000004 al mostrar). */
export function redondear(valor, decimales = 1) {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** true si es un número finito. */
export function esNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/** Lanza ErrorDeValidacion si el valor no es un número mayor que 0. */
export function exigirPositivo(valor, nombre) {
  if (!esNumero(valor) || valor <= 0) {
    throw new ErrorDeValidacion(`${nombre} tiene que ser un número mayor que 0.`);
  }
  return valor;
}

/** Lanza ErrorDeValidacion si el valor no es un número mayor o igual que 0. */
export function exigirNoNegativo(valor, nombre) {
  if (!esNumero(valor) || valor < 0) {
    throw new ErrorDeValidacion(`${nombre} tiene que ser un número igual o mayor que 0.`);
  }
  return valor;
}

/** Índice por id: [{id}] → Map(id → objeto). */
export function indexarPorId(lista) {
  return new Map(lista.map((o) => [o.id, o]));
}
