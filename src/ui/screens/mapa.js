// Pantalla Mapa: corte lateral interactivo de la mina (sección 3.2).
// Galerías por semáforo (clic → ficha), trabajadores en su última baliza,
// hilo de Ariadna, "Volver por el hilo" y ruta de salida (BFS).

import { estado } from '../../state.js';
import { evaluarGaleria } from '../../domain/semaforo.js';
import { dibujarMapa, dibujarPersonas, dibujarCamino } from '../mapa/dibujo.js';
import { habilitarZoom } from '../mapa/zoom.js';
import { icono } from '../components/iconos.js';
import { navegar } from '../../router.js';
import { ubicacionesActuales, rutaDeSalidaDesde, describirCamino, hiloDe, nodosPorId } from '../../servicios/ubicacion.js';
import { esc, haceCuanto } from '../formato.js';

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
    <li><svg viewBox="-10 -10 20 20" class="leyenda__icono" aria-hidden="true"><circle class="persona__punto" r="7"/></svg> Trabajador</li>
    <li><svg viewBox="-10 -10 20 20" class="leyenda__icono persona--sin-senal" aria-hidden="true"><circle class="persona__punto" r="7"/></svg> Sin señal</li>
    <li><span class="leyenda__linea leyenda__linea--hilo"></span> Hilo de Ariadna</li>
    <li><span class="leyenda__linea leyenda__linea--salida"></span>${icono('salida')} Ruta de salida</li>
  </ul>`;

const TEXTO_MODO = {
  hilo: { titulo: 'Hilo de Ariadna', detalle: 'Recorrido desde que entró, baliza por baliza.' },
  vuelta: { titulo: 'Volver por el hilo', detalle: 'El mismo recorrido, al revés: de donde está hasta la entrada.' },
  salida: { titulo: 'Ruta de salida', detalle: 'Camino más corto a la boca o al refugio más cercano, sin pasar por galerías cerradas.' },
};

export default {
  render(contenedor) {
    contenedor.innerHTML = `
      <div class="mapa-layout">
        <div class="pila mapa-layout__mapa">
          <div class="mapa-marco">
            <svg class="mapa" id="mapa-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
                 aria-label="Corte lateral de la mina"></svg>
            <div class="mapa-controles" role="group" aria-label="Zoom del mapa">
              <button class="boton boton--secundario boton--icono" data-zoom="acercar" aria-label="Acercar">+</button>
              <button class="boton boton--secundario boton--icono" data-zoom="alejar" aria-label="Alejar">−</button>
              <button class="boton boton--secundario boton--icono" data-zoom="restablecer" aria-label="Ver toda la mina">${icono('mapa')}</button>
            </div>
          </div>
          <div class="fila mapa-barra">
            <p class="texto-tenue mapa-ayuda">Tocá una galería para abrir su ficha, o un trabajador para ver su hilo y su salida. Rueda o pellizco para acercar.</p>
            <label class="casilla mapa-nombres"><input type="checkbox" id="mostrar-nombres"> Mostrar nombres</label>
          </div>
          ${leyenda}
        </div>
        <aside class="tarjeta mapa-layout__panel" id="panel-personas" aria-live="polite"></aside>
      </div>`;

    const svg = contenedor.querySelector('#mapa-svg');
    const panel = contenedor.querySelector('#panel-personas');
    const celular = window.matchMedia('(max-width: 767px)');
    let zoom = null;
    let tamano = null;
    let seleccionadoId = null;
    let modo = 'hilo';
    let mostrarNombres = false;

    const relacion = () => (celular.matches ? 1 : tamano.ancho / tamano.alto);
    function ajustarProporcion() {
      svg.style.aspectRatio = String(relacion());
      zoom?.cambiarRelacion(relacion());
    }

    function dibujarBase() {
      const { contenido, ancho, alto } = dibujarMapa(datosDelMapa());
      svg.innerHTML = contenido;
      tamano = { ancho, alto };
      if (!zoom) {
        svg.style.aspectRatio = String(relacion());
        zoom = habilitarZoom(svg, { ancho, alto, relacion: relacion() });
      } else zoom.redimensionar(ancho, alto);
      dibujarCapas();
    }

    function caminoDelModo() {
      if (!seleccionadoId) return null;
      if (modo === 'salida') {
        const p = ubicacionesActuales().find((x) => x.usuario.id === seleccionadoId);
        return p?.adentro ? (rutaDeSalidaDesde(p.nodoId)?.camino ?? null) : null;
      }
      const hilo = hiloDe(seleccionadoId);
      return modo === 'vuelta' ? hilo.vuelta : hilo.camino;
    }

    function dibujarCapas() {
      const nodos = estado.listar('nodos');
      const adentro = ubicacionesActuales().filter((p) => p.adentro);
      if (seleccionadoId && !adentro.some((p) => p.usuario.id === seleccionadoId) && modo === 'salida') modo = 'hilo';
      const enRojo = new Set([...estadosDeGalerias()].filter(([, e]) => e === 'rojo').map(([id]) => id));
      svg.querySelector('#mapa-personas').innerHTML = dibujarPersonas(adentro, { nodos, seleccionadoId, galeriasEnRojo: enRojo, mostrarNombres });
      const camino = caminoDelModo();
      svg.querySelector('#mapa-rutas').innerHTML = camino && camino.length > 1 ? dibujarCamino(camino, nodos, modo) : '';
      dibujarPanel(adentro, enRojo, camino);
    }

    function dibujarPanel(adentro, enRojo, camino) {
      const nodos = nodosPorId();
      const cuadrillas = new Map(estado.listar('cuadrillas').map((c) => [c.id, c.nombre]));
      const seleccionado = seleccionadoId ? ubicacionesActuales().find((p) => p.usuario.id === seleccionadoId) : null;
      const lista = adentro
        .sort((a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre))
        .map((p) => {
          const rescate = p.galeriaId && enRojo.has(p.galeriaId);
          return `<li><button class="persona-fila ${p.usuario.id === seleccionadoId ? 'persona-fila--activa' : ''} ${rescate ? 'persona-fila--rescate' : ''} ${p.sinSenal ? 'persona-fila--sin-senal' : ''}" data-elegir="${p.usuario.id}">
              <span class="persona-fila__punto" aria-hidden="true"></span>
              <span><strong>${esc(p.usuario.nombre)}</strong><br><span class="texto-tenue">${esc(nodos.get(p.nodoId)?.nombre ?? '—')}${p.sinSenal ? ' · sin señal' : ''}${rescate ? ' · rescate' : ''}</span></span>
            </button></li>`;
        })
        .join('');

      let detalle = '';
      if (seleccionado) {
        const textoCamino = camino && camino.length > 1 ? describirCamino(camino) : modo === 'salida' ? 'Está afuera: no necesita ruta de salida.' : 'Todavía no hay recorrido registrado.';
        detalle = `
          <div class="persona-detalle">
            <div class="fila persona-detalle__cabeza">
              <div><h3>${esc(seleccionado.usuario.nombre)}</h3>
                <span class="texto-tenue">${esc(cuadrillas.get(seleccionado.usuario.cuadrillaId) ?? '')} · ${seleccionado.adentro ? esc(nodos.get(seleccionado.nodoId)?.nombre) : 'afuera'} · ${haceCuanto(seleccionado.minutosDesdeEscaneo)}</span></div>
              <button class="boton boton--fantasma boton--icono" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
            </div>
            <div class="selector-modo" role="group" aria-label="Qué mostrar">
              <button class="boton ${modo === 'hilo' ? 'boton--primario' : 'boton--secundario'}" data-modo="hilo" aria-pressed="${modo === 'hilo'}">Hilo de Ariadna</button>
              <button class="boton ${modo === 'vuelta' ? 'boton--primario' : 'boton--secundario'}" data-modo="vuelta" aria-pressed="${modo === 'vuelta'}">Volver por el hilo</button>
              <button class="boton ${modo === 'salida' ? 'boton--primario' : 'boton--secundario'}" data-modo="salida" aria-pressed="${modo === 'salida'}" ${seleccionado.adentro ? '' : 'disabled'}>${icono('salida')} Ruta de salida</button>
            </div>
            <p class="persona-detalle__modo"><strong>${TEXTO_MODO[modo].titulo}:</strong> ${TEXTO_MODO[modo].detalle}</p>
            <p class="persona-detalle__camino camino-texto--${modo}">${esc(textoCamino)}</p>
          </div>`;
      }

      panel.innerHTML = `
        <h3 class="tarjeta__titulo">${icono('personas')} Personas adentro <span class="mono">(${adentro.length})</span></h3>
        ${detalle}
        ${adentro.length ? `<ul class="lista-elegir">${lista}</ul>` : '<p class="texto-tenue">No hay nadie adentro.</p>'}`;
    }

    // Interacción con el mapa: primero personas, después galerías.
    function alActivar(e) {
      const persona = e.target.closest('[data-persona]');
      if (persona) {
        seleccionadoId = persona.dataset.persona === seleccionadoId ? null : persona.dataset.persona;
        modo = 'hilo';
        dibujarCapas();
        return;
      }
      const g = e.target.closest('[data-galeria]');
      if (g) navegar(`galerias/${g.dataset.galeria}`);
    }
    svg.addEventListener('click', alActivar);
    svg.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-persona],[data-galeria]')) {
        e.preventDefault();
        alActivar(e);
      }
    });
    panel.addEventListener('click', (e) => {
      const elegir = e.target.closest('[data-elegir]');
      const boton = e.target.closest('[data-modo]');
      if (elegir) {
        seleccionadoId = elegir.dataset.elegir;
        modo = 'hilo';
      } else if (boton) modo = boton.dataset.modo;
      else if (e.target.closest('[data-cerrar]')) seleccionadoId = null;
      else return;
      dibujarCapas();
    });
    contenedor.querySelector('#mostrar-nombres').addEventListener('change', (e) => {
      mostrarNombres = e.target.checked;
      dibujarCapas();
    });
    contenedor.querySelector('.mapa-controles').addEventListener('click', (e) => {
      const accion = e.target.closest('[data-zoom]')?.dataset.zoom;
      if (accion) zoom[accion]();
    });
    celular.addEventListener('change', ajustarProporcion);

    dibujarBase();
    const salirBase = estado.suscribirse(dibujarBase, ['galerias', 'nodos', 'aristas', 'config']);
    const salirCapas = estado.suscribirse(dibujarCapas, ['escaneos', 'usuarios']);
    const reloj = setInterval(dibujarCapas, 30 * 1000);
    return () => {
      salirBase();
      salirCapas();
      clearInterval(reloj);
      celular.removeEventListener('change', ajustarProporcion);
      zoom?.destruir();
    };
  },
};
