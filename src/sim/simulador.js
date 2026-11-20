// Simulador de turno (sección 3.7). Ejecuta el plan con un reloj acelerado y
// llama a los MISMOS servicios que usa una persona (escaneos, cargas, pesajes,
// avances, apuntalamientos): no hay atajos. Todo lo que crea lleva simulado: true.

import { estado } from '../state.js';
import { ahora, adelantar, reiniciarReloj } from '../reloj.js';
import { crearAzar } from '../data/seed.js';
import { aplicarAvance, evaluarGaleria } from '../domain/semaforo.js';
import { estadoDePersona, escaneosDe } from '../domain/ubicacion.js';
import { crearGrafo, bfs } from '../domain/rutas.js';
import { registrarEscaneo } from '../servicios/escaneos.js';
import { registrarAvance, registrarApuntalamiento } from '../servicios/galerias.js';
import { crearCarga, registrarPesaje, puntosDeCarga } from '../servicios/cargas.js';
import { iniciarTurno } from '../servicios/turnos.js';
import { rutaDeSalidaDesde, nodosPorId } from '../servicios/ubicacion.js';
import { planificarTurno, GUION, MINUTOS_TURNO } from './plan.js';

const MINUTO = 60 * 1000;
const CLAVE_RESPALDO = 'canario:sim-respaldo';
const COLECCIONES_SIMULADAS = ['escaneos', 'avances', 'cargas', 'eventos', 'turnos', 'desbloqueos'];
const MINUTOS_POR_TRAMO = 3.5;

/**
 * @param {{ intervalo?: number }} [opciones] milisegundos reales entre pasos
 */
