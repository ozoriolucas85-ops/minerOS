// Mina de demostración "La Esperanza".
import { purezaPorDensidad, purezaManual } from '../domain/pureza.js';
import { hashPin } from '../domain/seguridad.js';

// 3 niveles (−20, −40 y −60 m), 6 galerías, cruces, frentes, 2 refugios, boca
// de mina y acopio. 3 cuadrillas con capataz y 4–5 trabajadores, 1 ingeniero.
//
// Coordenadas (x, y) en un lienzo de 1200 × 600 para el corte lateral:
// la superficie está en y = 80 y cada nivel baja 130 unidades.

/** Valores por defecto de la configuración (sección 3 de CLAUDE.md). */
export const CONFIG_POR_DEFECTO = Object.freeze({
  id: 'general',
  toleranciaPerdida: 3, // % de pérdida por tramo antes de marcar sospechoso
  minutosSinSenal: 40,
  densidades: { caliza: 2.71, cuarzo: 2.65, hierro: 5.2, cobre: 4.2, esteril: 2.6 }, // g/cm³
  limitesPorRoca: {
    dura: { metrosMax: 6, velocidadMax: 3 },
    media: { metrosMax: 4, velocidadMax: 2 },
    blanda: { metrosMax: 2, velocidadMax: 1 },
  },
  umbrales: { verde: 40, rojo: 15 }, // estabilidad > verde → verde; ≤ rojo → rojo
  penalizacionVelocidad: 1.25, // multiplicador del desgaste si se supera la velocidad máx.
  penalizacionFisuras: 20, // puntos de desgaste que suman las fisuras
  // Clasificación de pureza (%) y contraste mínimo de densidad (mineral vs. estéril)
  // para recomendar el modo por densidad; por debajo se sugiere el manual.
  pureza: { alta: 80, media: 50, contrasteMinimo: 0.1 },
  nombreMina: 'Mina La Esperanza',
  // Simulador: a velocidad 1x pasan 12 s de turno por segundo real (8 h en 40 min);
  // 5x → 8 min y 20x → 2 min.
  simulador: { segundosPorSegundo: 12, minutosEntreReescaneos: 30 },
});

export const NIVELES = [
  { nivel: -20, y: 210 },
  { nivel: -40, y: 340 },
  { nivel: -60, y: 470 },
];

const MINUTO = 60 * 1000;

function galeria(id, nombre, nivel, roca, metrosSinApuntalar, config) {
  const limites = config.limitesPorRoca[roca];
  return {
    id,
    nombre,
    nivel,
    roca,
    metrosMax: limites.metrosMax,
    velocidadMax: limites.velocidadMax,
    metrosSinApuntalar,
    avanceTurno: 0,
    hayFisuras: false,
    bloqueada: false,
    svgId: `galeria-${id}`,
  };
}

/**
 * Crea todos los datos de la mina demo.
 * @param {{ ahora?: number }} [opciones] momento de referencia (para tests)
 */
