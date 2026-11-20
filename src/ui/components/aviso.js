// Avisos breves (toasts) no bloqueantes.

let zona = null;

function obtenerZona() {
  if (!zona || !zona.isConnected) {
    zona = document.createElement('div');
    zona.className = 'avisos';
    zona.setAttribute('role', 'status');
    zona.setAttribute('aria-live', 'polite');
    document.body.append(zona);
  }
  return zona;
}

/**
 * Muestra un aviso que desaparece solo.
 * @param {string} texto
 * @param {{ tipo?: 'info'|'error', duracion?: number }} [opciones]
 */
export function avisar(texto, { tipo = 'info', duracion = 3500 } = {}) {
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = texto;
  obtenerZona().append(aviso);
  setTimeout(() => aviso.remove(), duracion);
}
