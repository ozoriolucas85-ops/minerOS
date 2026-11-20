// Servicio de productividad y resumen del panel general.

import { estado } from '../state.js';
import { indexarPorId } from '../domain/utilidades.js';
import { calcularProductividad, evolucionPorTurno, rankingTrabajadores, pesoEnAcopio } from '../domain/productividad.js';
import { resumenCarga } from '../domain/traslados.js';
import { turnoActual } from './turnos.js';
import { ubicacionesActuales } from './ubicacion.js';

/**
 * Productividad en un período: un turno, o los turnos entre dos fechas (YYYY-MM-DD).
 * @param {{ turnoId?: string, desde?: string, hasta?: string, ahora?: number }} filtros
 */
export function productividadDelPeriodo({ turnoId, desde, hasta, ahora = Date.now() } = {}) {
  const todos = estado.listar('turnos').sort((a, b) => a.inicio - b.inicio);
  const turnos = turnoId
    ? todos.filter((t) => t.id === turnoId)
    : todos.filter((t) => (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta));
  const ids = new Set(turnos.map((t) => t.id));
  const cargas = estado.listar('cargas', (c) => ids.has(c.turnoId));
  const nodosPorId = indexarPorId(estado.listar('nodos'));
  const usuarios = indexarPorId(estado.listar('usuarios'));
  const inicio = turnos.length ? turnos[0].inicio : 0;
  const fin = turnos.length ? Math.min(turnos.at(-1).fin, ahora) : 0;
  const r = calcularProductividad({
    cargas,
    cuadrillas: estado.listar('cuadrillas'),
    escaneos: estado.listar('escaneos'),
    nodosPorId,
    desde: inicio,
    hasta: fin,
  });
  const trabajadores = rankingTrabajadores(r.trabajadores).map((t) => ({ ...t, nombre: usuarios.get(t.usuarioId)?.nombre ?? t.usuarioId }));
  const kgTotal = r.cuadrillas.reduce((s, c) => s + c.kg, 0);
  const horasTotal = r.cuadrillas.reduce((s, c) => s + c.horasEfectivas, 0);
  return {
    turnos,
    cuadrillas: r.cuadrillas,
    trabajadores,
    evolucion: evolucionPorTurno(cargas, turnos, nodosPorId),
    toneladas: kgTotal / 1000,
    toneladasPorHora: horasTotal > 0 ? kgTotal / 1000 / horasTotal : null,
    cargasEnAcopio: cargas.filter((c) => pesoEnAcopio(c, nodosPorId) != null).length,
  };
}

/** Datos del panel general del turno en curso. */
export function resumenDelPanel(ahora = Date.now()) {
  const turno = turnoActual(ahora);
  const nodosPorId = indexarPorId(estado.listar('nodos'));
  const config = estado.config();
  const cargasTurno = turno ? estado.listar('cargas', (c) => c.turnoId === turno.id) : [];
  const kg = cargasTurno.reduce((s, c) => s + (pesoEnAcopio(c, nodosPorId) ?? 0), 0);
  const dia = 24 * 60 * 60 * 1000;
  const conPureza = estado.listar('cargas', (c) => c.pureza != null && (c.creada ?? 0) >= ahora - dia);
  const eventos = estado.listar('eventos').sort((a, b) => b.timestamp - a.timestamp);
  const sospechososTurno = eventos.filter((e) => e.tipo === 'sospechoso' && (!turno || e.timestamp >= turno.inicio));
  return {
    turno,
    personasAdentro: ubicacionesActuales(ahora).filter((p) => p.adentro).length,
    toneladasTurno: kg / 1000,
    cargasTurno: cargasTurno.length,
    cargasEnCamino: cargasTurno.filter((c) => !resumenCarga(c, config, nodosPorId).completa).length,
    purezaPromedio: conPureza.length ? conPureza.reduce((s, c) => s + c.pureza, 0) / conPureza.length : null,
    cargasConPureza: conPureza.length,
    sospechososTurno,
    ultimosSospechosos: eventos.filter((e) => e.tipo === 'sospechoso').slice(0, 5),
    ultimosEventos: eventos.slice(0, 10),
  };
}
