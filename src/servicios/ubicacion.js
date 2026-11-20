// Servicio de ubicación: arma los datos para domain/ubicacion y domain/rutas.

import { estado } from '../state.js';
import { indexarPorId } from '../domain/utilidades.js';
import { ubicarPersonas } from '../domain/ubicacion.js';
import { crearGrafo, rutaDeSalida } from '../domain/rutas.js';

export function nodosPorId() {
  return indexarPorId(estado.listar('nodos'));
}

export function galeriasPorId() {
  return indexarPorId(estado.listar('galerias'));
}

/** Ubicación de todos los usuarios (adentro, dónde, sin señal). */
export function ubicacionesActuales(ahora = Date.now()) {
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
