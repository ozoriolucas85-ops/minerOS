/**
 * Diálogo de confirmación propio (no usa confirm() del navegador).
 * @param {{ titulo: string, mensaje: string, aceptar?: string, cancelar?: string, peligro?: boolean }} opciones
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, aceptar = 'Confirmar', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.innerHTML = `
      <form method="dialog" class="pila">
        <h3 class="dialogo__titulo">${titulo}</h3>
        <p class="texto-secundario">${mensaje}</p>
        <div class="fila dialogo__acciones">
          <button class="boton boton--fantasma" value="no">${cancelar}</button>
          <button class="boton ${peligro ? 'boton--peligro' : 'boton--primario'}" value="si">
            ${aceptar}
          </button>
        </div>
      </form>`;
    document.body.append(dialogo);
    dialogo.addEventListener('close', () => {
      resolver(dialogo.returnValue === 'si');
      dialogo.remove();
    });
    dialogo.showModal();
    dialogo.querySelector('[value="no"]').focus();
  });
}
