import { icono } from './components/iconos.js';
import { NOMBRE_ROL } from '../domain/permisos.js';
import { esc } from './formato.js';

// Cáscara de la app: barra lateral (escritorio/tablet), barra inferior + hoja
// "Más" (celular), cabecera con el título y el contenedor de la pantalla.
// El menú muestra solo las pantallas que el rol del usuario puede ver.

const logoHtml = (inicio) => `
  <a class="logo" href="#/${inicio}" aria-label="Canario — ir al inicio">
    <span class="logo__marca">${icono('canario')}</span>
    <span class="logo__texto">CANARIO<span class="logo__sub">AGO Soluciones</span></span>
  </a>`;

function itemNav(p, clase = 'nav__item') {
  return `<a class="${clase}" href="#/${p.ruta}" data-ruta="${p.ruta}">
      ${icono(p.icono)}<span class="nav__texto">${p.tituloCorto ?? p.titulo}</span>
    </a>`;
}

function navAgrupada(lista) {
  const grupos = new Map();
  for (const p of lista) {
    if (!grupos.has(p.grupo)) grupos.set(p.grupo, []);
    grupos.get(p.grupo).push(p);
  }
  return [...grupos]
    .map(([grupo, items]) => `<p class="etiqueta nav__grupo">${grupo}</p>${items.map((p) => itemNav(p)).join('')}`)
    .join('');
}

function cajaUsuario(usuario) {
  if (!usuario) return '';
  return `
    <div class="usuario-caja">
      <span class="usuario-caja__avatar" aria-hidden="true">${esc(usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join(''))}</span>
      <span class="usuario-caja__texto"><strong>${esc(usuario.nombre)}</strong><span>${NOMBRE_ROL[usuario.rol] ?? usuario.rol}</span></span>
      <button class="boton boton--fantasma boton--icono" data-salir aria-label="Cerrar sesión" title="Cerrar sesión">${icono('salida')}</button>
    </div>`;
}

/**
 * Monta la cáscara en `raiz` y devuelve funciones para actualizarla.
 * @param {HTMLElement} raiz
 * @param {{ alSalir: () => void }} opciones
 */
export function montarShell(raiz, { alSalir }) {
  raiz.innerHTML = `
    <div class="app">
      <aside class="lateral" aria-label="Navegación principal">
        <div id="logo-lateral"></div>
        <nav class="nav" id="nav-lateral"></nav>
        <div class="lateral__pie" id="pie-lateral"></div>
      </aside>

      <div class="principal">
        <div id="banners" aria-live="assertive"></div>
        <header class="cabecera">
          <div id="logo-cabecera"></div>
          <h1 class="cabecera__titulo" id="titulo-pantalla"></h1>
          <div class="cabecera__alertas" id="alertas-cabecera" aria-live="polite"></div>
          <div class="cabecera__acciones" id="acciones-cabecera"></div>
        </header>
        <main class="pantalla" id="pantalla" tabindex="-1"></main>
      </div>

      <div class="hoja-mas" id="hoja-mas" data-abierta="false" aria-label="Más pantallas">
        <div id="usuario-hoja"></div>
        <nav class="nav" id="nav-hoja"></nav>
      </div>
      <nav class="inferior" aria-label="Navegación rápida" id="nav-inferior"></nav>
    </div>`;

  const app = raiz.querySelector('.app');
  const hoja = raiz.querySelector('#hoja-mas');
  const abrirHoja = (abrir) => {
    hoja.dataset.abierta = String(abrir);
    raiz.querySelector('#boton-mas')?.setAttribute('aria-expanded', String(abrir));
  };
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('#boton-mas')) abrirHoja(hoja.dataset.abierta !== 'true');
    else if (e.target.closest('#hoja-mas a')) abrirHoja(false);
    if (e.target.closest('[data-salir]')) {
      abrirHoja(false);
      alSalir();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrirHoja(false);
  });

  return {
    contenedor: raiz.querySelector('#pantalla'),

    /** Redibuja el menú para las pantallas permitidas y el usuario de la sesión. */
    pintarMenu(pantallas, usuario, inicio) {
      const delMenu = pantallas.filter((p) => !p.oculta);
      const inferiores = (delMenu.some((p) => p.inferior) ? delMenu.filter((p) => p.inferior) : delMenu).slice(0, 4);
      const hayMas = delMenu.length > inferiores.length || Boolean(usuario);
      raiz.querySelector('#logo-lateral').innerHTML = logoHtml(inicio);
      raiz.querySelector('#logo-cabecera').innerHTML = logoHtml(inicio);
      raiz.querySelector('#nav-lateral').innerHTML = navAgrupada(delMenu);
      raiz.querySelector('#pie-lateral').innerHTML = `${pantallas.some((p) => p.ruta === 'estilos') ? itemNav({ ruta: 'estilos', icono: 'estilos', tituloCorto: 'Estilos' }) : ''}${cajaUsuario(usuario)}`;
      raiz.querySelector('#usuario-hoja').innerHTML = cajaUsuario(usuario);
      raiz.querySelector('#nav-hoja').innerHTML = delMenu.map((p) => itemNav(p)).join('');
      raiz.querySelector('#nav-inferior').innerHTML = `
        ${inferiores.map((p) => itemNav(p, 'inferior__item')).join('')}
        ${hayMas ? `<button class="inferior__item" id="boton-mas" aria-expanded="false" aria-controls="hoja-mas">${icono('mas')}<span>Más</span></button>` : ''}`;
      raiz.querySelector('#nav-inferior').style.gridTemplateColumns = `repeat(${inferiores.length + (hayMas ? 1 : 0)}, 1fr)`;
    },

    /** Pantalla de ingreso: sin menú ni cabecera. */
    modoIngreso(activo) {
      app.classList.toggle('app--ingreso', activo);
    },

    /** Marca la ruta activa y actualiza el título. */
    activar(ruta, titulo) {
      raiz.querySelectorAll('[data-ruta]').forEach((a) => {
        if (a.dataset.ruta === ruta) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      raiz.querySelector('#titulo-pantalla').textContent = titulo;
      document.title = `${titulo} · Canario`;
      abrirHoja(false);
    },
  };
}
