// Lector de QR en un diálogo (cámara con html5-qrcode). Devuelve el texto leído,
// o null si se cancela. Si la cámara no está disponible, permite escribir el código.

import { icono } from './iconos.js';

/**
 * @param {{ titulo?: string, ayuda?: string, placeholder?: string }} [opciones]
 * @returns {Promise<string|null>}
 */
export function leerQr({ titulo = 'Escanear código QR', ayuda = 'Apuntá la cámara al código.', placeholder = 'CAN-0001' } = {}) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo dialogo--lector';
    dialogo.innerHTML = `
      <div class="pila">
        <h3 class="dialogo__titulo">${titulo}</h3>
        <p class="texto-secundario">${ayuda}</p>
        <div class="camara" id="lector-dialogo"><p class="texto-tenue">Abriendo la cámara…</p></div>
        <form class="fila" id="lector-manual">
          <input class="entrada entrada--mono" name="codigo" placeholder="${placeholder}" aria-label="Escribir el código" style="flex:1">
          <button class="boton boton--secundario" type="submit">Usar código</button>
        </form>
        <div class="fila dialogo__acciones"><button class="boton boton--fantasma" type="button" id="lector-cancelar">${icono('cerrar')} Cancelar</button></div>
      </div>`;
    document.body.append(dialogo);
    let lector = null;
    let terminado = false;

    async function terminar(valor) {
      if (terminado) return;
      terminado = true;
      try {
        await lector?.stop();
      } catch {
        /* la cámara ya estaba detenida */
      }
      dialogo.close();
      dialogo.remove();
      resolver(valor);
    }

    dialogo.querySelector('#lector-cancelar').addEventListener('click', () => terminar(null));
    dialogo.addEventListener('cancel', (e) => {
      e.preventDefault();
      terminar(null);
    });
    dialogo.querySelector('#lector-manual').addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = e.target.elements.codigo.value.trim();
      if (valor) terminar(valor);
    });
    dialogo.showModal();

    import('html5-qrcode')
      .then(async ({ Html5Qrcode }) => {
        if (terminado) return;
        lector = new Html5Qrcode('lector-dialogo');
        await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (texto) => terminar(texto));
      })
      .catch((error) => {
        const zona = dialogo.querySelector('#lector-dialogo');
        if (zona) zona.innerHTML = `<p class="texto-tenue">No se pudo abrir la cámara (${error?.message ?? error}). Escribí el código abajo.</p>`;
      });
  });
}
