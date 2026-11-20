// Navegación por hash: #/mapa, #/galerias/G3 …
// El router no conoce las pantallas: recibe un registro y llama a su render.

/**
 * Interpreta un hash como ruta + parámetros.
 * '#/galerias/G3' → { ruta: 'galerias', params: ['G3'] }
 * @param {string} hash
 */
export function interpretarHash(hash) {
  const limpio = (hash || '').replace(/^#\/?/, '').split('?')[0];
  const partes = limpio.split('/').filter(Boolean).map(decodeURIComponent);
  return { ruta: partes[0] || '', params: partes.slice(1) };
}

/** Navega a una ruta (actualiza el hash). */
export function navegar(ruta) {
  const destino = ruta.startsWith('#') ? ruta : `#/${ruta.replace(/^\//, '')}`;
  if (location.hash === destino) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = destino;
  }
}

/**
 * Crea el router.
 * @param {{
 *   rutaInicial: string,
 *   resolver: (ruta: string) => object | undefined,
 *   alCambiar: (pantalla: object | undefined, info: {ruta: string, params: string[]}) => void
 * }} opciones
 */
export function crearRouter({ rutaInicial, resolver, alCambiar }) {
  function procesar() {
    const info = interpretarHash(location.hash);
    if (!info.ruta) {
      history.replaceState(null, '', `#/${rutaInicial}`);
      info.ruta = rutaInicial;
    }
    alCambiar(resolver(info.ruta), info);
  }
  window.addEventListener('hashchange', procesar);
  return {
    iniciar: procesar,
    detener: () => window.removeEventListener('hashchange', procesar),
  };
}
