// Arranque de la aplicación: estilos, cáscara y router.
import './styles/index.css';
import { crearRouter } from './router.js';
import { montarShell } from './ui/shell.js';
import { pantallas, rutaInicial, buscarPantalla } from './ui/screens/index.js';
import { estado } from './state.js';
import { crearStorage } from './storage/index.js';

const shell = montarShell(document.querySelector('#app'), pantallas);

let limpiarPantallaAnterior = null;

function mostrarNoEncontrada(contenedor, ruta) {
  contenedor.innerHTML = `
    <div class="vacio">
      <h2>Pantalla no encontrada</h2>
      <p>No existe la sección <span class="mono">#/${ruta}</span>.</p>
      <a class="boton boton--primario" href="#/${rutaInicial}">Ir al panel</a>
    </div>`;
}

const router = crearRouter({
  rutaInicial,
  resolver: buscarPantalla,
  alCambiar(pantalla, { ruta, params }) {
    if (typeof limpiarPantallaAnterior === 'function') limpiarPantallaAnterior();
    limpiarPantallaAnterior = null;

    const contenedor = shell.contenedor;
    if (!pantalla) {
      shell.activar(ruta, 'No encontrada');
      mostrarNoEncontrada(contenedor, ruta);
      return;
    }
    shell.activar(pantalla.ruta, pantalla.titulo);
    limpiarPantallaAnterior = pantalla.modulo.render(contenedor, { params }) ?? null;
    contenedor.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  },
});

// Conectar el estado a la persistencia (carga la mina demo la primera vez)
// y recién después mostrar la primera pantalla.
await estado.iniciar(crearStorage('local'));
router.iniciar();
