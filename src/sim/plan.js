// Plan de un turno simulado: la lista de cosas que pasan y cuándo (en minutos
// desde el inicio del turno). Es puro: recibe los datos y un generador de azar.
//
// Guion de la demo (sección 3.7 de CLAUDE.md):
//   · al principio, la primera carga de la cuadrilla Norte pierde 6 % en un tramo;
//   · a mitad del turno G3 pasa a amarillo: sus trabajadores evacúan por la ruta;
//   · hacia el final G5 llega a rojo y queda bloqueada (para desbloquearla en vivo).

export const MINUTOS_TURNO = 480;

export const GUION = Object.freeze({
  cargaSospechosa: { minuto: 20, cuadrillaId: 'CU-NORTE', perdida: 0.06 },
  amarillo: { minuto: 240, galeriaId: 'G3' },
  reaperturaAmarillo: { minuto: 300 },
  rojo: { minuto: 400, galeriaId: 'G5' },
  salidaFinal: { minuto: 440 }, // + hasta 10 min de dispersión y ~25 min de recorrido: todos salen antes de las 8 h
  sinSenal: { usuarioId: 'U-T12', desde: 120, hasta: 300 }, // Elena no re-escanea un buen rato
});

/** Galería asignada a cada trabajador: reparte la cuadrilla entre sus galerías. */
export function asignarGalerias(cuadrillas) {
  const asignacion = new Map();
  for (const c of cuadrillas) {
    c.trabajadorIds.forEach((id, i) => asignacion.set(id, c.galeriaIds[i % c.galeriaIds.length]));
  }
  return asignacion;
}

/**
 * @param {{ cuadrillas: object[], galerias: object[], azar: () => number, minutosEntreReescaneos?: number }} datos
 * @returns {Array<{ minuto: number, tipo: string, [k: string]: any }>} ordenado por minuto
 */
export function planificarTurno({ cuadrillas, galerias, azar, minutosEntreReescaneos = 30 }) {
  const eventos = [];
  const asignacion = asignarGalerias(cuadrillas);
  const agregar = (minuto, tipo, datos = {}) => eventos.push({ minuto: Math.round(minuto * 10) / 10, tipo, ...datos });

  // Trabajadores: entran escalonados, van a su frente y re-escanean cada tanto.
  for (const [usuarioId, galeriaId] of asignacion) {
    const entrada = 1 + azar() * 14;
    agregar(entrada, 'ir', { usuarioId, destino: { tipo: 'frente', galeriaId } });
    for (let m = entrada + 40; m < GUION.salidaFinal.minuto; m += minutosEntreReescaneos + azar() * 6) {
      const { usuarioId: callado, desde, hasta } = GUION.sinSenal;
      if (usuarioId === callado && m > desde && m < hasta) continue;
      agregar(m, 'reescanear', { usuarioId });
    }
    agregar(GUION.salidaFinal.minuto + azar() * 10, 'ir', { usuarioId, destino: { tipo: 'boca' } });
  }

  // Cargas: cada cuadrilla saca una cada ~50 min de cada galería suya.
  for (const c of cuadrillas) {
    let n = 0;
    for (let m = 15 + azar() * 10; m < 430; m += 45 + azar() * 15) {
      const galeriaId = c.galeriaIds[n % c.galeriaIds.length];
      const guion = c.id === GUION.cargaSospechosa.cuadrillaId && n === 0;
      agregar(guion ? GUION.cargaSospechosa.minuto : m, 'carga', {
        cuadrillaId: c.id,
        galeriaId,
        pesoInicial: Math.round(780 + azar() * 260),
        perdidaGuion: guion ? GUION.cargaSospechosa.perdida : null,
      });
      n++;
    }
  }

  // Avances de excavación: uno por hora en cada galería, sin pasar la velocidad máxima.
  for (const g of galerias) {
    for (let m = 45; m < 450; m += 60) agregar(m + azar() * 10, 'avance', { galeriaId: g.id, fraccion: 0.7 / 8 });
  }

  // Guion de seguridad.
  agregar(GUION.amarillo.minuto, 'guion-amarillo', { galeriaId: GUION.amarillo.galeriaId });
  agregar(GUION.reaperturaAmarillo.minuto, 'guion-reapertura', { galeriaId: GUION.amarillo.galeriaId });
  agregar(GUION.rojo.minuto, 'guion-rojo', { galeriaId: GUION.rojo.galeriaId });
  agregar(MINUTOS_TURNO, 'fin');

  return eventos.sort((a, b) => a.minuto - b.minuto);
}
