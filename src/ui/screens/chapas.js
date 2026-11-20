// Tablero de chapas (sección 3.3): una chapa por trabajador, agrupadas por
// galería donde está, más la columna "Afuera". Gris "sin señal" según config.

import { estado } from '../../state.js';
import { evaluarGaleria } from '../../domain/semaforo.js';
import { agruparPorGaleria } from '../../domain/ubicacion.js';
import { ubicacionesActuales, nodosPorId } from '../../servicios/ubicacion.js';
import { insigniaEstado } from '../components/estado.js';
import { icono } from '../components/iconos.js';
import { esc, haceCuanto, nombreNivel, numero } from '../formato.js';

function chapa(p, { rescate = false, nodos, cuadrillas }) {
  const cuadrilla = cuadrillas.get(p.usuario.cuadrillaId);
  const lugar = p.adentro ? nodos.get(p.nodoId)?.nombre : null;
  const clases = ['chapa', p.sinSenal ? 'chapa--sin-senal' : '', rescate ? 'chapa--rescate' : '', !p.adentro ? 'chapa--afuera' : '']
    .filter(Boolean)
    .join(' ');
  return `
    <li class="${clases}">
      <span class="chapa__agujero" aria-hidden="true"></span>
      <strong class="chapa__nombre">${esc(p.usuario.nombre)}</strong>
      <span class="chapa__cuadrilla">${esc(cuadrilla?.nombre ?? (p.usuario.rol === 'ingeniero' ? 'Ingeniería' : '—'))}</span>
      ${lugar ? `<span class="chapa__lugar">${icono('balizas')} ${esc(lugar)}</span>` : ''}
      <span class="chapa__tiempo mono">${p.ultimoEscaneo ? haceCuanto(p.minutosDesdeEscaneo) : 'sin escaneos'}</span>
      ${p.sinSenal ? `<span class="chapa__etiqueta">${icono('sin-senal')} sin señal</span>` : ''}
      ${rescate ? `<span class="chapa__etiqueta chapa__etiqueta--rescate">${icono('estado-rojo')} prioridad de rescate</span>` : ''}
    </li>`;
}

function columna({ titulo, subtitulo, insignia, personas, rescate, clase = '', vacio }, ctx) {
  return `
    <section class="columna-chapas ${clase}">
      <header class="columna-chapas__cabeza">
        <div>
          <h3>${titulo}</h3>
          ${subtitulo ? `<span class="texto-tenue">${subtitulo}</span>` : ''}
        </div>
        <span class="columna-chapas__cuenta mono" aria-label="${personas.length} personas">${personas.length}</span>
      </header>
      ${insignia ?? ''}
      ${
        personas.length
          ? `<ul class="chapas">${personas.map((p) => chapa(p, { ...ctx, rescate })).join('')}</ul>`
          : `<p class="texto-tenue columna-chapas__vacia">${vacio ?? 'Nadie'}</p>`
      }
    </section>`;
}

function dibujar(contenedor) {
  const config = estado.config();
  const ubicaciones = ubicacionesActuales().filter((p) => p.usuario.rol !== 'ingeniero' || p.adentro);
  const grupos = agruparPorGaleria(ubicaciones);
  const ctx = {
    nodos: nodosPorId(),
    cuadrillas: new Map(estado.listar('cuadrillas').map((c) => [c.id, c])),
  };
  const adentro = ubicaciones.filter((p) => p.adentro);
  const sinSenal = adentro.filter((p) => p.sinSenal).length;
  const porNombre = (a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre);

  const galerias = estado.listar('galerias').sort((a, b) => b.nivel - a.nivel || a.id.localeCompare(b.id));
  const columnasGalerias = galerias.map((g) => {
    const ev = evaluarGaleria(g, config);
    const nivelEstado = g.bloqueada ? 'rojo' : ev.estado;
    return columna(
      {
        titulo: `${esc(g.nombre)}`,
        subtitulo: `${g.id} · ${nombreNivel(g.nivel)}`,
        insignia: insigniaEstado(nivelEstado, g.bloqueada ? { texto: 'PELIGRO DE DERRUMBE · cerrada' } : {}),
        personas: (grupos.get(g.id) ?? []).sort(porNombre),
        rescate: nivelEstado === 'rojo',
        clase: `columna-chapas--${nivelEstado}`,
      },
      ctx,
    );
  });

  contenedor.innerHTML = `
    <div class="pila">
      <div class="resumen-chapas">
        <div class="tarjeta tarjeta--elevada contador-adentro">
          ${icono('casco')}
          <div><p class="etiqueta">Personas adentro</p><span class="cifra contador-adentro__cifra">${adentro.length}</span></div>
        </div>
        <div class="tarjeta contador-adentro">
          ${icono('sin-senal')}
          <div><p class="etiqueta">Sin señal</p><span class="cifra">${sinSenal}</span>
          <p class="texto-tenue" style="margin:0">Más de ${numero(config.minutosSinSenal, 0)} min sin escanear</p></div>
        </div>
      </div>
      <div class="tablero-chapas">
        ${columnasGalerias.join('')}
        ${columna({ titulo: 'Rampas, cruces y refugios', subtitulo: 'Fuera de las galerías', personas: (grupos.get(null) ?? []).sort(porNombre) }, ctx)}
        ${columna({ titulo: 'Afuera', subtitulo: 'Chapas en el tablero', personas: ubicaciones.filter((p) => !p.adentro).sort(porNombre), clase: 'columna-chapas--afuera', vacio: 'Todos están adentro' }, ctx)}
      </div>
    </div>`;
}

export default {
  render(contenedor) {
    dibujar(contenedor);
    const salir = estado.suscribirse(() => dibujar(contenedor), ['escaneos', 'usuarios', 'galerias', 'config', 'nodos', 'cuadrillas']);
    const reloj = setInterval(() => dibujar(contenedor), 30 * 1000); // "hace cuánto" y "sin señal"
    return () => {
      salir();
      clearInterval(reloj);
    };
  },
};
