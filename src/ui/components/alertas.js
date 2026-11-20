// Banners globales de alerta, visibles en todas las pantallas.
// Amarillo: "EVACUACIÓN" parpadeante + alarma + quién está en esa galería y su ruta de salida.
// Rojo: "PELIGRO DE DERRUMBE" + bloqueo + trabajadores adentro como prioridad de rescate.

import { estado } from '../../state.js';
import { evaluarGaleria, ESTADOS } from '../../domain/semaforo.js';
import { personasEnGaleria } from '../../domain/ubicacion.js';
import { ubicacionesActuales, rutaDeSalidaDesde, describirCamino, nodosPorId } from '../../servicios/ubicacion.js';
import { icono } from './iconos.js';
import { nombreNivel, esc } from '../formato.js';
import { encenderAlarma, apagarAlarma, prepararAlarma, alarmaSonando } from './alarma.js';

/** Galerías en amarillo o rojo, las rojas primero. */
export function alertasActivas() {
  const config = estado.config();
  const ubicaciones = ubicacionesActuales();
  return estado
    .listar('galerias')
    .map((g) => ({ galeria: g, evaluacion: evaluarGaleria(g, config) }))
    .filter(({ galeria, evaluacion }) => evaluacion.estado !== 'verde' || galeria.bloqueada)
    .map((a) => ({
      ...a,
      nivel: a.galeria.bloqueada || a.evaluacion.estado === 'rojo' ? 'rojo' : 'amarillo',
      personas: personasEnGaleria(ubicaciones, a.galeria.id),
    }))
    .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'rojo' ? -1 : 1));
}

function filaPersona(p, nivel) {
  const nodos = nodosPorId();
  const ruta = rutaDeSalidaDesde(p.nodoId);
  const salida = ruta ? describirCamino(ruta.camino) : 'sin ruta de salida disponible';
  return `
    <li class="banner__persona ${nivel === 'rojo' ? 'banner__persona--rescate' : ''}">
      <strong>${esc(p.usuario.nombre)}</strong>
      <span class="texto-secundario">en ${esc(nodos.get(p.nodoId)?.nombre ?? '—')}</span>
      <span class="banner__ruta">${icono('salida')} ${esc(salida)}</span>
    </li>`;
}

function banner({ galeria, nivel, personas }, abiertos) {
  const titulo = ESTADOS[nivel].mensaje;
  const detalle =
    nivel === 'rojo'
      ? `${esc(galeria.nombre)} bloqueada · ${nombreNivel(galeria.nivel)}`
      : `${esc(galeria.nombre)} · ${nombreNivel(galeria.nivel)} · evacuar ahora`;
  const textoPersonas =
    personas.length === 0
      ? 'No hay nadie registrado adentro.'
      : nivel === 'rojo'
        ? `Prioridad de rescate: ${personas.length} ${personas.length === 1 ? 'persona sigue' : 'personas siguen'} adentro`
        : `${personas.length} ${personas.length === 1 ? 'persona' : 'personas'} en la galería — ruta de salida:`;
  return `
    <section class="banner banner--${nivel}" role="alert" data-galeria="${galeria.id}">
      <div class="banner__cabeza">
        ${icono(`estado-${nivel}`, { clase: 'banner__icono' })}
        <div class="banner__textos">
          <strong class="banner__titulo">${titulo}</strong>
          <span class="banner__detalle">${detalle}</span>
        </div>
        <a class="boton boton--secundario banner__ver" href="#/galerias/${galeria.id}">Ver galería</a>
      </div>
      <details class="banner__personas" data-galeria="${galeria.id}" ${personas.length && abiertos(galeria.id) ? 'open' : ''}>
        <summary>${textoPersonas}</summary>
        ${personas.length ? `<ul>${personas.map((p) => filaPersona(p, nivel)).join('')}</ul>` : ''}
      </details>
    </section>`;
}

/**
 * Monta los banners en el contenedor y los mantiene actualizados.
 * El botón de silenciar apaga la alarma hasta que aparezca una alerta nueva.
 */
export function montarAlertas(contenedor) {
  prepararAlarma();
  let silenciadas = new Set(); // claves de alerta silenciadas
  let ultimaFirma = '';
  // Lista de personas abierta o cerrada por galería (lo que elija el usuario se respeta).
  const elegidos = new Map();
  const esCelular = () => window.matchMedia('(max-width: 767px)').matches;
  const abiertos = (galeriaId) => elegidos.get(galeriaId) ?? !esCelular();

  function dibujar() {
    const alertas = alertasActivas();
    const claves = alertas.map((a) => `${a.galeria.id}:${a.nivel}`);
    const firma = claves.join('|');
    // Si una alerta desapareció, olvidar su silencio; si aparece una nueva, vuelve a sonar.
    silenciadas = new Set([...silenciadas].filter((c) => claves.includes(c)));
    const sinSilenciar = claves.filter((c) => !silenciadas.has(c));

    // Suena si hay alertas sin silenciar; se reinicia solo si cambió la situación.
    if (!sinSilenciar.length) apagarAlarma();
    else if (firma !== ultimaFirma || !alarmaSonando()) encenderAlarma({ urgente: alertas.some((a) => a.nivel === 'rojo') });
    ultimaFirma = firma;

    document.body.classList.toggle('hay-alertas', alertas.length > 0);
    if (!alertas.length) {
      contenedor.innerHTML = '';
      return;
    }
    contenedor.innerHTML = `
      <div class="alertas">
        ${alertas.map((a) => banner(a, abiertos)).join('')}
        <button class="boton boton--secundario alertas__silenciar" ${sinSilenciar.length ? '' : 'disabled'}>
          ${icono(sinSilenciar.length ? 'silencio' : 'campana')}
          ${sinSilenciar.length ? 'Silenciar alarma' : 'Alarma silenciada'}
        </button>
      </div>`;
    contenedor.querySelectorAll('.banner__personas').forEach((d) =>
      d.addEventListener('toggle', () => elegidos.set(d.dataset.galeria, d.open)),
    );
    contenedor.querySelector('.alertas__silenciar').addEventListener('click', () => {
      claves.forEach((c) => silenciadas.add(c));
      dibujar();
    });
  }

  dibujar();
  // Se redibuja con cualquier cambio de galerías, escaneos o config, y cada minuto
  // (para que "sin señal" y las rutas estén al día).
  const salir = estado.suscribirse(dibujar, ['galerias', 'escaneos', 'config', 'nodos', 'aristas']);
  const reloj = setInterval(dibujar, 60 * 1000);
  return () => {
    salir();
    clearInterval(reloj);
    apagarAlarma();
  };
}
