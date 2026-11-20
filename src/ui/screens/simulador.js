// Pantalla Simulador (sección 3.7): un turno de 8 h en ~2 minutos a 20x.

import { simulador } from '../../sim/simulador.js';
import { GUION, MINUTOS_TURNO } from '../../sim/plan.js';
import { estado } from '../../state.js';
import { icono } from '../components/iconos.js';
import { confirmar } from '../components/confirmar.js';
import { avisar } from '../components/aviso.js';
import { esc, hora } from '../formato.js';

const VELOCIDADES = [1, 5, 20];

const HITOS = [
  { minuto: GUION.cargaSospechosa.minuto, texto: 'Carga sospechosa' },
  { minuto: GUION.amarillo.minuto, texto: `${GUION.amarillo.galeriaId} evacuación` },
  { minuto: GUION.reaperturaAmarillo.minuto, texto: `${GUION.amarillo.galeriaId} apuntalada` },
  { minuto: GUION.rojo.minuto, texto: `${GUION.rojo.galeriaId} bloqueada` },
];

const reloj = (minuto) => `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(Math.floor(minuto % 60)).padStart(2, '0')}`;

function duracionReal(v) {
  const s = (MINUTOS_TURNO * 60) / ((estado.config().simulador?.segundosPorSegundo ?? 12) * v);
  return s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`;
}

function dibujar(contenedor, info) {
  const corriendo = info.fase === 'corriendo';
  const textoFase = { detenido: 'Detenido', corriendo: 'Simulando', pausado: 'En pausa', terminado: 'Turno terminado' }[info.fase];
  contenedor.innerHTML = `
    <div class="pila">
      <section class="tarjeta tarjeta--elevada pila simulador">
        <div class="fila simulador__cabeza">
          <div>
            <p class="etiqueta">${textoFase}${info.turno ? ` · turno ${esc(info.turno.tipo)} · inicio ${hora(info.turno.inicio)}` : ''}</p>
            <span class="cifra simulador__reloj">${reloj(info.minuto)}<span class="cifra__unidad">de 08:00</span></span>
          </div>
          <div class="fila">
            <button class="boton boton--primario boton--grande" id="sim-iniciar" ${corriendo ? 'hidden' : ''}>
              ${icono('simulador')} ${info.fase === 'pausado' ? 'Reanudar' : info.fase === 'terminado' ? 'Simular otro turno' : 'Simular turno'}</button>
            <button class="boton boton--secundario boton--grande" id="sim-pausar" ${corriendo ? '' : 'hidden'}>Pausar</button>
          </div>
        </div>
        <div class="progreso-sim" aria-label="Avance del turno" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(info.progreso * 100)}">
          <div class="progreso-sim__relleno" style="width:${info.progreso * 100}%"></div>
          ${HITOS.map((h) => `<span class="progreso-sim__hito ${info.minuto >= h.minuto ? 'progreso-sim__hito--pasado' : ''}" style="left:${(h.minuto / MINUTOS_TURNO) * 100}%"><span>${h.texto}</span></span>`).join('')}
        </div>
        <div class="fila">
          <span class="etiqueta">Velocidad</span>
          <div class="segmentado" role="radiogroup" aria-label="Velocidad">
            ${VELOCIDADES.map((v) => `<button class="segmentado__opcion" role="radio" aria-checked="${info.velocidad === v}" data-velocidad="${v}">${v}x<small>${duracionReal(v)}</small></button>`).join('')}
          </div>
        </div>
      </section>

      <div class="grilla grilla--sim">
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('campana')} Bitácora</h3>
          ${
            info.bitacora.length
              ? `<ul class="bitacora">${info.bitacora
                  .slice(0, 30)
                  .map((b) => `<li class="${b.tipo === 'alerta' ? 'bitacora__alerta' : ''}"><span class="mono">${reloj(b.minuto)}</span><span>${esc(b.texto)}</span></li>`)
                  .join('')}</ul>`
              : '<p class="texto-tenue">Tocá "Simular turno" y recorré el mapa, el tablero de chapas, las galerías y las cargas mientras pasa el turno.</p>'
          }
        </section>
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('info')} Guion de la demo</h3>
          <ol class="guion">
            <li><strong>Al principio:</strong> una carga de la cuadrilla Norte pierde 6 % en un tramo → aparece como sospechosa en Cargas y en el panel.</li>
            <li><strong>A mitad del turno:</strong> ${GUION.amarillo.galeriaId} pasa a amarillo → banner de EVACUACIÓN y alarma; sus trabajadores salen por la ruta y sus chapas vuelven al tablero. Una hora después se apuntala y vuelven.</li>
            <li><strong>Hacia el final:</strong> ${GUION.rojo.galeriaId} llega a rojo → bloqueo, la baliza rechaza escaneos y quien quedó adentro parpadea como prioridad de rescate.</li>
            <li><strong>En vivo:</strong> en la ficha de ${GUION.rojo.galeriaId}, registrá un apuntalamiento y desbloqueala con las dos llaves (ingeniero 1111 + capataz 4444).</li>
          </ol>
          <p class="texto-tenue">Todo lo que genera el simulador queda marcado como simulado y se borra sin tocar los datos reales.</p>
          <div class="fila">
            <button class="boton boton--secundario" id="sim-borrar" ${info.hayDatosSimulados ? '' : 'disabled'}>Borrar datos simulados</button>
            <button class="boton boton--peligro" id="sim-reiniciar">Reiniciar datos demo</button>
          </div>
        </section>
      </div>
    </div>`;

  contenedor.querySelector('#sim-iniciar').addEventListener('click', () => simulador.iniciar());
  contenedor.querySelector('#sim-pausar').addEventListener('click', () => simulador.pausar());
  contenedor.querySelectorAll('[data-velocidad]').forEach((b) => b.addEventListener('click', () => simulador.cambiarVelocidad(Number(b.dataset.velocidad))));
  contenedor.querySelector('#sim-borrar').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Borrar los datos simulados?', mensaje: 'Se borran escaneos, cargas, avances y eventos simulados, y las galerías vuelven a como estaban antes de simular. Los datos reales no se tocan.', aceptar: 'Borrar simulados', peligro: true }))) return;
    await simulador.borrarSimulados();
    avisar('Datos simulados borrados.');
  });
  contenedor.querySelector('#sim-reiniciar').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Reiniciar la demo completa?', mensaje: 'Se borra todo (también lo cargado a mano) y la mina vuelve al estado inicial. No se puede deshacer.', aceptar: 'Reiniciar demo', peligro: true }))) return;
    await simulador.reiniciarDemo();
    avisar('Demo reiniciada.');
  });
}

export default {
  render(contenedor) {
    let ultimo = '';
    const actualizar = (info) => {
      // Redibujar solo si cambió algo visible (evita parpadeos a cada paso).
      const firma = JSON.stringify([info.fase, info.velocidad, Math.floor(info.minuto), info.bitacora.length, info.bitacora[0]?.texto, info.hayDatosSimulados]);
      if (firma === ultimo) return;
      ultimo = firma;
      dibujar(contenedor, info);
    };
    actualizar(simulador.informe());
    const salir = simulador.suscribirse(actualizar);
    const salirEstado = estado.suscribirse(() => actualizar(simulador.informe()));
    return () => {
      salir();
      salirEstado();
    };
  },
};
