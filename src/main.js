// Arranque de la aplicación: estilos, cáscara, sesión y router.
import './styles/index.css';
import { crearRouter, navegar } from './router.js';
import { montarShell } from './ui/shell.js';
import { pantallas, buscarPantalla } from './ui/screens/index.js';
import { estado } from './state.js';
import { crearStorage } from './storage/index.js';
import { montarAlertas } from './ui/components/alertas.js';
import { montarBarraSimulador } from './ui/components/barraSimulador.js';
import { avisar } from './ui/components/aviso.js';
import { suscribirseASesion } from './sesion.js';
import { usuarioActual, cerrarSesion, migrarPins } from './servicios/autenticacion.js';
import { puede, pantallaInicial } from './domain/permisos.js';

const shell = montarShell(document.querySelector('#app'), { alSalir: cerrarSesion });

let limpiarPantallaAnterior = null;

/** Pantalla de inicio según el rol (o el ingreso si no hay sesión). */
function inicio() {
  const u = usuarioActual();
  return u ? pantallaInicial(u.rol) : 'ingreso';
}

function pintarMenu() {
  const u = usuarioActual();
  shell.pintarMenu(u ? pantallas.filter((p) => puede(u, `ver:${p.ruta}`)) : [], u, inicio());
}

function mostrarNoEncontrada(contenedor, ruta) {
  contenedor.innerHTML = `
    <div class="vacio">
      <h2>Pantalla no encontrada</h2>
      <p>No existe la sección <span class="mono">#/${ruta}</span>.</p>
      <a class="boton boton--primario" href="#/${inicio()}">Ir al inicio</a>
    </div>`;
}

const router = crearRouter({
  rutaInicial: inicio,
  resolver: buscarPantalla,
  alCambiar(pantalla, { ruta, params }) {
    // Guardia: sin sesión solo el ingreso; con sesión, solo lo que permite el rol.
    const u = usuarioActual();
    if (!u && ruta !== 'ingreso') return navegar('ingreso');
    if (u && ruta === 'ingreso') return navegar(inicio());
    if (u && pantalla && !puede(u, `ver:${pantalla.ruta}`)) {
      avisar(`Tu rol no tiene acceso a ${pantalla.titulo}.`, { tipo: 'error' });
      return navegar(inicio());
    }

    if (typeof limpiarPantallaAnterior === 'function') limpiarPantallaAnterior();
    limpiarPantallaAnterior = null;
    shell.modoIngreso(ruta === 'ingreso');

    const contenedor = shell.contenedor;
    if (!pantalla) {
      shell.activar(ruta, 'No encontrada');
      mostrarNoEncontrada(contenedor, ruta);
      return undefined;
    }
    shell.activar(pantalla.ruta, pantalla.titulo);
    limpiarPantallaAnterior = pantalla.modulo.render(contenedor, { params }) ?? null;
    contenedor.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    return undefined;
  },
});

// Conectar el estado a la persistencia (carga la mina demo la primera vez),
// migrar PINs viejos a hash y recién después mostrar la primera pantalla.
await estado.iniciar(crearStorage('local'));
await migrarPins();
pintarMenu();
montarAlertas(document.querySelector('#banners'));
montarBarraSimulador();
suscribirseASesion((id) => {
  pintarMenu();
  navegar(id ? inicio() : 'ingreso');
});
router.iniciar();
