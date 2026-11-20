// Pasaporte de la carga: pérdidas por tramo (sección 3.4 de CLAUDE.md).

import { ErrorDeValidacion, exigirPositivo, esNumero } from './utilidades.js';
import { bfs } from './rutas.js';

/** Orden de los puntos de pesaje: frente → cruce → boca de mina → acopio. */
export const ORDEN_PUNTOS = Object.freeze(['frente', 'cruce', 'boca', 'acopio']);

/** Código único de carga: 42 → "CAN-0042". */
export function generarCodigoCarga(numero) {
  return `CAN-${String(numero).padStart(4, '0')}`;
}

/** Siguiente código libre según las cargas existentes. */
export function siguienteCodigo(cargas) {
  const numeros = cargas
    .map((c) => Number(/^CAN-(\d+)$/.exec(c.codigo ?? '')?.[1]))
    .filter((n) => Number.isFinite(n));
  return generarCodigoCarga((numeros.length ? Math.max(...numeros) : 0) + 1);
}

/**
 * Pérdida entre dos pesajes.
 *   pérdida = pesoAnterior − pesoActual · % = pérdida / pesoAnterior × 100
 */
export function calcularPerdida(pesoAnterior, pesoActual) {
  exigirPositivo(pesoAnterior, 'El peso anterior');
  if (!esNumero(pesoActual) || pesoActual < 0) {
    throw new ErrorDeValidacion('El peso actual tiene que ser un número igual o mayor que 0.');
  }
  const perdida = pesoAnterior - pesoActual;
  return { perdida, porcentaje: (perdida / pesoAnterior) * 100 };
}

/** Un tramo es sospechoso si el % de pérdida supera la tolerancia. */
export function esSospechoso(porcentaje, tolerancia) {
  return porcentaje > tolerancia;
}

/**
 * Tramos de una carga a partir de sus pesajes (ordenados por hora).
 * @returns {Array<{desde, hasta, pesoAnterior, pesoActual, perdida, porcentaje, sospechoso, horaDesde, horaHasta}>}
 */
export function calcularTramos(pesajes, config) {
  const ordenados = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);
  const tramos = [];
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const actual = ordenados[i];
    const { perdida, porcentaje } = calcularPerdida(anterior.peso, actual.peso);
    tramos.push({
      desde: anterior.nodoId,
      hasta: actual.nodoId,
      pesoAnterior: anterior.peso,
      pesoActual: actual.peso,
      perdida,
      porcentaje,
      sospechoso: esSospechoso(porcentaje, config.toleranciaPerdida),
      horaDesde: anterior.timestamp,
      horaHasta: actual.timestamp,
    });
  }
  return tramos;
}

