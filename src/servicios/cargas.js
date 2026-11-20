// Servicio de cargas: pasaporte de la carga (pesajes por punto) y pureza.

import { estado } from '../state.js';
import { generarId } from '../storage/index.js';
import { usuarioActualId } from '../sesion.js';
import { ErrorDeValidacion, indexarPorId } from '../domain/utilidades.js';
import { motivoBloqueo } from '../domain/semaforo.js';
import {
  validarNuevaCarga,
  validarPesaje,
  siguienteCodigo,
  calcularTramos,
  recorridoDeCarga,
  proximoPunto,
} from '../domain/traslados.js';
import { purezaPorDensidad, purezaManual, clasificarPureza, mineralUtil } from '../domain/pureza.js';
import { crearGrafo } from '../domain/rutas.js';
import { turnoActual } from './turnos.js';
import { ahora as relojAhora } from '../reloj.js';

function exigirCarga(cargaId) {
  const carga = estado.obtener('cargas', cargaId);
  if (!carga) throw new ErrorDeValidacion('La carga no existe.');
  return carga;
}

/** Busca una carga por su código (CAN-0042), sin importar mayúsculas. */
export function buscarCargaPorCodigo(codigo) {
  const buscado = String(codigo ?? '').trim().toUpperCase();
  return estado.listar('cargas').find((c) => c.codigo === buscado) ?? null;
}

/**
 * Crea una carga nueva al salir del frente. No se permite en galerías bloqueadas.
 * @returns {Promise<object>} la carga creada (con su código único)
 */
export async function crearCarga({ cuadrillaId, galeriaId, mineral, volumen, usuarioId = usuarioActualId(), ahora = relojAhora(), simulado = false }) {
  validarNuevaCarga({ cuadrillaId, galeriaId, mineral, volumen });
  const galeria = estado.obtener('galerias', galeriaId);
  if (!galeria) throw new ErrorDeValidacion('La galería no existe.');
  const motivo = motivoBloqueo(galeria);
  if (motivo) throw new ErrorDeValidacion(motivo);
  if (!estado.obtener('cuadrillas', cuadrillaId)) throw new ErrorDeValidacion('La cuadrilla no existe.');
  const carga = {
    id: generarId('car'),
    codigo: siguienteCodigo(estado.listar('cargas')),
    cuadrillaId,
    turnoId: turnoActual(ahora)?.id ?? null,
    galeriaId,
    mineral,
    volumen,
    pesajes: [],
    pureza: null,
    modoPureza: null,
    creada: ahora,
    usuarioId,
    simulado,
  };
  return estado.guardar('cargas', carga);
}

/** Puntos de pesaje sugeridos para la carga y el próximo que corresponde. */
export function puntosDeCarga(carga) {
  const nodos = estado.listar('nodos');
  const nodosPorId = indexarPorId(nodos);
  const frente = nodos.find((n) => n.galeriaId === carga.galeriaId && n.tipo === 'frente');
  const recorrido = frente ? recorridoDeCarga(crearGrafo(nodos, estado.listar('aristas')), nodosPorId, frente.id) : [];
  return { recorrido, proximo: proximoPunto(recorrido, carga.pesajes) };
}

/**
 * Registra el peso de la carga en un punto. Si el tramo nuevo supera la
 * tolerancia, queda un evento "sospechoso" con la cuadrilla y la hora.
 * @returns {Promise<{ carga: object, tramo: object|null }>}
 */
export async function registrarPesaje(cargaId, { nodoId, peso, ahora = relojAhora(), usuarioId = usuarioActualId(), simulado = false }) {
  const carga = exigirCarga(cargaId);
  const nodosPorId = indexarPorId(estado.listar('nodos'));
  validarPesaje(carga, { nodoId, peso }, nodosPorId);
  const pesajes = [...carga.pesajes, { nodoId, peso, timestamp: ahora, usuarioId }];
  const actualizada = await estado.guardar('cargas', { ...carga, pesajes });
  const tramos = calcularTramos(pesajes, estado.config());
  const tramo = tramos.at(-1) ?? null;
  if (tramo?.sospechoso) {
    const cuadrilla = estado.obtener('cuadrillas', carga.cuadrillaId);
    const desde = nodosPorId.get(tramo.desde)?.nombre;
    const hasta = nodosPorId.get(tramo.hasta)?.nombre;
    await estado.guardar('eventos', {
      id: generarId('ev'),
      tipo: 'sospechoso',
      galeriaId: carga.galeriaId,
      cargaId: carga.id,
      codigo: carga.codigo,
      cuadrillaId: carga.cuadrillaId,
      tramo: { desde: tramo.desde, hasta: tramo.hasta, perdida: tramo.perdida, porcentaje: tramo.porcentaje },
      detalle: `Traslado sospechoso ${carga.codigo}: ${desde} → ${hasta} perdió ${tramo.perdida.toFixed(0)} kg (${tramo.porcentaje.toFixed(1).replace('.', ',')} %). Cuadrilla responsable: ${cuadrilla?.nombre ?? '—'}.`,
      timestamp: ahora,
      simulado,
    });
  }
  return { carga: actualizada, tramo };
}

/**
 * Calcula y guarda la pureza de una carga.
 * @param {{ modo: 'densidad'|'manual', peso?: number, muestra?: number, util?: number }} datos
 *   modo densidad: usa el peso indicado (o el primer pesaje) y el volumen de la carga.
 */
export async function guardarPureza(cargaId, { modo, peso, muestra, util }) {
  const carga = exigirCarga(cargaId);
  const resultado = calcularPurezaDeCarga(carga, { modo, peso, muestra, util });
  return estado.guardar('cargas', {
    ...carga,
    pureza: resultado.pureza,
    modoPureza: modo,
    purezaDetalle: resultado,
  });
}

/** Calcula la pureza sin guardar (para mostrar el resultado en vivo). */
export function calcularPurezaDeCarga(carga, { modo, peso, muestra, util }) {
  const config = estado.config();
  const pesoCarga = peso ?? carga.pesajes?.[0]?.peso;
  if (modo === 'densidad') {
    const r = purezaPorDensidad({ peso: pesoCarga, volumen: carga.volumen, mineral: carga.mineral }, config);
    return { ...r, peso: pesoCarga, clasificacion: clasificarPureza(r.pureza, config) };
  }
  if (modo === 'manual') {
    const r = purezaManual({ muestra, util });
    const pesoFinal = carga.pesajes?.at(-1)?.peso ?? pesoCarga;
    return {
      ...r,
      muestra,
      util,
      peso: pesoFinal ?? null,
      mineralUtil: pesoFinal ? mineralUtil(pesoFinal, r.pureza) : null,
      clasificacion: clasificarPureza(r.pureza, config),
    };
  }
  throw new ErrorDeValidacion('Elegí el modo de cálculo: por densidad o manual.');
}
