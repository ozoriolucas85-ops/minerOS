// Servicio de galerías: une la lógica pura (domain/semaforo) con el estado.
// La UI llama a estas funciones; acá se guardan la galería, el avance y los eventos.

import { estado } from '../state.js';
import { generarId } from '../storage/index.js';
import { usuarioActualId } from '../sesion.js';
import {
  ESTADOS,
  aplicarAvance,
  aplicarApuntalamiento,
  reportarFisuras,
  validarDesbloqueo,
  desbloquear,
} from '../domain/semaforo.js';
import { ErrorDeValidacion } from '../domain/utilidades.js';
import { verificarPin } from './autenticacion.js';
import { turnoActual } from './turnos.js';

function exigirGaleria(galeriaId) {
  const galeria = estado.obtener('galerias', galeriaId);
  if (!galeria) throw new ErrorDeValidacion('La galería no existe.');
  return galeria;
}

function nuevoEvento(tipo, galeriaId, detalle, ahora, extra = {}) {
  return { id: generarId('ev'), tipo, galeriaId, detalle, timestamp: ahora, ...extra };
}

/** Eventos que genera un recálculo (cambio de estado y bloqueo automático). */
function eventosDeRecalculo(resultado, ahora, extra) {
  const { galeria, estadoAnterior, estadoNuevo, cambioEstado, seBloqueo } = resultado;
  const eventos = [];
  if (cambioEstado) {
    eventos.push(
      nuevoEvento(
        'cambio-estado',
        galeria.id,
        `${galeria.nombre}: ${ESTADOS[estadoAnterior].mensaje} → ${ESTADOS[estadoNuevo].mensaje}`,
        ahora,
        { estadoAnterior, estadoNuevo, ...extra },
      ),
    );
  }
  if (seBloqueo) {
    eventos.push(
      nuevoEvento('bloqueo', galeria.id, `${galeria.nombre} bloqueada automáticamente por PELIGRO DE DERRUMBE.`, ahora, extra),
    );
  }
  return eventos;
}

async function guardarResultado(resultado, registro, ahora, extra) {
  await estado.guardar('galerias', resultado.galeria);
  if (registro) await estado.guardar('avances', registro);
  const eventos = eventosDeRecalculo(resultado, ahora, extra);
  if (eventos.length) await estado.guardarVarios('eventos', eventos);
  return resultado;
}

/**
 * Registra un avance de excavación (metros y si se vieron fisuras).
 * @param {{ metros: number, fisuras?: boolean, usuarioId?: string, ahora?: number, simulado?: boolean }} datos
 */
export async function registrarAvance(galeriaId, { metros, fisuras = false, usuarioId = usuarioActualId(), ahora = Date.now(), simulado = false }) {
  const galeria = exigirGaleria(galeriaId);
  const resultado = aplicarAvance(galeria, { metros, fisuras }, estado.config(), ahora);
  const avance = {
    id: generarId('av'),
    galeriaId,
    turnoId: turnoActual(ahora)?.id ?? null,
    metros,
    apuntalado: false,
    fisuras: Boolean(fisuras),
    usuarioId,
    timestamp: ahora,
    simulado,
  };
  return guardarResultado(resultado, avance, ahora, { simulado });
}

/** Registra un apuntalamiento: metros sin apuntalar a 0 y sin fisuras. */
export async function registrarApuntalamiento(galeriaId, { usuarioId = usuarioActualId(), ahora = Date.now(), simulado = false } = {}) {
  const galeria = exigirGaleria(galeriaId);
  const resultado = aplicarApuntalamiento(galeria, estado.config(), ahora);
  const avance = {
    id: generarId('av'),
    galeriaId,
    turnoId: turnoActual(ahora)?.id ?? null,
    metros: 0,
    metrosApuntalados: galeria.metrosSinApuntalar,
    apuntalado: true,
    fisuras: false,
    usuarioId,
    timestamp: ahora,
    simulado,
  };
  await guardarResultado(resultado, avance, ahora, { simulado });
  await estado.guardar(
    'eventos',
    nuevoEvento('apuntalamiento', galeriaId, `Apuntalamiento registrado en ${galeria.nombre} (${galeria.metrosSinApuntalar} m).`, ahora, { simulado }),
  );
  return resultado;
}

/** Reporta fisuras en una galería. */
export async function registrarFisuras(galeriaId, { usuarioId = usuarioActualId(), ahora = Date.now(), simulado = false } = {}) {
  const galeria = exigirGaleria(galeriaId);
  const resultado = reportarFisuras(galeria, estado.config(), ahora);
  await guardarResultado(resultado, null, ahora, { simulado });
  await estado.guardar(
    'eventos',
    nuevoEvento('fisuras', galeriaId, `Fisuras reportadas en ${galeria.nombre}.`, ahora, { usuarioId, simulado }),
  );
  return resultado;
}

/**
 * Desbloqueo de dos llaves: PIN de un ingeniero + PIN de un capataz,
 * con un apuntalamiento registrado después del bloqueo.
 * @returns {Promise<{ valido: boolean, errores: string[] }>}
 */
export async function desbloquearGaleria(galeriaId, { ingenieroId, pinIngeniero, capatazId, pinCapataz, ahora = Date.now(), simulado = false }) {
  const galeria = exigirGaleria(galeriaId);
  const ingeniero = await verificarPin(ingenieroId, pinIngeniero);
  const capataz = await verificarPin(capatazId, pinCapataz);
  const validacion = validarDesbloqueo({ galeria, avances: estado.listar('avances'), ingeniero, capataz });
  // Si se eligió la persona pero el PIN no coincide, decirlo así (más claro que "falta la llave").
  const errores = validacion.errores.map((e) => {
    if (/ingeniero/.test(e) && ingenieroId) return 'El PIN del ingeniero no es correcto.';
    if (/capataz/.test(e) && capatazId) return 'El PIN del capataz no es correcto.';
    return e;
  });
  if (errores.length) return { valido: false, errores };

  await estado.guardar('galerias', desbloquear(galeria));
  await estado.guardar('desbloqueos', {
    id: generarId('des'),
    galeriaId,
    ingenieroId: ingeniero.id,
    capatazId: capataz.id,
    timestamp: ahora,
    simulado,
  });
  await estado.guardar(
    'eventos',
    nuevoEvento('desbloqueo', galeriaId, `${galeria.nombre} reabierta con dos llaves: ${ingeniero.nombre} (ingeniero) y ${capataz.nombre} (capataz).`, ahora, { simulado }),
  );
  return { valido: true, errores: [] };
}

/** Historial de una galería: eventos y avances, del más nuevo al más viejo. */
export function historialGaleria(galeriaId) {
  const eventos = estado.listar('eventos', (e) => e.galeriaId === galeriaId).map((e) => ({ ...e, clase: 'evento' }));
  const avances = estado
    .listar('avances', (a) => a.galeriaId === galeriaId && !a.apuntalado)
    .map((a) => ({ ...a, clase: 'avance' }));
  return [...eventos, ...avances].sort((a, b) => b.timestamp - a.timestamp);
}
