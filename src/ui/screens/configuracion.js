import { estado } from '../../state.js';
import { confirmar } from '../components/confirmar.js';
import { avisar } from '../components/aviso.js';
import { icono } from '../components/iconos.js';

// Configuración. Fase 2: resumen de datos y "Restablecer demo".
// Los formularios de límites, tolerancias, etc. se agregan en fases siguientes.

const etiquetas = {
  galerias: 'Galerías',
  nodos: 'Balizas',
  aristas: 'Tramos',
  usuarios: 'Usuarios',
  cuadrillas: 'Cuadrillas',
  escaneos: 'Escaneos',
  avances: 'Avances',
  cargas: 'Cargas',
  eventos: 'Eventos',
};

function dibujar(contenedor) {
  const resumen = estado.resumen();
  const config = estado.config();
  contenedor.innerHTML = `
    <div class="pila">
      <section class="tarjeta">
        <h3>${config?.nombreMina ?? 'Mina'}</h3>
        <p class="texto-secundario">Datos guardados en este dispositivo (localStorage).</p>
        <div class="grilla grilla--compacta">
          ${Object.entries(etiquetas)
            .map(
              ([clave, texto]) => `
            <div class="tarjeta tarjeta--elevada">
              <p class="etiqueta">${texto}</p>
              <span class="cifra">${resumen[clave] ?? 0}</span>
            </div>`,
            )
            .join('')}
        </div>
      </section>

      <section class="tarjeta">
        <h3>Datos de demostración</h3>
        <p class="texto-secundario">Restablecer borra todo lo cargado y vuelve a la mina demo inicial: galerías, balizas, cuadrillas y valores por defecto.</p>
        <button class="boton boton--secundario" id="restablecer">${icono('simulador')} Restablecer demo</button>
      </section>
    </div>`;

  contenedor.querySelector('#restablecer').addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: '¿Restablecer la mina demo?',
      mensaje: 'Se van a borrar todos los avances, cargas, escaneos y eventos de este dispositivo. No se puede deshacer.',
      aceptar: 'Restablecer',
      peligro: true,
    });
    if (!ok) return;
    await estado.restablecerDemo();
    avisar('Se restableció la mina demo.');
  });
}

export default {
  render(contenedor) {
    dibujar(contenedor);
    return estado.suscribirse(() => dibujar(contenedor));
  },
};
