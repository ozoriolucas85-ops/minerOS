// Servicio de ubicación: arma los datos para domain/ubicacion y domain/rutas.

import { estado } from '../state.js';
import { indexarPorId } from '../domain/utilidades.js';
import { ubicarPersonas, estadoDePersona, escaneosDe } from '../domain/ubicacion.js';
import { crearGrafo, rutaDeSalida, hiloDeAriadna, caminoDelHilo, volverPorElHilo } from '../domain/rutas.js';
import { ahora as relojAhora } from '../reloj.js';

export function nodosPorId() {
  return indexarPorId(estado.listar('nodos'));
}

export function galeriasPorId() {
  return indexarPorId(estado.listar('galerias'));
}

/** Ubicación de todos los usuarios (adentro, dónde, sin señal). */
export function ubicacionesActuales(ahora = relojAhora()) {
  return ubicarPersonas({
    escaneos: estado.listar('escaneos'),
    usuarios: estado.listar('usuarios'),
    nodosPorId: nodosPorId(),
    ahora,
    config: estado.config(),
  });
}

/** Ruta de salida más corta desde un nodo, evitando galerías bloqueadas. */
export function rutaDeSalidaDesde(nodoId, opciones = {}) {
  const nodos = estado.listar('nodos');
  const bloqueadas = new Set(estado.listar('galerias', (g) => g.bloqueada).map((g) => g.id));
  return rutaDeSalida({
    grafo: crearGrafo(nodos, estado.listar('aristas')),
    origen: nodoId,
    nodosPorId: indexarPorId(nodos),
    galeriasBloqueadas: bloqueadas,
    ...opciones,
  });
}

/** "Frente Este → Este · km 1 → Cruce nivel −40 → …" */
export function describirCamino(camino) {
  const nodos = nodosPorId();
  return camino.map((id) => nodos.get(id)?.nombre ?? id).join(' → ');
}

/**
 * Hilo de Ariadna de una persona en su visita actual (desde que entró).
 * @returns {{ secuencia: string[], camino: string[], vuelta: string[] }}
 */
export function hiloDe(usuarioId) {
  const nodos = nodosPorId();
  const escaneos = estado.listar('escaneos');
  const { entrada } = estadoDePersona(escaneosDe(escaneos, usuarioId), nodos);
  const secuencia = hiloDeAriadna(escaneos, usuarioId, { desde: entrada?.timestamp ?? -Infinity });
  const camino = caminoDelHilo(crearGrafo(estado.listar('nodos'), estado.listar('aristas')), secuencia);
  return { secuencia, camino, vuelta: volverPorElHilo(camino) };
}