export function crearSeed({ ahora = Date.now() } = {}) {
  const config = structuredClone(CONFIG_POR_DEFECTO);

  // ── Galerías ──────────────────────────────────────────────────
  const galerias = [
    galeria('G1', 'Galería Norte', -20, 'dura', 2, config),
    galeria('G2', 'Galería Oeste', -20, 'media', 1, config),
    galeria('G3', 'Galería Este', -40, 'media', 1.5, config),
    galeria('G4', 'Galería del Pozo', -40, 'blanda', 0.5, config),
    galeria('G5', 'Galería Profunda', -60, 'blanda', 0.8, config),
    galeria('G6', 'Galería de Cuarzo', -60, 'dura', 1, config),
  ];

  // ── Nodos (balizas) ───────────────────────────────────────────
  const [n20, n40, n60] = NIVELES.map((n) => n.y);
  const nodos = [
    // superficie
    { id: 'BOCA', nombre: 'Boca de mina', tipo: 'boca', galeriaId: null, x: 330, y: 80 },
    { id: 'ACOPIO', nombre: 'Acopio', tipo: 'acopio', galeriaId: null, x: 110, y: 80 },
    // nivel −20
    { id: 'C1', nombre: 'Cruce nivel −20', tipo: 'cruce', galeriaId: null, x: 420, y: n20 },
    { id: 'G1-P', nombre: 'Norte · km 1', tipo: 'cruce', galeriaId: 'G1', x: 650, y: n20 },
    { id: 'R1', nombre: 'Refugio 1', tipo: 'refugio', galeriaId: null, x: 650, y: n20 - 46 },
    { id: 'G1-F', nombre: 'Frente Norte', tipo: 'frente', galeriaId: 'G1', x: 900, y: n20 },
    { id: 'G2-F', nombre: 'Frente Oeste', tipo: 'frente', galeriaId: 'G2', x: 130, y: n20 },
    // nivel −40
    { id: 'C2', nombre: 'Cruce nivel −40', tipo: 'cruce', galeriaId: null, x: 540, y: n40 },
    { id: 'G3-P', nombre: 'Este · km 1', tipo: 'cruce', galeriaId: 'G3', x: 800, y: n40 },
    { id: 'G3-F', nombre: 'Frente Este', tipo: 'frente', galeriaId: 'G3', x: 1050, y: n40 },
    { id: 'G4-F', nombre: 'Frente del Pozo', tipo: 'frente', galeriaId: 'G4', x: 230, y: n40 },
    // nivel −60
    { id: 'C3', nombre: 'Cruce nivel −60', tipo: 'cruce', galeriaId: null, x: 660, y: n60 },
    { id: 'G5-P', nombre: 'Profunda · km 1', tipo: 'cruce', galeriaId: 'G5', x: 880, y: n60 },
    { id: 'G5-F', nombre: 'Frente Profunda', tipo: 'frente', galeriaId: 'G5', x: 1110, y: n60 },
    { id: 'G6-P', nombre: 'Cuarzo · km 1', tipo: 'cruce', galeriaId: 'G6', x: 470, y: n60 },
    { id: 'R2', nombre: 'Refugio 2', tipo: 'refugio', galeriaId: null, x: 470, y: n60 + 46 },
    { id: 'G6-F', nombre: 'Frente de Cuarzo', tipo: 'frente', galeriaId: 'G6', x: 270, y: n60 },
  ];

  // ── Aristas (tramos de túnel). galeriaId null = rampa o acceso, sin semáforo ──
  const tramo = (id, desde, hasta, galeriaId = null) => ({ id, desde, hasta, galeriaId });
  const aristas = [
    tramo('A-SUP', 'ACOPIO', 'BOCA'),
    tramo('A-R1', 'BOCA', 'C1'), // rampa principal
    tramo('A-R2', 'C1', 'C2'),
    tramo('A-R3', 'C2', 'C3'),
    tramo('A-G1a', 'C1', 'G1-P', 'G1'),
    tramo('A-G1b', 'G1-P', 'G1-F', 'G1'),
    tramo('A-REF1', 'G1-P', 'R1'),
    tramo('A-G2', 'C1', 'G2-F', 'G2'),
    tramo('A-G3a', 'C2', 'G3-P', 'G3'),
    tramo('A-G3b', 'G3-P', 'G3-F', 'G3'),
    tramo('A-G4', 'C2', 'G4-F', 'G4'),
    tramo('A-G5a', 'C3', 'G5-P', 'G5'),
    tramo('A-G5b', 'G5-P', 'G5-F', 'G5'),
    tramo('A-G6a', 'C3', 'G6-P', 'G6'),
    tramo('A-G6b', 'G6-P', 'G6-F', 'G6'),
    tramo('A-REF2', 'G6-P', 'R2'),
  ];

  // ── Usuarios y cuadrillas. Los PIN de la demo (ver README) se guardan solo
  //    como hash SHA-256 con sal: nunca en texto plano. ──
  const usuarios = [
    { id: 'U-ING', nombre: 'Laura Benítez', rol: 'ingeniero', pin: '1111' },
    { id: 'U-CAP1', nombre: 'Héctor Ramírez', rol: 'capataz', pin: '2222', cuadrillaId: 'CU-NORTE' },
    { id: 'U-CAP2', nombre: 'Marta Quiroga', rol: 'capataz', pin: '3333', cuadrillaId: 'CU-ESTE' },
    { id: 'U-CAP3', nombre: 'Rubén Sosa', rol: 'capataz', pin: '4444', cuadrillaId: 'CU-PROF' },
  ];
  const trabajadoresPorCuadrilla = {
    'CU-NORTE': ['Jorge Medina', 'Carlos Ferreyra', 'Ana Villalba', 'Diego Paz'],
    'CU-ESTE': ['Luis Acosta', 'Pablo Ríos', 'Sofía Herrera', 'Martín Ledesma', 'Raúl Godoy'],
    'CU-PROF': ['Nicolás Vera', 'Ramón Funes', 'Elena Castro', 'Iván Molina'],
  };
  let numero = 1;
  for (const [cuadrillaId, nombres] of Object.entries(trabajadoresPorCuadrilla)) {
    for (const nombre of nombres) {
      const id = `U-T${String(numero).padStart(2, '0')}`;
      usuarios.push({ id, nombre, rol: 'trabajador', pin: String(1000 + numero), cuadrillaId });
      numero++;
    }
  }

  // Reemplaza el PIN de demo por su hash con sal.
  for (const u of usuarios) {
    u.sal = `canario:${u.id}`;
    u.pinHash = hashPin(u.pin, u.sal);
    delete u.pin;
  }

  const cuadrillas = [
    { id: 'CU-NORTE', nombre: 'Cuadrilla Norte', capatazId: 'U-CAP1', galeriaIds: ['G1', 'G2'] },
    { id: 'CU-ESTE', nombre: 'Cuadrilla Este', capatazId: 'U-CAP2', galeriaIds: ['G3', 'G4'] },
    { id: 'CU-PROF', nombre: 'Cuadrilla Profunda', capatazId: 'U-CAP3', galeriaIds: ['G5', 'G6'] },
  ].map((c) => ({
    ...c,
    trabajadorIds: usuarios.filter((u) => u.rol === 'trabajador' && u.cuadrillaId === c.id).map((u) => u.id),
  }));

  // ── Turno actual (mañana, 6 a 14 h del día de referencia) ─────
  const inicioDia = new Date(ahora);
  inicioDia.setHours(0, 0, 0, 0);
  const turnos = [
    {
      id: 'T-ACTUAL',
      fecha: inicioDia.toISOString().slice(0, 10),
      tipo: 'mañana',
      inicio: inicioDia.getTime() + 6 * 60 * MINUTO,
      fin: inicioDia.getTime() + 14 * 60 * MINUTO,
    },
  ];

  // ── Escaneos: algunos trabajadores ya están adentro ───────────
  const recorridos = [
    { usuarioId: 'U-T01', nodos: ['BOCA', 'C1', 'G1-P', 'G1-F'] },
    { usuarioId: 'U-T02', nodos: ['BOCA', 'C1', 'G1-P'] },
    { usuarioId: 'U-T03', nodos: ['BOCA', 'C1', 'G2-F'] },
    { usuarioId: 'U-T05', nodos: ['BOCA', 'C1', 'C2', 'G3-P', 'G3-F'] },
    { usuarioId: 'U-T06', nodos: ['BOCA', 'C1', 'C2', 'G3-P'] },
    { usuarioId: 'U-T07', nodos: ['BOCA', 'C1', 'C2', 'G4-F'] },
    { usuarioId: 'U-T10', nodos: ['BOCA', 'C1', 'C2', 'C3', 'G5-P', 'G5-F'] },
    { usuarioId: 'U-T11', nodos: ['BOCA', 'C1', 'C2', 'C3', 'G6-P', 'G6-F'] },
  ];
  const escaneos = [];
  recorridos.forEach((r, i) => {
    const total = r.nodos.length;
    r.nodos.forEach((nodoId, j) => {
      // el último escaneo es reciente (entre 5 y 25 min atrás)
      const minutosAtras = 5 + i * 2.5 + (total - 1 - j) * 6;
      escaneos.push({
        id: `E-${r.usuarioId}-${j}`,
        usuarioId: r.usuarioId,
        nodoId,
        timestamp: ahora - minutosAtras * MINUTO,
        simulado: false,
      });
    });
  });

  // ── Historia: 5 turnos anteriores con cargas en el acopio ─────
  const historia = crearHistoria({ inicioActual: turnos[0].inicio, cuadrillas, nodos, aristas });
  turnos.unshift(...historia.turnos);
  escaneos.unshift(...historia.escaneos);

  return {
    config: [config],
    usuarios,
    cuadrillas,
    galerias,
    nodos,
    aristas,
    escaneos,
    turnos,
    avances: [],
    cargas: historia.cargas,
    eventos: [],
    desbloqueos: [],
  };
}

