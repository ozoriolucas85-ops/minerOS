import { describe, it, expect, beforeAll } from 'vitest';
import { estado } from '../src/state.js';
import { crearAlmacenLocal } from '../src/storage/local.js';
import { crearSimulador } from '../src/sim/simulador.js';
import { planificarTurno, asignarGalerias, GUION, MINUTOS_TURNO } from '../src/sim/plan.js';
import { reiniciarReloj, desfaseActual } from '../src/reloj.js';
import { crearAzar, crearSeed } from '../src/data/seed.js';
import { ubicacionesActuales } from '../src/servicios/ubicacion.js';
import { evaluarGaleria } from '../src/domain/semaforo.js';
import { crearAlmacenFalso } from './ayudas.js';
import { cambiarUsuario } from '../src/sesion.js';

describe('plan del turno', () => {
  const seed = crearSeed({ ahora: 0 });
  const plan = planificarTurno({ cuadrillas: seed.cuadrillas, galerias: seed.galerias, azar: crearAzar(7) });

  it('está ordenado, dura 8 h y trae el guion', () => {
    for (let i = 1; i < plan.length; i++) expect(plan[i].minuto).toBeGreaterThanOrEqual(plan[i - 1].minuto);
    expect(plan.at(-1)).toMatchObject({ minuto: MINUTOS_TURNO, tipo: 'fin' });
    expect(plan.filter((e) => e.tipo.startsWith('guion-')).map((e) => e.tipo)).toEqual(['guion-amarillo', 'guion-reapertura', 'guion-rojo']);
    expect(plan.find((e) => e.tipo === 'carga' && e.perdidaGuion)).toMatchObject({ cuadrillaId: 'CU-NORTE', perdidaGuion: 0.06 });
  });

  it('reparte cada cuadrilla entre sus galerías', () => {
    const a = asignarGalerias(seed.cuadrillas);
    expect(a.get('U-T10')).toBe('G5');
    expect(a.get('U-T11')).toBe('G6');
    expect([...a.values()].filter((g) => g === 'G3')).toHaveLength(3);
  });

  it('la persona del guion "sin señal" no re-escanea en su ventana', () => {
    const { usuarioId, desde, hasta } = GUION.sinSenal;
    expect(plan.some((e) => e.tipo === 'reescanear' && e.usuarioId === usuarioId && e.minuto > desde && e.minuto < hasta)).toBe(false);
  });
});

describe('simulador: un turno completo', () => {
  const sim = crearSimulador();
  const registro = {};

  beforeAll(async () => {
    globalThis.localStorage = crearAlmacenFalso();
    cambiarUsuario('U-ING');
    reiniciarReloj();
    await estado.iniciar(crearAlmacenLocal({ almacen: crearAlmacenFalso(), ventana: null }));
    registro.galeriasAntes = JSON.stringify(estado.listar('galerias').sort((a, b) => a.id.localeCompare(b.id)));
    registro.escaneosReales = estado.listar('escaneos').length;
    await sim.iniciar();
    sim.pausar(); // sin temporizador: el test avanza el reloj a mano
    for (let m = 0; m < 230; m += 5) await sim.avanzarMinutos(5);
    registro.g3Antes = evaluarGaleria(estado.obtener('galerias', 'G3'), estado.config()).estado;
    for (let m = 230; m < 275; m += 5) await sim.avanzarMinutos(5);
    registro.enG3TrasEvacuar = ubicacionesActuales().filter((p) => p.adentro && p.galeriaId === 'G3').length;
    for (let m = 275; m < 430; m += 5) await sim.avanzarMinutos(5);
    registro.rescateEnG5 = ubicacionesActuales().filter((p) => p.adentro && p.galeriaId === 'G5').length;
    for (let m = 430; m <= 490; m += 5) await sim.avanzarMinutos(5);
  }, 60000);

  it('termina el turno', () => {
    expect(sim.informe().fase).toBe('terminado');
  });

  it('una carga de la cuadrilla Norte pierde 6 % en un tramo (sospechosa)', () => {
    const ev = estado.listar('eventos', (e) => e.tipo === 'sospechoso');
    expect(ev.length).toBeGreaterThanOrEqual(1);
    expect(ev[0]).toMatchObject({ cuadrillaId: 'CU-NORTE', simulado: true });
    expect(ev[0].tramo.porcentaje).toBeCloseTo(6, 0);
  });

  it('G3 pasa de verde a amarillo a mitad del turno y su gente evacúa', () => {
    expect(registro.g3Antes).toBe('verde');
    const cambio = estado.listar('eventos', (e) => e.tipo === 'cambio-estado' && e.galeriaId === 'G3' && e.estadoNuevo === 'amarillo');
    expect(cambio.length).toBeGreaterThanOrEqual(1);
    expect(registro.enG3TrasEvacuar).toBe(0);
  });

  it('G5 llega a rojo hacia el final, queda bloqueada y alguien queda como prioridad de rescate', () => {
    expect(estado.obtener('galerias', 'G5').bloqueada).toBe(true);
    expect(estado.listar('eventos', (e) => e.tipo === 'bloqueo' && e.galeriaId === 'G5')).toHaveLength(1);
    expect(registro.rescateEnG5).toBeGreaterThanOrEqual(1);
  });

  it('genera cargas que llegan al acopio, avances y movimientos, todo marcado como simulado', () => {
    const cargas = estado.listar('cargas', (c) => c.simulado);
    expect(cargas.length).toBeGreaterThan(10);
    expect(cargas.some((c) => c.pesajes.at(-1)?.nodoId === 'ACOPIO')).toBe(true);
    expect(estado.listar('avances', (a) => a.simulado).length).toBeGreaterThan(20);
    expect(estado.listar('escaneos', (e) => e.simulado).length).toBeGreaterThan(50);
    expect(estado.listar('turnos', (t) => t.simulado)).toHaveLength(1);
  });

  it('al final todos salieron, incluso desde la galería cerrada', () => {
    expect(ubicacionesActuales().filter((p) => p.adentro)).toEqual([]);
  });

  it('borrar los datos simulados deja todo como estaba', async () => {
    await sim.borrarSimulados();
    for (const c of ['escaneos', 'avances', 'cargas', 'eventos', 'turnos', 'desbloqueos']) {
      expect(estado.listar(c, (o) => o.simulado)).toEqual([]);
    }
    expect(estado.listar('escaneos').length).toBe(registro.escaneosReales);
    expect(JSON.stringify(estado.listar('galerias').sort((a, b) => a.id.localeCompare(b.id)))).toBe(registro.galeriasAntes);
    expect(desfaseActual()).toBe(0);
    expect(sim.informe().fase).toBe('detenido');
  });
});
