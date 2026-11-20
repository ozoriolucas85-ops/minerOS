// Dibujo del mapa en corte lateral ("corte geológico", aprobado en la fase 5).
// Todo sale de los datos (nodos, aristas, galerías): no hay dibujo fijo.
// Los colores vienen de CSS (styles/mapa.css + tokens), acá solo hay clases.

import { ESTADOS } from '../../domain/semaforo.js';
import { esc, nombreNivel } from '../formato.js';
import {
  alturaSuperficie,
  limitesDelMapa,
  nivelesDelMapa,
  limitesDeEstratos,
  ladoDelFrente,
  puntoMedio,
  extensionDeGaleria,
  posicionesDePersonas,
  trazoDeCamino,
} from './geometria.js';

const SIMBOLO = { verde: '✓', amarillo: '!', rojo: '✕' };

/** Línea ondulada de lado a lado (límite entre estratos). */
function onda(y, ancho, amplitud, fase = 0) {
  const paso = ancho / 4;
  let d = `M0 ${y}`;
  for (let i = 0; i < 4; i++) {
    const sentido = (i + fase) % 2 === 0 ? -1 : 1;
    d += ` Q${paso * i + paso / 2} ${y + sentido * amplitud} ${paso * (i + 1)} ${y}`;
  }
  return d;
}

function definiciones(p) {
  return `
    <defs>
      <linearGradient id="${p}-cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="mapa__cielo-alto" /><stop offset="1" class="mapa__cielo-bajo" />
      </linearGradient>
      <pattern id="${p}-grano" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="1.2" class="mapa__grano-oscuro" />
        <circle cx="12" cy="11" r="1.6" class="mapa__grano-claro" />
        <circle cx="8" cy="15" r="0.9" class="mapa__grano-oscuro" />
      </pattern>
      <pattern id="${p}-rayado" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="10" class="mapa__rayado" />
      </pattern>
    </defs>`;
}

function fondo(p, { ancho, alto, superficie, niveles }) {
  const limites = limitesDeEstratos(superficie, niveles, alto);
  const estratos = limites
    .map((y, i) => `<path class="mapa__estrato mapa__estrato--${Math.min(i + 1, 4)}" d="${onda(y, ancho, 8 + (i % 3) * 3, i)} V${alto} H0Z" />`)
    .join('');
  // Veta de mineral decorativa entre el primer y el segundo nivel.
  const yVeta = niveles.length > 1 ? (niveles[0].y + niveles[1].y) / 2 + 20 : superficie + 120;
  const veta = `<path class="mapa__veta" d="M0 ${yVeta + 10} Q${ancho * 0.25} ${yVeta - 25} ${ancho * 0.5} ${yVeta + 20} T${ancho} ${yVeta - 20} V${yVeta + 25} Q${ancho * 0.75} ${yVeta + 60} ${ancho * 0.5} ${yVeta + 55} T0 ${yVeta + 45}Z" />`;
  const terreno = onda(superficie, ancho, 4, 1);
  return `
    <g class="mapa__fondo" aria-hidden="true">
      <rect width="${ancho}" height="${superficie + 10}" fill="url(#${p}-cielo)" />
      <path class="mapa__terreno" d="${terreno} V${alto} H0Z" />
      ${estratos}
      ${veta}
      <rect y="${superficie}" width="${ancho}" height="${alto - superficie}" fill="url(#${p}-grano)" />
      <path class="mapa__borde-terreno" d="${terreno}" />
    </g>`;
}

function guiasDeNivel(niveles, ancho) {
  return `
    <g class="mapa__niveles" aria-hidden="true">
      ${niveles
        .map(
          (n) => `<path class="mapa__guia" d="M58 ${n.y}H${ancho}" />
          <text class="mapa__nivel" x="10" y="${n.y + 4}">${String(n.nivel).replace('-', '−')} m</text>`,
        )
        .join('')}
    </g>`;
}

const trazo = (p, q) => `M${p.x} ${p.y}L${q.x} ${q.y}`;