// ── Historia de turnos anteriores (para productividad) ──────────────

/** Mineral que se extrae en cada galería de la demo. */
export const MINERAL_POR_GALERIA = Object.freeze({ G1: 'hierro', G2: 'cobre', G3: 'hierro', G4: 'caliza', G5: 'cobre', G6: 'cuarzo' });

/** Generador pseudoaleatorio con semilla: la demo da siempre los mismos números. */
export function crearAzar(semilla = 1) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TIPOS_TURNO = ['mañana', 'tarde', 'noche'];

function caminoHastaBoca(frenteId, nodos, aristas) {
  // BFS simple para no depender de domain/ desde los datos de ejemplo
  const vecinos = new Map(nodos.map((n) => [n.id, []]));
  aristas.forEach((a) => {
    vecinos.get(a.desde)?.push(a.hasta);
    vecinos.get(a.hasta)?.push(a.desde);
  });
  const previo = new Map([[frenteId, null]]);
  const cola = [frenteId];
  while (cola.length) {
    const actual = cola.shift();
    if (actual === 'BOCA') break;
    for (const v of vecinos.get(actual) ?? []) {
      if (!previo.has(v)) {
        previo.set(v, actual);
        cola.push(v);
      }
    }
  }
  const camino = [];
  for (let n = 'BOCA'; n; n = previo.get(n)) camino.unshift(n);
  return camino;
}

