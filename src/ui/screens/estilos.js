import { icono, nombresIconos } from '../components/iconos.js';

// Página interna #/estilos: muestra todo el sistema visual para revisarlo.

const grupos = [
  {
    titulo: 'Roca (fondos y superficies)',
    colores: ['fondo-hundido', 'fondo', 'superficie', 'superficie-2', 'superficie-3', 'borde', 'borde-fuerte'],
  },
  { titulo: 'Texto', colores: ['texto', 'texto-2', 'texto-3'] },
  {
    titulo: 'Acento ámbar · marca cobre · oro viejo',
    colores: ['acento', 'acento-hover', 'acento-presionado', 'marca-claro', 'marca', 'marca-oscuro', 'oro'],
  },
  { titulo: 'Semáforo (solo estados)', colores: ['verde', 'amarillo', 'rojo', 'sin-senal'] },
];

const estados = [
  { clave: 'verde', mensaje: 'Puede seguir con la excavación', canario: 'Canta' },
  { clave: 'amarillo', mensaje: 'EVACUACIÓN', canario: 'Agitado, en silencio' },
  { clave: 'rojo', mensaje: 'PELIGRO DE DERRUMBE', canario: 'Caído' },
];

function valorToken(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${nombre}`).trim();
}

function muestrasColores() {
  return grupos
    .map(
      (g) => `
      <p class="etiqueta">${g.titulo}</p>
      <div class="estilos__muestras">
        ${g.colores
          .map(
            (c) => `
          <div class="estilos__muestra">
            <div class="estilos__color" style="background: var(--color-${c})"></div>
            <div><strong>${c}</strong><br><span class="mono texto-tenue">${valorToken(c)}</span></div>
          </div>`,
          )
          .join('')}
      </div>`,
    )
    .join('');
}

export default {
  render(contenedor) {
    contenedor.innerHTML = `
      <div class="pila estilos">
        <p class="texto-secundario">Página interna para revisar el sistema visual de Canario. Todos los valores salen de <code>styles/tokens.css</code>.</p>

        <section class="tarjeta">
          <h3>Colores</h3>
          ${muestrasColores()}
        </section>

        <section class="tarjeta">
          <h3>Tipografías</h3>
          <div class="pila">
            <div><p class="etiqueta">Logo · Saira Stencil One</p><span class="logo__texto" style="font-size: var(--texto-3xl)">CANARIO</span></div>
            <div><p class="etiqueta">Títulos y alertas · Barlow Condensed 600</p>
              <h1>Galería G3 — Nivel −40 m</h1><h2>Título de sección</h2><h3>Título de tarjeta</h3></div>
            <div><p class="etiqueta">Texto · Barlow 400 / 500</p>
              <p>La estabilidad se recalcula cada vez que cambia un dato de la galería. Solo sube al registrar un apuntalamiento.</p>
              <p style="font-weight: var(--peso-medio)">Texto medio (500): cuadrilla Norte, capataz Ramírez.</p></div>
            <div><p class="etiqueta">Números y códigos · JetBrains Mono</p>
              <p class="mono">CAN-0042 · 900 kg → 850 kg · −5,6 % · 14:32</p>
              <span class="cifra">62,5<span class="cifra__unidad">%</span></span></div>
          </div>
        </section>

        <section class="tarjeta">
          <h3>Semáforo estructural</h3>
          <p class="texto-secundario">El estado nunca se comunica solo con color: siempre color + ícono + texto.</p>
          <div class="grilla">
            ${estados
              .map(
                (e) => `
              <div class="tarjeta tarjeta--elevada pila">
                <span class="estado estado--${e.clave}">${icono(`estado-${e.clave}`)} ${e.mensaje}</span>
                <span class="texto-tenue">Canario: ${e.canario}</span>
              </div>`,
              )
              .join('')}
          </div>
        </section>

        <section class="tarjeta">
          <h3>Botones</h3>
          <div class="fila">
            <button class="boton boton--primario">${icono('cargas')} Nueva carga</button>
            <button class="boton boton--secundario">Secundario</button>
            <button class="boton boton--fantasma">Fantasma</button>
            <button class="boton boton--primario" disabled>Deshabilitado</button>
            <button class="boton boton--secundario boton--icono" aria-label="Silenciar alarma">${icono('silencio')}</button>
          </div>
          <div class="fila" style="margin-top: var(--esp-4)">
            <button class="boton boton--primario boton--grande">${icono('simulador')} Simular turno</button>
          </div>
        </section>

        <section class="grilla">
          <div class="tarjeta">
            <p class="etiqueta">Personas adentro</p>
            <span class="cifra">17</span>
            <p class="texto-tenue">Tarjeta base</p>
          </div>
          <div class="tarjeta tarjeta--elevada">
            <p class="etiqueta">Toneladas del turno</p>
            <span class="cifra">48,3<span class="cifra__unidad">t</span></span>
            <p class="texto-tenue">Tarjeta elevada</p>
          </div>
          <div class="tarjeta tarjeta--marca">
            <p class="etiqueta" style="color: var(--color-oro)">Destacado</p>
            <span class="cifra">AGO</span>
            <p style="color: var(--color-oro)">Tarjeta de marca (cobre)</p>
          </div>
        </section>

        <section class="tarjeta">
          <h3>Formularios y chips</h3>
          <div class="grilla">
            <label class="campo"><span class="campo__etiqueta">Metros de avance</span>
              <input class="entrada entrada--mono" inputmode="decimal" value="1,5"><span class="campo__ayuda">Metros excavados en este registro.</span></label>
            <label class="campo"><span class="campo__etiqueta">Peso (kg)</span>
              <input class="entrada entrada--mono" aria-invalid="true" value="-20"><span class="campo__error">El peso tiene que ser mayor que 0.</span></label>
            <label class="campo"><span class="campo__etiqueta">Mineral</span>
              <select class="entrada"><option>Hierro (hematita)</option><option>Cobre (calcopirita)</option><option>Caliza</option><option>Cuarzo</option></select></label>
          </div>
          <div class="fila">
            <span class="chip">Roca media</span>
            <span class="chip chip--marca">${icono('casco')} Cuadrilla Norte</span>
            <span class="chip chip--acento">Simulado</span>
          </div>
        </section>

        <section class="tarjeta">
          <h3>Íconos</h3>
          <div class="estilos__iconos">
            ${nombresIconos.map((n) => `<div>${icono(n)}<span class="mono">${n}</span></div>`).join('')}
          </div>
        </section>
      </div>`;
  },
};