function iconoNodo(n, nodosPorId, aristas) {
  const { x, y } = n;
  const titulo = `<title>${esc(n.nombre)}</title>`;
  switch (n.tipo) {
    case 'boca':
      return `<g class="nodo nodo--boca" transform="translate(${x} ${y})" data-nodo="${n.id}">${titulo}
          <path class="nodo__castillete" d="M-16 0L-6 -46h12L16 0M-11 -22h22M-8 -34h16" />
          <circle class="nodo__luz" cy="-46" r="5" />
          <circle class="nodo__punto nodo__punto--boca" r="9" />
        </g>
        <text class="mapa__etiqueta mapa__etiqueta--fuerte" x="${x}" y="${y - 58}" text-anchor="middle">${esc(n.nombre)}</text>`;
    case 'acopio':
      return `<g class="nodo nodo--acopio" transform="translate(${x} ${y})" data-nodo="${n.id}">${titulo}
          <path class="nodo__pila" d="M-30 0Q-14 -30 0 -30Q14 -30 30 0z" />
          <circle class="nodo__punto" r="7" />
        </g>
        <text class="mapa__etiqueta" x="${x}" y="${y - 38}" text-anchor="middle">${esc(n.nombre)}</text>`;
    case 'refugio':
      return `<g class="nodo nodo--refugio" transform="translate(${x} ${y})" data-nodo="${n.id}">${titulo}
          <rect class="nodo__refugio" x="-14" y="-14" width="28" height="28" rx="7" />
          <path class="nodo__refugio-cruz" d="M0 -7v14M-7 0h14" />
        </g>
        <text class="mapa__etiqueta" x="${x + 22}" y="${y + 5}">${esc(n.nombre)}</text>`;
    case 'frente': {
      const lado = ladoDelFrente(n, nodosPorId, aristas);
      const dx = lado * 12;
      return `<g class="nodo nodo--frente" transform="translate(${x} ${y})" data-nodo="${n.id}">${titulo}
          <path class="nodo__roca" d="M${dx} -16l${lado * 6} 5-${lado * 6} 5 ${lado * 6} 6-${lado * 6} 5 ${lado * 6} 6" />
          <circle class="nodo__punto" r="7" />
        </g>`;
    }
    default:
      return `<g class="nodo nodo--cruce" transform="translate(${x} ${y})" data-nodo="${n.id}">${titulo}<circle class="nodo__punto" r="6" /></g>`;
  }
}

function grupoGaleria(p, galeria, estado, aristas, nodosPorId, nodos, interactivo) {
  const propias = aristas.filter((a) => a.galeriaId === galeria.id);
  const bloqueada = galeria.bloqueada;
  const lineas = propias
    .map((a) => {
      const d = trazo(nodosPorId.get(a.desde), nodosPorId.get(a.hasta));
      return `<path class="galeria__linea" d="${d}" />${bloqueada ? `<path class="galeria__rayado" d="${d}" stroke="url(#${p}-rayado)" />` : ''}<path class="galeria__zona" d="${d}" />`;
    })
    .join('');
  const cruces = bloqueada
    ? propias
        .map((a) => {
          const m = puntoMedio(nodosPorId.get(a.desde), nodosPorId.get(a.hasta));
          return `<g class="galeria__x" transform="translate(${m.x} ${m.y})"><circle r="14" /><path d="M-6 -6l12 12M6 -6l-12 12" /></g>`;
        })
        .join('')
    : '';
  const ext = extensionDeGaleria(galeria.id, nodos);
  // La etiqueta va del lado del frente de excavación.
  const frente = nodos.find((n) => n.galeriaId === galeria.id && n.tipo === 'frente');
  const derecha = ext && (frente ? frente.x >= ext.maxX : true);
  const etiqueta = ext
    ? `<text class="galeria__nombre" x="${derecha ? ext.maxX : ext.minX}" y="${ext.y - 22}" text-anchor="${derecha ? 'end' : 'start'}">${SIMBOLO[estado]} ${esc(galeria.id)} · ${esc(galeria.nombre)}${bloqueada ? ' · CERRADA' : ''}</text>`
    : '';
  const texto = `${galeria.nombre}, ${nombreNivel(galeria.nivel)}: ${ESTADOS[estado].mensaje}${bloqueada ? ', bloqueada' : ''}`;
  const accesible = interactivo
    ? `role="link" tabindex="0" aria-label="${esc(texto)}. Abrir ficha"`
    : `role="img" aria-label="${esc(texto)}"`;
  return `
    <g id="${p === 'mapa' ? galeria.svgId : `${p}-${galeria.svgId}`}" class="galeria galeria--${estado} ${bloqueada ? 'galeria--bloqueada' : ''}"
       data-galeria="${galeria.id}" ${accesible}>
      <title>${esc(texto)}</title>
      ${lineas}${cruces}${etiqueta}
    </g>`;
}

/**
 * Contenido SVG del mapa.
 * @param {{ nodos, aristas, galerias, estados: Map<string, 'verde'|'amarillo'|'rojo'> }} datos
 * @param {{ prefijo?: string, interactivo?: boolean }} [opciones]
 * @returns {{ contenido: string, ancho: number, alto: number }}
 */
