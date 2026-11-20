// Productividad por turno, cuadrilla y trabajador (sección 3.6 de CLAUDE.md).

const MS_POR_HORA = 60 * 60 * 1000;

/** Peso registrado en el acopio (kg) o null si la carga todavía no llegó. */
export function pesoEnAcopio(carga, nodosPorId) {
  const pesaje = (carga.pesajes ?? []).find((p) => nodosPorId.get(p.nodoId)?.tipo === 'acopio');
  return pesaje ? pesaje.peso : null;
}

/** Producción de una cuadrilla (kg) = suma del peso de sus cargas al llegar al acopio. */
export function produccionCuadrilla(cargas, cuadrillaId, nodosPorId) {
  return cargas
    .filter((c) => c.cuadrillaId === cuadrillaId)
    .reduce((total, c) => total + (pesoEnAcopio(c, nodosPorId) ?? 0), 0);
}

/** Producción por trabajador = producción de la cuadrilla / cantidad de trabajadores. */
export function produccionPorTrabajador(produccion, cantidadTrabajadores) {
  return cantidadTrabajadores > 0 ? produccion / cantidadTrabajadores : 0;
}

/**
 * Horas efectivas de un trabajador: tiempo entre el escaneo de entrada a un
 * frente y el siguiente escaneo en otro punto (la salida del frente). Si sigue
 * en el frente, cuenta hasta `hasta`.
 * @param {object[]} escaneos todos los escaneos
 * @param {{ desde?: number, hasta: number }} periodo
 */
export function horasEfectivas(escaneos, usuarioId, nodosPorId, { desde = -Infinity, hasta }) {
  const propios = escaneos
    .filter((e) => e.usuarioId === usuarioId && e.timestamp >= desde && e.timestamp <= hasta)
    .sort((a, b) => a.timestamp - b.timestamp);
  let ms = 0;
  let entrada = null;
  let frenteActual = null;
  for (const e of propios) {
    const esFrente = nodosPorId.get(e.nodoId)?.tipo === 'frente';
    if (entrada !== null && e.nodoId !== frenteActual) {
      ms += e.timestamp - entrada;
      entrada = null;
      frenteActual = null;
    }
    if (esFrente && entrada === null) {
      entrada = e.timestamp;
      frenteActual = e.nodoId;
    }
  }
  if (entrada !== null) ms += Math.max(0, hasta - entrada);
  return ms / MS_POR_HORA;
}

/** Toneladas por hora efectiva (null si no hubo horas efectivas). */
export function toneladasPorHora(kg, horas) {
  return horas > 0 ? kg / 1000 / horas : null;
}

/**
 * Productividad de cada cuadrilla y de cada trabajador en un período.
 * @param {{ cargas, cuadrillas, escaneos, nodosPorId, desde?: number, hasta: number }} datos
 * @returns {{ cuadrillas: object[], trabajadores: object[] }}
 */
export function calcularProductividad({ cargas, cuadrillas, escaneos, nodosPorId, desde, hasta }) {
  const porCuadrilla = cuadrillas.map((c) => {
    const kg = produccionCuadrilla(cargas, c.id, nodosPorId);
    const trabajadores = c.trabajadorIds.map((usuarioId) => {
      const horas = horasEfectivas(escaneos, usuarioId, nodosPorId, { desde, hasta });
      const kgTrabajador = produccionPorTrabajador(kg, c.trabajadorIds.length);
      return {
        usuarioId,
        cuadrillaId: c.id,
        kg: kgTrabajador,
        toneladas: kgTrabajador / 1000,
        horasEfectivas: horas,
        toneladasPorHora: toneladasPorHora(kgTrabajador, horas),
      };
    });
    const horas = trabajadores.reduce((t, x) => t + x.horasEfectivas, 0);
    return {
      cuadrillaId: c.id,
      nombre: c.nombre,
      kg,
      toneladas: kg / 1000,
      porTrabajador: produccionPorTrabajador(kg, c.trabajadorIds.length) / 1000,
      horasEfectivas: horas,
      toneladasPorHora: toneladasPorHora(kg, horas),
      trabajadores,
    };
  });
  return {
    cuadrillas: porCuadrilla,
    trabajadores: porCuadrilla.flatMap((c) => c.trabajadores),
  };
}

/** Ranking de trabajadores por t/hora efectiva (los sin horas van al final). */
export function rankingTrabajadores(trabajadores) {
  return [...trabajadores].sort((a, b) => (b.toneladasPorHora ?? -1) - (a.toneladasPorHora ?? -1));
}

/** Toneladas que llegaron al acopio en cada turno, en orden cronológico. */
export function evolucionPorTurno(cargas, turnos, nodosPorId) {
  return [...turnos]
    .sort((a, b) => a.inicio - b.inicio)
    .map((t) => ({
      turnoId: t.id,
      etiqueta: `${t.fecha} ${t.tipo}`,
      toneladas:
        cargas
          .filter((c) => c.turnoId === t.id)
          .reduce((total, c) => total + (pesoEnAcopio(c, nodosPorId) ?? 0), 0) / 1000,
    }));
}
