import { icono } from './components/iconos.js';

// Cáscara de la app: barra lateral (escritorio/tablet), barra inferior + hoja
// "Más" (celular), cabecera con el título y el contenedor de la pantalla.

const logoHtml = `
  <a class="logo" href="#/panel" aria-label="Canario — ir al panel">
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

/**
 * Monta la cáscara en `raiz` y devuelve funciones para actualizarla.
 * @param {HTMLElement} raiz
 * @param {Array} pantallas registro de pantallas visibles en el menú
 */
export function montarShell(raiz, pantallas) {
  const delMenu = pantallas.filter((p) => !p.oculta);
  const inferiores = delMenu.filter((p) => p.inferior).slice(0, 4);

  raiz.innerHTML = `
    <div class="app">
      <aside class="lateral" aria-label="Navegación principal">
        ${logoHtml}
        <nav class="nav">${navAgrupada(delMenu)}</nav>
        <div class="lateral__pie">
          <a class="nav__item" href="#/estilos" data-ruta="estilos">${icono('estilos')}<span class="nav__texto">Estilos</span></a>
        </div>
      </aside>

      <div class="principal">
        <div id="banners" aria-live="assertive"></div>
        <header class="cabecera">
          ${logoHtml}
          <h1 class="cabecera__titulo" id="titulo-pantalla"></h1>
          <div class="cabecera__acciones" id="acciones-cabecera"></div>
        </header>
        <main class="pantalla" id="pantalla" tabindex="-1"></main>
      </div>

      <div class="hoja-mas" id="hoja-mas" data-abierta="false" aria-label="Más pantallas">
        <nav class="nav">${delMenu.map((p) => itemNav(p)).join('')}${itemNav({ ruta: 'estilos', icono: 'estilos', tituloCorto: 'Estilos' })}</nav>
      </div>
      <nav class="inferior" aria-label="Navegación rápida">
        ${inferiores.map((p) => itemNav(p, 'inferior__item')).join('')}
        <button class="inferior__item" id="boton-mas" aria-expanded="false" aria-controls="hoja-mas">
          ${icono('mas')}<span>Más</span>
        </button>
      </nav>
    </div>`;

  const hoja = raiz.querySelector('#hoja-mas');
  const botonMas = raiz.querySelector('#boton-mas');
  const abrirHoja = (abrir) => {
    hoja.dataset.abierta = String(abrir);
    botonMas.setAttribute('aria-expanded', String(abrir));
  };
  botonMas.addEventListener('click', () => abrirHoja(hoja.dataset.abierta !== 'true'));
  hoja.addEventListener('click', (e) => {
    if (e.target.closest('a')) abrirHoja(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrirHoja(false);
  });

  return {
    contenedor: raiz.querySelector('#pantalla'),
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
