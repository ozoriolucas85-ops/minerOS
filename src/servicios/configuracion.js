// Configuración: límites de seguridad, tolerancias y densidades (solo ingeniero).

import { estado } from '../state.js';
import { usuarioActualId } from '../sesion.js';
import { ErrorDeValidacion, exigirPositivo } from '../domain/utilidades.js';
import { evaluarGaleria } from '../domain/semaforo.js';
import { exigir } from './permisos.js';

/**
 * Cambia valores generales de la config (tolerancia, sin señal, umbrales, densidades, límites por roca).
 * @param {object} cambios mismo formato que la config (solo las claves que cambian)
 */
export async function actualizarConfig(cambios, { usuarioId = usuarioActualId() } = {}) {
  exigir(usuarioId, 'config:editar');
  const actual = estado.config();
  const nueva = {
    ...actual,
    ...cambios,
    densidades: { ...actual.densidades, ...(cambios.densidades ?? {}) },
    umbrales: { ...actual.umbrales, ...(cambios.umbrales ?? {}) },
    limitesPorRoca: { ...actual.limitesPorRoca, ...(cambios.limitesPorRoca ?? {}) },
  };
  exigirPositivo(nueva.toleranciaPerdida, 'La tolerancia de pérdida');
  exigirPositivo(nueva.minutosSinSenal, 'Los minutos sin señal');
  Object.entries(nueva.densidades).forEach(([m, d]) => exigirPositivo(d, `La densidad de ${m}`));
  Object.values(nueva.limitesPorRoca).forEach((l) => {
    exigirPositivo(l.metrosMax, 'Los metros máximos sin apuntalar');
    exigirPositivo(l.velocidadMax, 'La velocidad máxima');
  });
  const { verde, rojo } = nueva.umbrales;
  if (!(rojo > 0 && verde > rojo && verde < 100)) {
    throw new ErrorDeValidacion('Los umbrales tienen que cumplir 0 < rojo < verde < 100.');
  }
  return estado.guardar('config', nueva);
}

/**
 * Cambia los límites de seguridad de una galería (metros máx. sin apuntalar y velocidad máx.).
 * El estado se recalcula solo con los nuevos límites.
 */
export async function actualizarLimitesGaleria(galeriaId, { metrosMax, velocidadMax }, { usuarioId = usuarioActualId() } = {}) {
  exigir(usuarioId, 'galeria:limites', { galeriaId });
  const galeria = estado.obtener('galerias', galeriaId);
  if (!galeria) throw new ErrorDeValidacion('La galería no existe.');
  exigirPositivo(metrosMax, 'Los metros máximos sin apuntalar');
  exigirPositivo(velocidadMax, 'La velocidad máxima');
  const nueva = { ...galeria, metrosMax, velocidadMax };
  await estado.guardar('galerias', nueva);
  return evaluarGaleria(nueva, estado.config());
}
