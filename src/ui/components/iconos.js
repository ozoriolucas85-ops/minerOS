// Íconos SVG inline (trazo, 24×24). Heredan el color con currentColor.
// Uso: icono('mapa') → string SVG. Son decorativos (aria-hidden): el texto
// siempre acompaña al ícono.

const trazos = {
  panel: '<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-5"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/><path d="M4 19h16"/>',
  mapa: '<path d="M2 7h20"/><path d="M5 7v4h6v4h8"/><path d="M11 11h5"/><circle cx="5" cy="11" r="1.4"/><circle cx="19" cy="15" r="1.4"/><path d="M3 7l2-3h3l1 3"/><path d="M2 20h20"/>',
  chapas: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><circle cx="6.5" cy="6" r=".8" fill="currentColor"/><circle cx="17.5" cy="6" r=".8" fill="currentColor"/>',
  galerias: '<path d="M3 21V12a9 9 0 0 1 18 0v9"/><path d="M7 21v-8a5 5 0 0 1 10 0v8"/><path d="M2 21h20"/>',
  cargas: '<path d="M3 8h18l-2 8H5z"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/><path d="M7 8l2-3h6l2 3"/>',
  pureza: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/><path d="M9 3l3 6 3-6"/><path d="M12 9v12"/>',
  productividad: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  balizas: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  configuracion: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  simulador: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/><path d="M12 2v3"/>',
  ingreso: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M17 6l3 3"/><path d="M15 8l2 2"/>',
  estilos: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.7 1.7 0 0 1 12 22z"/>',
  mas: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  canario: '<path d="M7 14c0-4 2.5-7 6-7a4 4 0 0 1 4 4l3 1-3 1c0 3-2.5 6-6 6H7l-3 2 1.5-3.5A4 4 0 0 1 7 14z"/><circle cx="14.5" cy="10.5" r=".9" fill="currentColor"/><path d="M9 14c1.5 0 3-.8 4-2"/>',
  casco: '<path d="M3 17h18"/><path d="M5 17v-3a7 7 0 0 1 14 0v3"/><path d="M12 7V4"/><rect x="10" y="9" width="4" height="3" rx="1"/>',
  personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21.5 19"/>',
  campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  silencio: '<path d="M6 16V11a6 6 0 0 1 9.5-4.9"/><path d="M18 11v5l2 2H8"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  candado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  llave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3"/><path d="M16 7l3 3"/>',
  salida: '<path d="M14 4h5v16h-5"/><path d="M10 12h10"/><path d="M6 8l-4 4 4 4"/><path d="M2 12h8"/>',
  // Estados del semáforo
  'estado-verde': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9"/>',
  'estado-amarillo': '<path d="M12 3L2 20h20z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>',
  'estado-rojo': '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><path d="M9 9l6 6M15 9l-6 6"/>',
};

/**
 * Devuelve el SVG del ícono pedido.
 * @param {keyof typeof trazos} nombre
 * @param {{clase?: string, titulo?: string}} [opciones]
 */
export function icono(nombre, opciones = {}) {
  const contenido = trazos[nombre] ?? trazos.mas;
  const clase = opciones.clase ? ` class="${opciones.clase}"` : '';
  const accesible = opciones.titulo
    ? `role="img" aria-label="${opciones.titulo}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg${clase} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${accesible}>${contenido}</svg>`;
}

export const nombresIconos = Object.keys(trazos);