function crearHistoria({ inicioActual, cuadrillas, nodos, aristas, cantidad = 5 }) {
  const azar = crearAzar(42);
  const TURNO = 8 * 60 * MINUTO;
  const tipoNodo = new Map(nodos.map((n) => [n.id, n.tipo]));
  const turnos = [];
  const escaneos = [];
  const cargas = [];
  let numeroCarga = 1;
  for (let k = cantidad; k >= 1; k--) {
    const inicio = inicioActual - k * TURNO;
    const fecha = new Date(inicio);
    const indiceTipo = (((Math.round((inicio - inicioActual) / TURNO)) % 3) + 3) % 3;
    const turno = {
      id: `T-H${k}`,
      fecha: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`,
      tipo: TIPOS_TURNO[indiceTipo],
      inicio,
      fin: inicio + TURNO,
    };
    turnos.push(turno);
    cuadrillas.forEach((c) => {
      // Escaneos: entra por la boca, trabaja en un frente, sale por la boca.
      c.trabajadorIds.forEach((usuarioId, i) => {
        const galeriaId = c.galeriaIds[(i + k) % c.galeriaIds.length];
        const frente = nodos.find((n) => n.galeriaId === galeriaId && n.tipo === 'frente');
        const entra = inicio + (10 + azar() * 20) * MINUTO;
        const llegaFrente = entra + (15 + azar() * 10) * MINUTO;
        const dejaFrente = inicio + TURNO - (40 + azar() * 70) * MINUTO;
        const sale = dejaFrente + (15 + azar() * 10) * MINUTO;
        [
          ['BOCA', entra],
          [frente.id, llegaFrente],
          ['BOCA', sale],
        ].forEach(([nodoId, timestamp], j) =>
          escaneos.push({ id: `E-H${k}-${usuarioId}-${j}`, usuarioId, nodoId, timestamp, simulado: false }),
        );
      });
      // Cargas: varias por cuadrilla, pesadas frente → cruces → boca → acopio.
      const cantidadCargas = 4 + Math.floor(azar() * 4);
      for (let n = 0; n < cantidadCargas; n++) {
        const galeriaId = c.galeriaIds[n % c.galeriaIds.length];
        const frente = nodos.find((x) => x.galeriaId === galeriaId && x.tipo === 'frente');
        const puntos = [...caminoHastaBoca(frente.id, nodos, aristas).filter((id) => ['frente', 'cruce', 'boca'].includes(tipoNodo.get(id))), 'ACOPIO'];
        const volumen = 0.25;
        let peso = 780 + azar() * 260;
        let t = inicio + (60 + n * 50 + azar() * 20) * MINUTO;
        const pesajes = puntos.map((nodoId, i) => {
          if (i > 0) {
            peso *= 1 - azar() * 0.012; // pérdidas normales, menores a la tolerancia
            t += (6 + azar() * 6) * MINUTO;
          }
          return { nodoId, peso: Math.round(peso * 10) / 10, timestamp: Math.round(t) };
        });
        // Pureza medida en una de cada dos cargas, con el mismo cálculo que la app.
        const mineral = MINERAL_POR_GALERIA[galeriaId];
        let pureza = null;
        let modoPureza = null;
        if (n % 2 === 0) {
          modoPureza = ['caliza', 'cuarzo'].includes(mineral) ? 'manual' : 'densidad';
          pureza =
            modoPureza === 'densidad'
              ? purezaPorDensidad({ peso: pesajes[0].peso, volumen, mineral }, CONFIG_POR_DEFECTO).pureza
              : purezaManual({ muestra: 500, util: Math.round(280 + azar() * 180) }).pureza;
          pureza = Math.round(pureza * 10) / 10;
        }
        cargas.push({
          id: `car-h${k}-${c.id}-${n}`,
          codigo: `CAN-${String(numeroCarga++).padStart(4, '0')}`,
          cuadrillaId: c.id,
          turnoId: turno.id,
          galeriaId,
          mineral,
          volumen,
          pesajes,
          pureza,
          modoPureza,
          creada: pesajes[0].timestamp,
          simulado: false,
        });
      }
    });
  }
  return { turnos, escaneos, cargas };
}
