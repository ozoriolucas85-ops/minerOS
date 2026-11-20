// Capa de persistencia: interfaz común.
//
// Todos los adaptadores (local.js hoy, firebase.js más adelante) cumplen esta
// interfaz. Los métodos devuelven Promesas para que el cambio a un backend
// remoto no obligue a tocar el resto del código.
//
//   obtener(coleccion, id)          → Promise<objeto | null>
//   listar(coleccion, filtro?)      → Promise<objeto[]>
//   guardar(coleccion, objeto)      → Promise<objeto>      (alta o modificación por id)
//   guardarVarios(coleccion, lista) → Promise<objeto[]>
//   borrar(coleccion, id)           → Promise<boolean>
//   reemplazarTodo(datos)           → Promise<void>        ({coleccion: objeto[]})
//   exportar()                      → Promise<{coleccion: objeto[]}>
//   estaVacio()                     → Promise<boolean>
//   suscribirse(fn)                 → función para desuscribirse
//                                     fn({ coleccion, tipo: 'guardar'|'borrar'|'reemplazar'|'externo', id? })

import { crearAlmacenLocal } from './local.js';

/** Colecciones del modelo de datos (sección 7 de CLAUDE.md). */
export const COLECCIONES = [
  'config',
  'usuarios',
  'cuadrillas',
  'galerias',
  'nodos',
  'aristas',
  'escaneos',
  'turnos',
  'avances',
  'cargas',
  'eventos',
  'desbloqueos',
];

/**
 * Crea el almacenamiento según el modo.
 * @param {'local'} [modo]
 */
export function crearStorage(modo = 'local') {
  if (modo === 'local') return crearAlmacenLocal({ almacen: globalThis.localStorage });
  throw new Error(`Modo de almacenamiento desconocido: ${modo}`);
}

/** Genera un id corto y único con prefijo (ej. "av-lx2k9-3f1a"). */
export function generarId(prefijo = 'id') {
  const tiempo = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 6);
  return `${prefijo}-${tiempo}-${azar}`;
}
