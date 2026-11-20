// Pantalla Mapa: corte lateral interactivo de la mina (sección 3.2).
// Fase 5: galerías coloreadas por semáforo, clickeables, bloqueo, zoom y leyenda.

import { estado } from '../../state.js';
import { evaluarGaleria } from '../../domain/semaforo.js';
import { dibujarMapa } from '../mapa/dibujo.js';
import { habilitarZoom } from '../mapa/zoom.js';
import { icono } from '../components/iconos.js';
import { navegar } from '../../router.js';

/** Estado de cada galería para el dibujo (bloqueada cuenta como rojo). */
export function estadosDeGalerias() {
  const config = estado.config();
  return new Map(
    estado.listar('galerias').map((g) => [g.id, g.bloqueada ? 'rojo' : evaluarGaleria(g, config).estado]),
  );
}

export function datosDelMapa() {
  return {
    nodos: estado.listar('nodos'),
    aristas: estado.listar('aristas'),
    galerias: estado.listar('galerias').sort((a, b) => a.id.localeCompare(b.id)),
    estados: estadosDeGalerias(),
  };
}

const leyenda = `
  <ul class="leyenda" aria-label="Leyenda del mapa">
    <li><span class="leyenda__linea leyenda__linea--verde"></span>${icono('estado-verde')} Puede seguir</li>
    <li><span class="leyenda__linea leyenda__linea--amarillo"></span>${icono('estado-amarillo')} Evacuación</li>
    <li><span class="leyenda__linea leyenda__linea--rojo"></span>${icono('estado-rojo')} Peligro de derrumbe</li>
    <li><span class="leyenda__linea leyenda__linea--bloqueada"></span>${icono('candado')} Cerrada</li>
    <li><span class="leyenda__linea leyenda__linea--acceso"></span> Rampa / acceso</li>
    <li><svg viewBox="-20 -50 40 54" class="leyenda__icono" aria-hidden="true"><path class="nodo__castillete" d="M-16 0L-6 -46h12L16 0M-11 -22h22M-8 -34h16"/><circle class="nodo__punto nodo__punto--boca" r="7"/></svg> Boca de mina</li>
    <li><svg viewBox="-16 -16 32 32" class="leyenda__icono" aria-hidden="true"><rect class="nodo__refugio" x="-13" y="-13" width="26" height="26" rx="6"/><path class="nodo__refugio-cruz" d="M0 -7v14M-7 0h14"/></svg> Refugio</li>
    <li><svg viewBox="-32 -32 64 36" class="leyenda__icono" aria-hidden="true"><path class="nodo__pila" d="M-30 0Q-14 -30 0 -30Q14 -30 30 0z"/></svg> Acopio</li>
    <li><svg viewBox="-12 -18 34 36" class="leyenda__icono" aria-hidden="true"><path class="nodo__roca" d="M12 -16l6 5-6 5 6 6-6 5 6 6"/><circle class="nodo__punto" r="7"/></svg> Frente de excavación</li>
    <li><svg viewBox="-10 -10 20 20" class="leyenda__icono" aria-hidden="true"><circle class="nodo__punto" r="6"/></svg> Baliza / cruce</li>
  </ul>`;

export default {
  render(contenedor) {
    contenedor.innerHTML = `
      <div class="pila">
        <div class="mapa-marco">
          <svg class="mapa" id="mapa-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
               aria-label="Corte lateral de la mina"></svg>
          <div class="mapa-controles" role="group" aria-label="Zoom del mapa">
            <button class="boton boton--secundario boton--icono" data-zoom="acercar" aria-label="Acercar">+</button>
            <button class="boton boton--secundario boton--icono" data-zoom="alejar" aria-label="Alejar">−</button>
            <button class="boton boton--secundario boton--icono" data-zoom="restablecer" aria-label="Ver toda la mina">${icono('mapa')}</button>
          </div>
        </div>
        <p class="texto-tenue mapa-ayuda">Tocá una galería para abrir su ficha. Rueda o pellizco para acercar, arrastrá para moverte.</p>
        ${leyenda}
      </div>`;

    const svg = contenedor.querySelector('#mapa-svg');
    const celular = window.matchMedia('(max-width: 767px)');
    let zoom = null;
    let tamano = null;

    // En celular, ventana cuadrada que se desplaza por el corte; en pantallas
    // grandes, el corte completo.
    const relacion = () => (celular.matches ? 1 : tamano.ancho / tamano.alto);
    function ajustarProporcion() {
      svg.style.aspectRatio = String(relacion());
      zoom?.cambiarRelacion(relacion());
    }

    function dibujar() {
      const { contenido, ancho, alto } = dibujarMapa(datosDelMapa());
      svg.innerHTML = contenido;
      tamano = { ancho, alto };
      if (!zoom) {
        svg.style.aspectRatio = String(relacion());
        zoom = habilitarZoom(svg, { ancho, alto, relacion: relacion() });
      } else zoom.redimensionar(ancho, alto);
    }
    celular.addEventListener('change', ajustarProporcion);

    function abrirGaleria(e) {
      const g = e.target.closest('[data-galeria]');
      if (g) navegar(`galerias/${g.dataset.galeria}`);
    }
    svg.addEventListener('click', abrirGaleria);
    svg.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-galeria]')) {
        e.preventDefault();
        abrirGaleria(e);
      }
    });
    contenedor.querySelector('.mapa-controles').addEventListener('click', (e) => {
      const accion = e.target.closest('[data-zoom]')?.dataset.zoom;
      if (accion) zoom[accion]();
    });

    dibujar();
    const salir = estado.suscribirse(dibujar, ['galerias', 'nodos', 'aristas', 'config']);
    return () => {
      salir();
      celular.removeEventListener('change', ajustarProporcion);
      zoom?.destruir();
    };
  },
};
