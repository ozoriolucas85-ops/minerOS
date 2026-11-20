import { icono } from '../components/iconos.js';

/**
 * Pantalla provisoria: muestra solo el título y qué va a contener.
 * Se reemplaza por la pantalla real en su fase.
 */
export function pantallaVacia({ titulo, icono: nombreIcono, descripcion, fase }) {
  return {
    render(contenedor) {
      contenedor.innerHTML = `
        <div class="vacio">
          ${icono(nombreIcono)}
          <h2>${titulo}</h2>
          <p>${descripcion}</p>
          <span class="chip chip--marca">Se construye en la fase ${fase}</span>
        </div>`;
    },
  };
}
