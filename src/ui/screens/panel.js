// Panel general (sección 4.2): la situación de la mina de un vistazo.

import { estado } from '../../state.js';
import { evaluarGaleria } from '../../domain/semaforo.js';
import { resumenDelPanel } from '../../servicios/productividad.js';
import { alertasActivas } from '../components/alertas.js';
import { dibujarMapa } from '../mapa/dibujo.js';
import { datosDelMapa } from './mapa.js';
import { canario } from '../components/canario.js';
import { bateria } from '../components/bateria.js';
import { insigniaEstado } from '../components/estado.js';
import { icono } from '../components/iconos.js';
import { esc, numero, hora, fechaHora, nombreNivel } from '../formato.js';

const ICONO_EVENTO = {
  'cambio-estado': 'panel',
  bloqueo: 'candado',
  desbloqueo: 'llave',
  apuntalamiento: 'galerias',
  fisuras: 'info',
  sospechoso: 'cargas',
  'escaneo-rechazado': 'balizas',
};

function dibujar(contenedor) {
  const r = resumenDelPanel();
  const config = estado.config();
  const alertas = alertasActivas();
  const galerias = estado.listar('galerias').sort((a, b) => b.nivel - a.nivel || a.id.localeCompare(b.id));
  const { contenido, ancho, alto } = dibujarMapa(datosDelMapa(), { prefijo: 'mini', interactivo: false });

  contenedor.innerHTML = `
    <div class="pila panel">
      <section class="tarjeta panel-alertas ${alertas.length ? '' : 'panel-alertas--calma'}" aria-label="Alertas activas">
        ${
          alertas.length
            ? alertas
                .map(
                  (a) => `<a class="panel-alerta panel-alerta--${a.nivel}" href="#/galerias/${a.galeria.id}">
                    ${insigniaEstado(a.nivel)}
                    <span><strong>${esc(a.galeria.nombre)}</strong> · ${nombreNivel(a.galeria.nivel)}${a.galeria.bloqueada ? ' · bloqueada' : ''}</span>
                    <span class="texto-secundario">${a.personas.length} ${a.personas.length === 1 ? 'persona adentro' : 'personas adentro'}</span>
                  </a>`,
                )
                .join('')
            : `<p class="panel-alertas__calma">${icono('canario')} Sin alertas: todas las galerías pueden seguir con la excavación.</p>`
        }
      </section>

      <div class="grilla kpis">
        <a class="tarjeta tarjeta--elevada kpi" href="#/chapas"><p class="etiqueta">${icono('casco')} Personas adentro</p><span class="cifra kpi__cifra">${r.personasAdentro}</span><span class="texto-tenue">ver tablero de chapas</span></a>
        <a class="tarjeta tarjeta--elevada kpi" href="#/productividad"><p class="etiqueta">${icono('productividad')} Producción del turno</p><span class="cifra kpi__cifra">${numero(r.toneladasTurno, 1)}<span class="cifra__unidad">t</span></span><span class="texto-tenue">${r.turno ? `turno ${r.turno.tipo} · ${r.cargasTurno} ${r.cargasTurno === 1 ? 'carga' : 'cargas'}, ${r.cargasEnCamino} en camino` : ''}</span></a>
        <a class="tarjeta tarjeta--elevada kpi" href="#/pureza"><p class="etiqueta">${icono('pureza')} Pureza promedio</p><span class="cifra kpi__cifra">${r.purezaPromedio != null ? numero(r.purezaPromedio, 1) : '—'}<span class="cifra__unidad">%</span></span><span class="texto-tenue">${r.cargasConPureza} cargas medidas en 24 h</span></a>
        <a class="tarjeta tarjeta--elevada kpi ${r.sospechososTurno.length ? 'kpi--alerta' : ''}" href="#/cargas"><p class="etiqueta">${icono('cargas')} Traslados sospechosos</p><span class="cifra kpi__cifra">${r.sospechososTurno.length}</span><span class="texto-tenue">en este turno · tolerancia ${numero(config.toleranciaPerdida, 1)} %</span></a>
      </div>

      <div class="grilla panel-medio">
        <section class="tarjeta pila">
          <div class="fila"><h3 class="tarjeta__titulo" style="margin:0;flex:1">${icono('mapa')} Mina</h3><a href="#/mapa">Abrir mapa →</a></div>
          <a class="mini-mapa" href="#/mapa" aria-label="Abrir el mapa">
            <svg viewBox="0 0 ${ancho} ${alto}" class="mapa" style="aspect-ratio:${ancho}/${alto};cursor:pointer">${contenido}</svg>
          </a>
        </section>
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('galerias')} Estado de las galerías</h3>
          <ul class="lista-galerias">
            ${galerias
              .map((g) => {
                const ev = evaluarGaleria(g, config);
                const nivel = g.bloqueada ? 'rojo' : ev.estado;
                return `<li><a href="#/galerias/${g.id}" class="fila-galeria">
                  ${canario(ev.estado, { tamano: 44 })}
                  <span class="fila-galeria__nombre"><strong>${esc(g.nombre)}</strong><span class="texto-tenue">${g.id} · ${nombreNivel(g.nivel)}</span></span>
                  ${insigniaEstado(nivel, g.bloqueada ? { texto: 'CERRADA' } : {})}
                  <span class="fila-galeria__bateria">${bateria(ev.estabilidad, ev.estado)}</span>
                </a></li>`;
              })
              .join('')}
          </ul>
        </section>
      </div>

      <div class="grilla panel-medio">
        <section class="tarjeta pila">
          <div class="fila"><h3 class="tarjeta__titulo" style="margin:0;flex:1">${icono('cargas')} Últimos traslados sospechosos</h3><a href="#/cargas">Historial →</a></div>
          ${
            r.ultimosSospechosos.length
              ? `<ul class="lista-eventos">${r.ultimosSospechosos
                  .map(
                    (e) => `<li class="evento evento--sospechoso"><span class="mono evento__hora">${hora(e.timestamp)}</span>
                      <span><a class="mono" href="#/cargas/${e.codigo}">${e.codigo}</a> · −${numero(e.tramo?.perdida, 0)} kg (${numero(e.tramo?.porcentaje, 1)} %) · ${esc(estado.obtener('cuadrillas', e.cuadrillaId)?.nombre ?? '')}</span></li>`,
                  )
                  .join('')}</ul>`
              : '<p class="texto-tenue">No hay traslados sospechosos.</p>'
          }
        </section>
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('campana')} Últimos eventos</h3>
          ${
            r.ultimosEventos.length
              ? `<ul class="lista-eventos">${r.ultimosEventos
                  .map(
                    (e) => `<li class="evento ${e.estadoNuevo ? `evento--${e.estadoNuevo}` : ''} ${e.tipo === 'sospechoso' ? 'evento--sospechoso' : ''}">
                      ${icono(ICONO_EVENTO[e.tipo] ?? 'panel')}<span class="mono evento__hora">${fechaHora(e.timestamp)}</span><span>${esc(e.detalle)}</span></li>`,
                  )
                  .join('')}</ul>`
              : '<p class="texto-tenue">Todavía no hay eventos.</p>'
          }
        </section>
      </div>
    </div>`;
}

export default {
  render(contenedor) {
    dibujar(contenedor);
    const salir = estado.suscribirse(() => dibujar(contenedor));
    const reloj = setInterval(() => dibujar(contenedor), 60 * 1000);
    return () => {
      salir();
      clearInterval(reloj);
    };
  },
};
