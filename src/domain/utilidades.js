// Utilidades puras compartidas por la lógica de dominio.

/**
 * Acota un número entre un mínimo y un máximo.
 * @param {number} valor
 * @param {number} minimo
 * @param {number} maximo
 */
export function acotar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}