export function dibujarMapa({ nodos, aristas, galerias, estados }, { prefijo = 'mapa', interactivo = true } = {}) {
  const nodosPorId = new Map(nodos.map((n) => [n.id, n]));
  const { ancho, alto } = limitesDelMapa(nodos);
  const superficie = alturaSuperficie(nodos);
  const niveles = nivelesDelMapa(galerias, nodos);
  const tramos = aristas.filter((a) => nodosPorId.has(a.desde) && nodosPorId.has(a.hasta));

  const corte = tramos
    .map((a) => {
      const d = trazo(nodosPorId.get(a.desde), nodosPorId.get(a.hasta));
      return `<path class="tunel__corte" d="${d}" /><path class="tunel__interior" d="${d}" />`;
    })
    .join('');
  const accesos = tramos
    .filter((a) => !a.galeriaId)
    .map((a) => `<path class="tunel__acceso" d="${trazo(nodosPorId.get(a.desde), nodosPorId.get(a.hasta))}" />`)
    .join('');
  const grupos = galerias
    .map((g) => grupoGaleria(prefijo, g, estados.get(g.id) ?? 'verde', tramos, nodosPorId, nodos, interactivo))
    .join('');

  const contenido = `
    ${definiciones(prefijo)}
    ${fondo(prefijo, { ancho, alto, superficie, niveles })}
    ${guiasDeNivel(niveles, ancho)}
    <g class="mapa__tuneles" aria-hidden="true">${corte}${accesos}</g>
    <g class="mapa__galerias">${grupos}</g>
    <g class="mapa__nodos">${nodos.map((n) => iconoNodo(n, nodosPorId, tramos)).join('')}</g>
    <g class="mapa__rutas" id="${prefijo}-rutas"></g>
    <g class="mapa__personas" id="${prefijo}-personas"></g>`;
  return { contenido, ancho, alto };
}

/**
 * Capa de personas: un punto por persona adentro, en su última baliza.
 * @param {Array} personas ubicaciones (solo las que están adentro)
 * @param {{ nodos: object[], seleccionadoId?: string, galeriasEnRojo?: Set<string>, mostrarNombres?: boolean }} opciones
 */
export function dibujarPersonas(personas, { nodos, seleccionadoId = null, galeriasEnRojo = new Set(), mostrarNombres = false }) {
  const nodosPorId = new Map(nodos.map((n) => [n.id, n]));
  const posiciones = posicionesDePersonas(personas, nodosPorId);
  return personas
    .filter((p) => posiciones.has(p.usuario.id))
    .map((p) => {
      const { x, y } = posiciones.get(p.usuario.id);
      const rescate = p.galeriaId && galeriasEnRojo.has(p.galeriaId);
      const clases = ['persona', p.sinSenal ? 'persona--sin-senal' : '', rescate ? 'persona--rescate' : '', p.usuario.id === seleccionadoId ? 'persona--seleccionada' : '']
        .filter(Boolean)
        .join(' ');
      const nombre = p.usuario.nombre.split(' ')[0];
      const estadoTexto = rescate ? ', prioridad de rescate' : p.sinSenal ? ', sin señal' : '';
      return `
        <g class="${clases}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" data-persona="${p.usuario.id}"
           role="button" tabindex="0" aria-label="${esc(p.usuario.nombre)}${estadoTexto}">
          <title>${esc(p.usuario.nombre)}${estadoTexto}</title>
          ${rescate ? '<circle class="persona__pulso" r="9" />' : ''}
          <circle class="persona__punto" r="7" />
          <text class="persona__nombre ${mostrarNombres || p.usuario.id === seleccionadoId ? '' : 'persona__nombre--oculto'}" y="-12" text-anchor="middle">${esc(nombre)}</text>
        </g>`;
    })
    .join('');
}

/**
 * Un camino resaltado sobre los túneles (hilo de Ariadna o ruta de salida).
 * @param {'hilo'|'vuelta'|'salida'} tipo
 */
export function dibujarCamino(camino, nodos, tipo) {
  const nodosPorId = new Map(nodos.map((n) => [n.id, n]));
  const d = trazoDeCamino(camino, nodosPorId);
  if (!d) return '';
  const fin = nodosPorId.get(camino.at(-1));
  const inicio = nodosPorId.get(camino[0]);
  return `
    <g class="camino camino--${tipo}">
      <path class="camino__halo" d="${d}" />
      <path class="camino__linea" d="${d}" />
      ${inicio ? `<circle class="camino__inicio" cx="${inicio.x}" cy="${inicio.y}" r="6" />` : ''}
      ${fin ? `<circle class="camino__fin" cx="${fin.x}" cy="${fin.y}" r="11" />` : ''}
    </g>`;
}
