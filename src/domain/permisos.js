// Permisos por rol (sección 2 de CLAUDE.md).
//   Ingeniero: todo.
//   Capataz: avances, apuntalamientos, fisuras y cargas DE SU CUADRILLA; segunda
//            llave del desbloqueo; ve el mapa y el tablero de chapas.
//   Trabajador: escanea balizas y ve su propio recorrido y su ruta de salida.

import { ErrorDeValidacion } from './utilidades.js';

/** Pantallas que ve cada rol (la primera es su pantalla de inicio). */
export const PANTALLAS_POR_ROL = Object.freeze({
  ingeniero: ['panel', 'mapa', 'chapas', 'galerias', 'cargas', 'pureza', 'productividad', 'balizas', 'simulador', 'configuracion', 'estilos'],
  capataz: ['galerias', 'mapa', 'chapas', 'cargas', 'pureza', 'balizas'],
  trabajador: ['balizas'],
});

export const NOMBRE_ROL = Object.freeze({ ingeniero: 'Ingeniero / Arquitecto', capataz: 'Capataz', trabajador: 'Trabajador' });

const TEXTO_ACCION = {
  'galeria:avance': 'registrar avances en esta galería',
  'galeria:apuntalar': 'registrar apuntalamientos en esta galería',
  'galeria:fisuras': 'reportar fisuras en esta galería',
  'galeria:limites': 'cambiar los límites de seguridad',
  'config:editar': 'cambiar la configuración',
  'carga:crear': 'crear cargas de esta cuadrilla',
  'carga:pesar': 'pesar cargas de esta cuadrilla',
  'pureza:guardar': 'guardar la pureza de esta carga',
  'escaneo:registrar': 'registrar el paso de esta persona',
  'qr:imprimir': 'imprimir los QR de las balizas',
  'simulador:usar': 'usar el simulador',
  'desbloqueo:llave1': 'dar la primera llave',
  'desbloqueo:llave2': 'dar la segunda llave',
};

/** ¿La galería es de la cuadrilla del capataz? */
function galeriaDeSuCuadrilla(usuario, galeriaId, cuadrillas) {
  const propia = cuadrillas.find((c) => c.capatazId === usuario.id || c.id === usuario.cuadrillaId);
  return Boolean(propia?.galeriaIds?.includes(galeriaId));
}

/**
 * ¿Puede el usuario hacer la acción?
 * @param {object|null} usuario
 * @param {string} accion ej. 'galeria:avance', 'ver:mapa'
 * @param {{ galeriaId?: string, cuadrillaId?: string, objetivoId?: string, cuadrillas?: object[], usuarios?: object[] }} [contexto]
 */
export function puede(usuario, accion, contexto = {}) {
  if (!usuario) return false;
  const { rol } = usuario;
  if (accion.startsWith('ver:')) return PANTALLAS_POR_ROL[rol]?.includes(accion.slice(4)) ?? false;
  if (rol === 'ingeniero') return accion !== 'desbloqueo:llave2'; // la segunda llave es del capataz
  const cuadrillas = contexto.cuadrillas ?? [];
  if (rol === 'capataz') {
    switch (accion) {
      case 'galeria:avance':
      case 'galeria:apuntalar':
      case 'galeria:fisuras':
        return galeriaDeSuCuadrilla(usuario, contexto.galeriaId, cuadrillas);
      case 'carga:crear':
      case 'carga:pesar':
      case 'pureza:guardar':
        return contexto.cuadrillaId === usuario.cuadrillaId;
      case 'escaneo:registrar': {
        if (contexto.objetivoId === usuario.id) return true;
        const objetivo = (contexto.usuarios ?? []).find((u) => u.id === contexto.objetivoId);
        return objetivo?.cuadrillaId === usuario.cuadrillaId;
      }
      case 'desbloqueo:llave2':
        return true;
      default:
        return false;
    }
  }
  if (rol === 'trabajador') return accion === 'escaneo:registrar' && contexto.objetivoId === usuario.id;
  return false;
}

/** Lanza ErrorDeValidacion si no tiene permiso. */
export function exigirPermiso(usuario, accion, contexto) {
  if (!usuario) throw new ErrorDeValidacion('Ingresá con tu usuario y PIN para hacer esto.');
  if (!puede(usuario, accion, contexto)) {
    throw new ErrorDeValidacion(`Tu rol (${NOMBRE_ROL[usuario.rol] ?? usuario.rol}) no permite ${TEXTO_ACCION[accion] ?? accion}.`);
  }
  return true;
}

/** Pantalla de inicio de un rol. */
export function pantallaInicial(rol) {
  return PANTALLAS_POR_ROL[rol]?.[0] ?? 'ingreso';
}