export function crearSimulador({ intervalo = 200 } = {}) {
  let fase = 'detenido'; // detenido | corriendo | pausado | terminado
  let velocidad = 1;
  let turno = null;
  let cola = [];
  let bitacora = [];
  let temporizador = null;
  let ultimoPaso = 0;
  let procesando = false;
  let azar = crearAzar(7);
  const viajes = new Map(); // usuarioId → número de viaje actual (cancela movimientos viejos)
  const suscriptores = new Set();

  const avisar = () => suscriptores.forEach((fn) => fn(informe()));
  const minutoActual = () => (turno ? (ahora() - turno.inicio) / MINUTO : 0);
  const anotar = (texto, tipo = 'info') => {
    bitacora.unshift({ minuto: Math.max(0, minutoActual()), texto, tipo });
    bitacora = bitacora.slice(0, 80);
  };
  const programar = (minuto, tipo, datos = {}) => {
    cola.push({ minuto, tipo, ...datos });
    cola.sort((a, b) => a.minuto - b.minuto);
  };
  const nombre = (usuarioId) => estado.obtener('usuarios', usuarioId)?.nombre ?? usuarioId;

  function informe() {
    return {
      fase,
      velocidad,
      turno,
      minuto: Math.min(MINUTOS_TURNO, Math.max(0, minutoActual())),
      progreso: Math.min(1, Math.max(0, minutoActual() / MINUTOS_TURNO)),
      bitacora: [...bitacora],
      pendientes: cola.length,
      hayDatosSimulados: hayDatosSimulados(),
    };
  }

  function hayDatosSimulados() {
    return COLECCIONES_SIMULADAS.some((c) => estado.listar(c, (o) => o.simulado).length > 0);
  }

  function ubicacion(usuarioId) {
    const nodos = nodosPorId();
    const { adentro, ultimo } = estadoDePersona(escaneosDe(estado.listar('escaneos'), usuarioId), nodos);
    return adentro && ultimo ? ultimo.nodoId : null;
  }

  // ── Acciones (todas pasan por los servicios) ──────────────────

  function irA(usuarioId, destino, minuto) {
    const nodos = estado.listar('nodos');
    const dondeEsta = ubicacion(usuarioId); // null si está afuera
    const desde = dondeEsta ?? 'BOCA';
    let camino;
    if (destino.tipo === 'boca') {
      if (!dondeEsta) return; // ya está afuera
      camino = rutaDeSalidaDesde(desde, { tiposDestino: ['boca'] })?.camino;
    } else {
      const galeria = estado.obtener('galerias', destino.galeriaId);
      if (galeria?.bloqueada) return anotar(`${nombre(usuarioId)} no puede ir a ${galeria.nombre}: está cerrada.`);
      const frente = nodos.find((n) => n.galeriaId === destino.galeriaId && n.tipo === 'frente');
      const bloqueadas = new Set(estado.listar('galerias', (g) => g.bloqueada).map((g) => g.id));
      const grafo = crearGrafo(nodos, estado.listar('aristas'));
      camino = bfs(grafo, desde, (id) => id === frente.id, (p) => !p.galeriaId || !bloqueadas.has(p.galeriaId))?.camino;
    }
    if (!camino) return;
    const viaje = (viajes.get(usuarioId) ?? 0) + 1;
    viajes.set(usuarioId, viaje);
    // Si ya está adentro, el primer nodo es donde está: no lo vuelve a escanear.
    const pasos = dondeEsta ? camino.slice(1) : camino;
    pasos.forEach((nodoId, i) => programar(minuto + (i + (dondeEsta ? 1 : 0)) * MINUTOS_POR_TRAMO, 'escanear', { usuarioId, nodoId, viaje }));
  }

  async function escanear({ usuarioId, nodoId, viaje }) {
    if (viajes.get(usuarioId) !== viaje) return; // movimiento cancelado (p. ej. por evacuación)
    try {
      const r = await registrarEscaneo({ usuarioId, nodoId, ahora: ahora(), simulado: true });
      if (!r.adentro && nodoId === 'BOCA') anotar(`${nombre(usuarioId)} salió por la boca: su chapa volvió al tablero.`);
    } catch (error) {
      anotar(`${nombre(usuarioId)}: ${error.message}`, 'alerta');
      viajes.set(usuarioId, viaje + 1);
    }
  }

  async function reescanear({ usuarioId }) {
    const nodoId = ubicacion(usuarioId);
    const enViaje = cola.some((e) => e.tipo === 'escanear' && e.usuarioId === usuarioId && e.viaje === viajes.get(usuarioId));
    if (!nodoId || enViaje) return;
    try {
      await registrarEscaneo({ usuarioId, nodoId, ahora: ahora(), simulado: true });
    } catch {
      /* galería cerrada: la baliza rechaza el escaneo */
    }
  }

  async function nuevaCarga({ cuadrillaId, galeriaId, pesoInicial, perdidaGuion }, minuto) {
    const galeria = estado.obtener('galerias', galeriaId);
    if (!galeria || galeria.bloqueada || evaluarGaleria(galeria, estado.config()).estado !== 'verde') return;
    const carga = await crearCarga({
      cuadrillaId,
      galeriaId,
      mineral: { G1: 'hierro', G2: 'cobre', G3: 'hierro', G4: 'caliza', G5: 'cobre', G6: 'cuarzo' }[galeriaId] ?? 'hierro',
      volumen: 0.25,
      usuarioId: estado.obtener('cuadrillas', cuadrillaId)?.capatazId,
      ahora: ahora(),
      simulado: true,
    });
    const { recorrido } = puntosDeCarga(carga);
    const puntos = [recorrido[0], recorrido[1], ...recorrido.filter((id) => id === 'BOCA' || id === 'ACOPIO')].filter(Boolean);
    let peso = pesoInicial;
    puntos.forEach((nodoId, i) => {
      if (i > 0) peso = peso * (1 - (perdidaGuion && i === 1 ? perdidaGuion : 0.002 + azar() * 0.008));
      programar(minuto + i * (6 + azar() * 3), 'pesar', { cargaId: carga.id, codigo: carga.codigo, nodoId, peso: Math.round(peso * 10) / 10 });
    });
    anotar(`Carga ${carga.codigo} salió del frente de ${galeria.nombre}.`);
  }

  async function pesar({ cargaId, codigo, nodoId, peso }) {
    try {
      const { tramo } = await registrarPesaje(cargaId, { nodoId, peso, ahora: ahora(), simulado: true });
      if (tramo?.sospechoso) anotar(`Traslado sospechoso ${codigo}: perdió ${tramo.porcentaje.toFixed(1).replace('.', ',')} % en un tramo.`, 'alerta');
    } catch (error) {
      anotar(`${codigo}: ${error.message}`, 'alerta');
    }
  }

  async function avance({ galeriaId, fraccion }, minuto) {
    const galeria = estado.obtener('galerias', galeriaId);
    if (!galeria || galeria.bloqueada) return;
    const config = estado.config();
    if (evaluarGaleria(galeria, config).estado !== 'verde') return; // nadie excava en una galería en alerta
    const metros = Math.round(galeria.velocidadMax * fraccion * 100) / 100;
    const guionRojo = galeriaId === GUION.rojo.galeriaId && minuto > GUION.rojo.minuto - 60;
    const estabilidadDespues = evaluarGaleria(aplicarAvance(galeria, { metros }, config, 0).galeria, config).estabilidad;
    if (estabilidadDespues < 50 && !guionRojo) {
      await registrarApuntalamiento(galeriaId, { ahora: ahora(), simulado: true, usuarioId: capatazDe(galeriaId) });
      anotar(`Apuntalamiento de rutina en ${galeria.nombre}.`);
    }
    await registrarAvance(galeriaId, { metros, ahora: ahora(), simulado: true, usuarioId: capatazDe(galeriaId) });
  }

  function capatazDe(galeriaId) {
    return estado.listar('cuadrillas').find((c) => c.galeriaIds?.includes(galeriaId))?.capatazId;
  }

  /** Metros que llevan la galería al estado buscado (amarillo ≈ 30 % o rojo). */
  function metrosHasta(galeria, objetivo) {
    const config = estado.config();
    for (let m = 0.05; m < galeria.metrosMax * 3; m += 0.05) {
      const r = aplicarAvance(galeria, { metros: m }, config, 0);
      const e = evaluarGaleria(r.galeria, config);
      if (objetivo === 'amarillo' && e.estado === 'amarillo' && e.estabilidad <= 32) return Math.round(m * 100) / 100;
      if (objetivo === 'rojo' && e.estado === 'rojo') return Math.round(m * 100) / 100;
    }
    return galeria.metrosMax;
  }

  function personasEn(galeriaId) {
    const nodos = nodosPorId();
    return estado
      .listar('usuarios', (u) => u.rol === 'trabajador')
      .map((u) => u.id)
      .filter((id) => {
        const n = ubicacion(id);
        return n && nodos.get(n)?.galeriaId === galeriaId;
      });
  }

  async function guionAmarillo({ galeriaId }, minuto) {
    let galeria = estado.obtener('galerias', galeriaId);
    if (galeria.bloqueada) return;
    if (evaluarGaleria(galeria, estado.config()).estado === 'verde') {
      await registrarAvance(galeriaId, { metros: metrosHasta(galeria, 'amarillo'), ahora: ahora(), simulado: true, usuarioId: capatazDe(galeriaId) });
    }
    galeria = estado.obtener('galerias', galeriaId);
    anotar(`${galeria.nombre} pasó a EVACUACIÓN: sus trabajadores salen por la ruta de salida.`, 'alerta');
    personasEn(galeriaId).forEach((id, i) => irA(id, { tipo: 'boca' }, minuto + 0.5 + i * 0.5));
  }

  async function guionReapertura({ galeriaId }, minuto) {
    const galeria = estado.obtener('galerias', galeriaId);
    if (galeria.bloqueada) return;
    await registrarApuntalamiento(galeriaId, { ahora: ahora(), simulado: true, usuarioId: capatazDe(galeriaId) });
    anotar(`${galeria.nombre} apuntalada: vuelve a verde y la cuadrilla regresa al frente.`);
    const asignados = estado.listar('cuadrillas').flatMap((c) => c.trabajadorIds.filter((id, i) => c.galeriaIds[i % c.galeriaIds.length] === galeriaId));
    asignados.forEach((id, i) => irA(id, { tipo: 'frente', galeriaId }, minuto + 5 + i));
  }

  async function guionRojo({ galeriaId }, minuto) {
    const galeria = estado.obtener('galerias', galeriaId);
    if (galeria.bloqueada) return;
    await registrarAvance(galeriaId, { metros: metrosHasta(galeria, 'rojo'), ahora: ahora(), simulado: true, usuarioId: capatazDe(galeriaId) });
    anotar(`${galeria.nombre}: PELIGRO DE DERRUMBE. Galería bloqueada; desbloqueala con dos llaves desde su ficha.`, 'alerta');
    // Uno queda adentro como prioridad de rescate hasta la salida final; el resto evacúa.
    personasEn(galeriaId).slice(1).forEach((id, i) => irA(id, { tipo: 'boca' }, minuto + 1 + i));
  }

  async function ejecutar(e) {
    switch (e.tipo) {
      case 'ir':
        return irA(e.usuarioId, e.destino, e.minuto);
      case 'escanear':
        return escanear(e);
      case 'reescanear':
        return reescanear(e);
      case 'carga':
        return nuevaCarga(e, e.minuto);
      case 'pesar':
        return pesar(e);
      case 'avance':
        return avance(e, e.minuto);
      case 'guion-amarillo':
        return guionAmarillo(e, e.minuto);
      case 'guion-reapertura':
        return guionReapertura(e, e.minuto);
      case 'guion-rojo':
        return guionRojo(e, e.minuto);
      case 'fin':
        fase = 'terminado';
        detenerTemporizador();
        anotar('Fin del turno simulado. Podés desbloquear la galería en rojo con las dos llaves.');
        return undefined;
      default:
        return undefined;
    }
  }

  /** Ejecuta, en orden, todo lo que ya debería haber pasado. */
  async function procesarPendientes() {
    if (procesando) return;
    procesando = true;
    try {
      while (cola.length && cola[0].minuto <= minutoActual() && fase !== 'terminado') {
        const e = cola.shift();
        try {
          await ejecutar(e);
        } catch (error) {
          anotar(`Error en la simulación (${e.tipo}): ${error.message}`, 'alerta');
        }
      }
    } finally {
      procesando = false;
      avisar();
    }
  }

  function paso() {
    const real = performance.now();
    const dt = real - ultimoPaso;
    ultimoPaso = real;
    const factor = (estado.config().simulador?.segundosPorSegundo ?? 12) * velocidad;
    adelantar(dt * (factor - 1)); // el tiempo real ya avanzó dt: se suma el resto
    procesarPendientes();
  }

  function arrancarTemporizador() {
    detenerTemporizador();
    ultimoPaso = performance.now();
    temporizador = setInterval(paso, intervalo);
  }
  function detenerTemporizador() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }

  return {
    informe,
    suscribirse(fn) {
      suscriptores.add(fn);
      return () => suscriptores.delete(fn);
    },

    /** Empieza un turno simulado (o reanuda uno pausado). */
    async iniciar() {
      if (fase === 'pausado') {
        fase = 'corriendo';
        arrancarTemporizador();
        return avisar();
      }
      if (fase === 'corriendo') return undefined;
      if (!globalThis.localStorage?.getItem(CLAVE_RESPALDO)) {
        globalThis.localStorage?.setItem(CLAVE_RESPALDO, JSON.stringify(estado.listar('galerias')));
      }
      azar = crearAzar(7);
      bitacora = [];
      viajes.clear();
      turno = await iniciarTurno({ inicio: ahora(), simulado: true });
      cola = planificarTurno({
        cuadrillas: estado.listar('cuadrillas'),
        galerias: estado.listar('galerias'),
        azar,
        minutosEntreReescaneos: estado.config().simulador?.minutosEntreReescaneos ?? 30,
      });
      fase = 'corriendo';
      anotar(`Empieza el turno ${turno.tipo} simulado.`);
      arrancarTemporizador();
      return avisar();
    },

    pausar() {
      if (fase !== 'corriendo') return;
      fase = 'pausado';
      detenerTemporizador();
      avisar();
    },

    cambiarVelocidad(v) {
      velocidad = v;
      avisar();
    },

    /** Para tests: avanza el reloj y procesa, sin temporizador. */
    async avanzarMinutos(minutos) {
      adelantar(minutos * MINUTO);
      await procesarPendientes();
      return informe();
    },

    /** Borra todo lo simulado y deja las galerías como estaban antes de simular. */
    async borrarSimulados() {
      detenerTemporizador();
      fase = 'detenido';
      cola = [];
      turno = null;
      bitacora = [];
      for (const c of COLECCIONES_SIMULADAS) await estado.borrarDonde(c, (o) => o.simulado);
      const respaldo = globalThis.localStorage?.getItem(CLAVE_RESPALDO);
      if (respaldo) await estado.guardarVarios('galerias', JSON.parse(respaldo));
      globalThis.localStorage?.removeItem(CLAVE_RESPALDO);
      reiniciarReloj();
      avisar();
    },

    /** Vuelve toda la demo al estado inicial (datos reales incluidos). */
    async reiniciarDemo() {
      detenerTemporizador();
      fase = 'detenido';
      cola = [];
      turno = null;
      bitacora = [];
      globalThis.localStorage?.removeItem(CLAVE_RESPALDO);
      reiniciarReloj();
      await estado.restablecerDemo();
      avisar();
    },
  };
}

/** Simulador único de la aplicación. */
export const simulador = crearSimulador();
