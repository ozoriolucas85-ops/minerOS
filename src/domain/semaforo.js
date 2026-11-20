// Semáforo estructural de las galerías (sección 3.1 de CLAUDE.md).
// Lógica pura: recibe datos y config, devuelve resultados. Sin DOM ni storage.

import { ErrorDeValidacion, exigirPositivo } from './utilidades.js';

/** Textos obligatorios de cada estado (tabla de la sección 3.1). */
export const ESTADOS = Object.freeze({
  verde: Object.freeze({
    clave: 'verde',
    mensaje: 'Puede seguir con la excavación',
    canario: 'canta',
    descripcionCanario: 'Canta',
  }),
  amarillo: Object.freeze({
    clave: 'amarillo',
    mensaje: 'EVACUACIÓN',
    canario: 'agitado',
    descripcionCanario: 'Agitado, en silencio',
  }),
  rojo: Object.freeze({
    clave: 'rojo',
    mensaje: 'PELIGRO DE DERRUMBE',
    canario: 'caido',
    descripcionCanario: 'Caído',
  }),
});

/** Límites por defecto para un tipo de roca, tomados de la config. */
export function limitesParaRoca(roca, config) {
  const limites = config.limitesPorRoca?.[roca];
  if (!limites) throw new ErrorDeValidacion(`Tipo de roca desconocido: ${roca}`);
  return { metrosMax: limites.metrosMax, velocidadMax: limites.velocidadMax };
}

/**
 * Estabilidad de una galería (0 a 100).
 *   desgaste = metrosSinApuntalar / metrosMax * 100
 *   si avanceTurno > velocidadMax → desgaste *= penalizacionVelocidad
 *   si hayFisuras → desgaste += penalizacionFisuras
 *   estabilidad = max(0, 100 − desgaste)
 */
export function calcularEstabilidad(galeria, config) {
  const { metrosSinApuntalar, metrosMax, avanceTurno, velocidadMax, hayFisuras } = galeria;
  exigirPositivo(metrosMax, 'Los metros máximos sin apuntalar');
  let desgaste = (metrosSinApuntalar / metrosMax) * 100;
  if (avanceTurno > velocidadMax) desgaste *= config.penalizacionVelocidad;
  if (hayFisuras) desgaste += config.penalizacionFisuras;
  return Math.max(0, 100 - desgaste);
}

/**
 * Estado según la estabilidad y los umbrales:
 *   > verde → 'verde' · > rojo y ≤ verde → 'amarillo' · ≤ rojo → 'rojo'
 */
export function estadoDeEstabilidad(estabilidad, config) {
  const { verde, rojo } = config.umbrales;
  if (estabilidad > verde) return 'verde';
  if (estabilidad > rojo) return 'amarillo';
  return 'rojo';
}

/** Evaluación completa de una galería: estabilidad, estado y textos. */
export function evaluarGaleria(galeria, config) {
  const estabilidad = calcularEstabilidad(galeria, config);
  const estado = estadoDeEstabilidad(estabilidad, config);
  return { estabilidad, estado, ...ESTADOS[estado], bloqueada: Boolean(galeria.bloqueada) };
}

/**
 * Recalcula una galería después de un cambio y aplica el bloqueo automático
 * si llega a rojo. Devuelve la galería nueva y si cambió de estado.
 * La galería bloqueada solo se reabre con el desbloqueo de dos llaves.
 */
function recalcular(anterior, nueva, config, ahora) {
  const estadoAnterior = estadoDeEstabilidad(calcularEstabilidad(anterior, config), config);
  const estadoNuevo = estadoDeEstabilidad(calcularEstabilidad(nueva, config), config);
  if (estadoNuevo === 'rojo' && !nueva.bloqueada) {
    nueva.bloqueada = true;
    nueva.bloqueadaDesde = ahora;
  }
  return {
    galeria: nueva,
    estadoAnterior,
    estadoNuevo,
    cambioEstado: estadoAnterior !== estadoNuevo,
    seBloqueo: !anterior.bloqueada && nueva.bloqueada,
  };
}

/** Mensaje de error si la galería no admite cargas de avance (o null si las admite). */
export function motivoBloqueo(galeria) {
  return galeria.bloqueada
    ? `${galeria.nombre} está bloqueada por PELIGRO DE DERRUMBE: no se pueden cargar avances ni cargas.`
    : null;
}

/**
 * Registra un avance de excavación.
 * @param {object} galeria
 * @param {{ metros: number, fisuras?: boolean }} avance
 * @param {object} config
 * @param {number} ahora timestamp (para registrar el bloqueo)
 */
export function aplicarAvance(galeria, { metros, fisuras = false }, config, ahora = 0) {
  const motivo = motivoBloqueo(galeria);
  if (motivo) throw new ErrorDeValidacion(motivo);
  exigirPositivo(metros, 'Los metros de avance');
  const nueva = {
    ...galeria,
    metrosSinApuntalar: galeria.metrosSinApuntalar + metros,
    avanceTurno: galeria.avanceTurno + metros,
    hayFisuras: galeria.hayFisuras || Boolean(fisuras),
  };
  return recalcular(galeria, nueva, config, ahora);
}

/** Reporta fisuras (se permite también en una galería bloqueada). */
export function reportarFisuras(galeria, config, ahora = 0) {
  return recalcular(galeria, { ...galeria, hayFisuras: true }, config, ahora);
}

/**
 * Registra un apuntalamiento: es lo único que hace subir la estabilidad.
 * metrosSinApuntalar = 0 y hayFisuras = false. No desbloquea: eso exige las dos llaves.
 */
export function aplicarApuntalamiento(galeria, config, ahora = 0) {
  const nueva = { ...galeria, metrosSinApuntalar: 0, hayFisuras: false };
  if (galeria.bloqueada) nueva.apuntaladaDesdeBloqueo = ahora;
  return recalcular(galeria, nueva, config, ahora);
}

/** Al empezar un turno nuevo el avance del turno vuelve a 0. */
export function reiniciarTurno(galeria) {
  return { ...galeria, avanceTurno: 0 };
}

/**
 * Valida el desbloqueo de dos llaves:
 *  (1) se registró un apuntalamiento después del bloqueo,
 *  (2) confirma un ingeniero y (3) confirma un capataz (personas distintas).
 * @returns {{ valido: boolean, errores: string[] }}
 */
export function validarDesbloqueo({ galeria, avances = [], ingeniero, capataz }) {
  const errores = [];
  if (!galeria.bloqueada) {
    return { valido: false, errores: [`${galeria.nombre} no está bloqueada.`] };
  }
  const desde = galeria.bloqueadaDesde ?? 0;
  const huboApuntalamiento =
    (galeria.apuntaladaDesdeBloqueo ?? -Infinity) >= desde ||
    avances.some((a) => a.galeriaId === galeria.id && a.apuntalado && a.timestamp >= desde);
  if (!huboApuntalamiento) errores.push('Falta registrar un apuntalamiento después del bloqueo.');
  if (!ingeniero || ingeniero.rol !== 'ingeniero') errores.push('Falta la llave de un ingeniero.');
  if (!capataz || capataz.rol !== 'capataz') errores.push('Falta la llave de un capataz.');
  if (ingeniero && capataz && ingeniero.id === capataz.id) {
    errores.push('Las dos llaves tienen que ser de personas distintas.');
  }
  return { valido: errores.length === 0, errores };
}

/** Reabre la galería (llamar solo después de validarDesbloqueo). */
export function desbloquear(galeria) {
  const { bloqueadaDesde, apuntaladaDesdeBloqueo, ...resto } = galeria;
  return { ...resto, bloqueada: false };
}