/** Resumen de una carga: tramos, pérdida total y si es sospechosa. */
export function resumenCarga(carga, config, nodosPorId) {
  const pesajes = [...(carga.pesajes ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const tramos = calcularTramos(pesajes, config);
  const pesoInicial = pesajes[0]?.peso ?? null;
  const pesoFinal = pesajes.at(-1)?.peso ?? null;
  const perdidaTotal = pesoInicial !== null ? pesoInicial - pesoFinal : 0;
  const ultimoTipo = nodosPorId?.get(pesajes.at(-1)?.nodoId)?.tipo ?? null;
  return {
    tramos,
    pesoInicial,
    pesoFinal,
    perdidaTotal,
    porcentajeTotal: pesoInicial ? (perdidaTotal / pesoInicial) * 100 : 0,
    sospechosa: tramos.some((t) => t.sospechoso),
    tramosSospechosos: tramos.filter((t) => t.sospechoso),
    completa: ultimoTipo === 'acopio',
  };
}

/**
 * Valida un pesaje nuevo para una carga.
 * Peso positivo, punto existente, en orden (frente → cruce → boca → acopio),
 * sin repetir punto y sin pesajes después del acopio.
 */
export function validarPesaje(carga, { nodoId, peso }, nodosPorId) {
  exigirPositivo(peso, 'El peso');
  const nodo = nodosPorId.get(nodoId);
  if (!nodo) throw new ErrorDeValidacion('El punto de pesaje no existe.');
  const indice = ORDEN_PUNTOS.indexOf(nodo.tipo);
  if (indice === -1) throw new ErrorDeValidacion(`En "${nodo.nombre}" no se pesan cargas.`);

  const pesajes = carga.pesajes ?? [];
  if (pesajes.length === 0 && nodo.tipo !== 'frente') {
    throw new ErrorDeValidacion('El primer pesaje tiene que hacerse en el frente.');
  }
  if (pesajes.some((p) => p.nodoId === nodoId)) {
    throw new ErrorDeValidacion(`La carga ya se pesó en "${nodo.nombre}".`);
  }
  const ultimo = pesajes.length ? nodosPorId.get(pesajes.at(-1).nodoId) : null;
  if (ultimo) {
    const indiceUltimo = ORDEN_PUNTOS.indexOf(ultimo.tipo);
    if (ultimo.tipo === 'acopio') throw new ErrorDeValidacion('La carga ya llegó al acopio.');
    if (indice < indiceUltimo || (indice === indiceUltimo && nodo.tipo !== 'cruce')) {
      throw new ErrorDeValidacion(`Orden incorrecto: después de ${ultimo.nombre} no puede venir ${nodo.nombre}.`);
    }
  }
  return true;
}

/** Valida los datos de una carga nueva. */
export function validarNuevaCarga({ cuadrillaId, galeriaId, mineral, volumen }) {
  if (!cuadrillaId) throw new ErrorDeValidacion('Elegí la cuadrilla.');
  if (!galeriaId) throw new ErrorDeValidacion('Elegí la galería.');
  if (!mineral) throw new ErrorDeValidacion('Elegí el mineral.');
  exigirPositivo(volumen, 'El volumen');
  return true;
}

/**
 * Filtra el historial de traslados.
 * @param {object[]} cargas
 * @param {{ desde?: number, hasta?: number, cuadrillaId?: string, soloSospechosos?: boolean }} filtros
 */
export function filtrarTraslados(cargas, filtros, config) {
  const { desde, hasta, cuadrillaId, soloSospechosos } = filtros ?? {};
  return cargas.filter((c) => {
    const inicio = c.pesajes?.[0]?.timestamp ?? c.creada ?? 0;
    if (desde != null && inicio < desde) return false;
    if (hasta != null && inicio > hasta) return false;
    if (cuadrillaId && c.cuadrillaId !== cuadrillaId) return false;
    if (soloSospechosos && !calcularTramos(c.pesajes ?? [], config).some((t) => t.sospechoso)) return false;
    return true;
  });
}

/**
 * Puntos de pesaje sugeridos para una carga, en orden: el frente de su
 * galería, los cruces por el camino más corto hasta la boca, la boca y el acopio.
 * @param {Map} grafo crearGrafo(nodos, aristas)
 * @returns {string[]} ids de nodos
 */
export function recorridoDeCarga(grafo, nodosPorId, frenteId) {
  const camino = bfs(grafo, frenteId, (id) => nodosPorId.get(id)?.tipo === 'boca');
  if (!camino) return [];
  const puntos = camino.camino.filter((id) => ORDEN_PUNTOS.includes(nodosPorId.get(id)?.tipo));
  const acopio = [...nodosPorId.values()].find((n) => n.tipo === 'acopio');
  return acopio ? [...puntos, acopio.id] : puntos;
}

/** Próximo punto sugerido según los pesajes ya hechos (o null si terminó). */
export function proximoPunto(recorrido, pesajes) {
  const hechos = new Set((pesajes ?? []).map((p) => p.nodoId));
  const ultimo = (pesajes ?? []).at(-1)?.nodoId;
  const desde = ultimo ? recorrido.indexOf(ultimo) + 1 : 0;
  return recorrido.slice(desde).find((id) => !hechos.has(id)) ?? null;
}
