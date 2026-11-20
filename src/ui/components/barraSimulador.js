// Barra flotante del simulador: visible en todas las pantallas mientras corre
// o está en pausa, para seguir la demo desde el mapa, las chapas, etc.

import { simulador } from '../../sim/simulador.js';
import { icono } from './iconos.js';
import { permite } from '../../servicios/permisos.js';
import { usuarioActualId, suscribirseASesion } from '../../sesion.js';

const reloj = (minuto) => `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(Math.floor(minuto % 60)).padStart(2, '0')}`;

export function montarBarraSimulador() {
  const barra = document.createElement('div');
  barra.className = 'barra-sim';
  barra.setAttribute('role', 'region');
  barra.setAttribute('aria-label', 'Simulador de turno');
  document.body.append(barra);
  let firma = '';

  function dibujar(info) {
    const visible = (info.fase === 'corriendo' || info.fase === 'pausado' || info.fase === 'terminado') && permite(usuarioActualId(), 'ver:simulador');
    const nueva = JSON.stringify([visible, info.fase, info.velocidad, Math.floor(info.minuto)]);
    if (nueva === firma) return;
    firma = nueva;
    barra.hidden = !visible;
    if (!visible) return;
    barra.innerHTML = `
      <a class="barra-sim__titulo" href="#/simulador">${icono('simulador')} <span>Simulación</span></a>
      <span class="mono barra-sim__reloj">${reloj(info.minuto)}</span>
      <span class="barra-sim__progreso" aria-hidden="true"><span style="width:${info.progreso * 100}%"></span></span>
      ${info.fase === 'terminado' ? '<span class="barra-sim__fin">fin</span>' : `
        <button class="boton boton--fantasma barra-sim__boton" data-accion="${info.fase === 'corriendo' ? 'pausar' : 'iniciar'}">${info.fase === 'corriendo' ? 'Pausar' : 'Seguir'}</button>
        ${[1, 5, 20].map((v) => `<button class="boton boton--fantasma barra-sim__boton ${info.velocidad === v ? 'barra-sim__boton--activa' : ''}" data-velocidad="${v}" aria-pressed="${info.velocidad === v}">${v}x</button>`).join('')}`}`;
  }

  barra.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    const v = e.target.closest('[data-velocidad]')?.dataset.velocidad;
    if (accion === 'pausar') simulador.pausar();
    if (accion === 'iniciar') simulador.iniciar();
    if (v) simulador.cambiarVelocidad(Number(v));
  });
  dibujar(simulador.informe());
  suscribirseASesion(() => dibujar(simulador.informe()));
  return simulador.suscribirse(dibujar);
}
