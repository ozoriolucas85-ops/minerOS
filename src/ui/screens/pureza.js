// Pantalla Pureza (sección 3.5): calculadora en dos modos asociada a una carga.
//   #/pureza            → elegir carga
//   #/pureza/CAN-0042   → calcular y guardar

import { estado } from '../../state.js';
import { sugerirModo, nombreMineral } from '../../domain/pureza.js';
import { buscarCargaPorCodigo, calcularPurezaDeCarga, guardarPureza } from '../../servicios/cargas.js';
import { icono } from '../components/iconos.js';
import { avisar } from '../components/aviso.js';
import { navegar } from '../../router.js';
import { esc, numero, leerNumero } from '../formato.js';

function selectorCarga(codigoActual) {
  const cargas = estado.listar('cargas').sort((a, b) => b.creada - a.creada);
  return `
    <label class="campo selector-carga"><span class="campo__etiqueta">Carga</span>
      <select class="entrada" id="elegir-carga">
        <option value="">Elegí una carga…</option>
        ${cargas
          .map(
            (c) => `<option value="${c.codigo}" ${c.codigo === codigoActual ? 'selected' : ''}>${c.codigo} · ${esc(nombreMineral(c.mineral))} · ${esc(c.galeriaId)}${c.pureza != null ? ` · ${numero(c.pureza, 1)} %` : ''}</option>`,
          )
          .join('')}
      </select></label>`;
}

function resultadoHtml(r, modo) {
  if (!r) return '<p class="texto-tenue">Completá los datos para ver el resultado.</p>';
  if (r.error) return `<p class="campo__error" role="alert">${esc(r.error)}</p>`;
  const clase = r.clasificacion.toLowerCase();
  return `
    <div class="resultado-pureza resultado-pureza--${clase}">
      <div class="resultado-pureza__cifra"><span class="cifra">${numero(r.pureza, 1)}<span class="cifra__unidad">%</span></span>
        <span class="chip chip-pureza chip-pureza--${clase}">Pureza ${r.clasificacion}</span></div>
      <div class="medidor-pureza" aria-hidden="true">
        <div class="medidor-pureza__relleno" style="width:${Math.max(0, Math.min(100, r.pureza))}%"></div>
        <span class="medidor-pureza__marca" style="left:${estado.config().pureza.media}%"></span>
        <span class="medidor-pureza__marca" style="left:${estado.config().pureza.alta}%"></span>
      </div>
      <dl class="ficha__datos ficha__datos--anchas">
        ${modo === 'densidad' ? `<div><dt>Densidad medida</dt><dd class="mono">${numero(r.densidad, 2)} g/cm³</dd></div>` : `<div><dt>Muestra</dt><dd class="mono">${numero(r.muestra, 2)} → ${numero(r.util, 2)} útil</dd></div>`}
        <div><dt>Mineral útil</dt><dd class="mono">${r.mineralUtil != null ? `${numero(r.mineralUtil, 1)} kg` : '—'}</dd></div>
        <div><dt>Peso usado</dt><dd class="mono">${r.peso != null ? `${numero(r.peso, 1)} kg` : '—'}</dd></div>
      </dl>
      ${modo === 'densidad' ? `<p class="nota-estimacion">${icono('info')} La pureza por densidad es una <strong>estimación</strong>: supone que la carga es solo mineral y roca estéril.</p>` : ''}
    </div>`;
}

function renderCarga(contenedor, codigo) {
  const carga = buscarCargaPorCodigo(codigo);
  if (!carga) {
    contenedor.innerHTML = `<div class="pila">${selectorCarga('')}<div class="vacio"><h2>Carga no encontrada</h2><p class="mono">${esc(codigo)}</p></div></div>`;
    return;
  }
  const config = estado.config();
  const sugerencia = sugerirModo(carga.mineral, config);
  let modo = carga.modoPureza ?? sugerencia.modo;
  const pesoInicial = carga.pesajes[0]?.peso;

  contenedor.innerHTML = `
    <div class="pila">
      ${selectorCarga(carga.codigo)}
      <section class="tarjeta pila">
        <div class="fila">
          <h3 class="tarjeta__titulo" style="margin:0">${icono('pureza')} <a class="mono" href="#/cargas/${carga.codigo}">${carga.codigo}</a> · ${esc(nombreMineral(carga.mineral))}</h3>
          <span class="chip mono">${numero(carga.volumen, 3)} m³</span>
          ${pesoInicial != null ? `<span class="chip mono">${numero(pesoInicial, 1)} kg en el frente</span>` : ''}
        </div>
        <div class="sugerencia-modo">
          ${icono('info')}
          <p><strong>Recomendado: modo ${sugerencia.modo === 'manual' ? 'manual' : 'por densidad'}.</strong> ${esc(sugerencia.motivo)}</p>
        </div>
        <div class="selector-modo-pureza" role="radiogroup" aria-label="Modo de cálculo">
          <label class="opcion-modo"><input type="radio" name="modo" value="densidad" ${modo === 'densidad' ? 'checked' : ''}>
            <span><strong>Por densidad</strong><br><span class="texto-tenue">Peso de la carga ÷ volumen de la carretilla</span></span></label>
          <label class="opcion-modo"><input type="radio" name="modo" value="manual" ${modo === 'manual' ? 'checked' : ''}>
            <span><strong>Manual</strong><br><span class="texto-tenue">Muestra pesada y mineral útil obtenido</span></span></label>
        </div>
        <form class="grilla grilla--compacta-2" id="form-pureza" novalidate>
          <label class="campo campo-densidad"><span class="campo__etiqueta">Peso de la carga (kg)</span>
            <input class="entrada entrada--mono" name="peso" inputmode="decimal" value="${pesoInicial != null ? String(pesoInicial).replace('.', ',') : ''}" placeholder="900">
            <span class="campo__ayuda">Por defecto, el peso registrado en el frente.</span></label>
          <label class="campo campo-densidad"><span class="campo__etiqueta">Volumen (m³)</span>
            <input class="entrada entrada--mono" value="${String(carga.volumen).replace('.', ',')}" readonly aria-readonly="true">
            <span class="campo__ayuda">Volumen de la carretilla, cargado al crear la carga.</span></label>
          <label class="campo campo-manual"><span class="campo__etiqueta">Peso de la muestra (g)</span>
            <input class="entrada entrada--mono" name="muestra" inputmode="decimal" placeholder="500" value="${carga.purezaDetalle?.muestra ?? ''}"></label>
          <label class="campo campo-manual"><span class="campo__etiqueta">Mineral útil obtenido (g)</span>
            <input class="entrada entrada--mono" name="util" inputmode="decimal" placeholder="420" value="${carga.purezaDetalle?.util ?? ''}"></label>
        </form>
        <div id="resultado-pureza"></div>
        <div class="fila">
          <button class="boton boton--primario boton--grande" id="guardar-pureza">Guardar en la carga</button>
          ${carga.pureza != null ? `<span class="texto-secundario">Guardado: ${numero(carga.pureza, 1)} % (${carga.modoPureza})</span>` : ''}
        </div>
      </section>
    </div>`;

  const form = contenedor.querySelector('#form-pureza');
  const salida = contenedor.querySelector('#resultado-pureza');
  const datos = () => ({
    modo,
    peso: leerNumero(form.elements.peso.value),
    muestra: leerNumero(form.elements.muestra.value),
    util: leerNumero(form.elements.util.value),
  });
  function calcular() {
    contenedor.querySelector('.selector-modo-pureza').dataset.modo = modo;
    form.dataset.modo = modo;
    const d = datos();
    const faltan = modo === 'densidad' ? Number.isNaN(d.peso) : Number.isNaN(d.muestra) || Number.isNaN(d.util);
    if (faltan) return (salida.innerHTML = resultadoHtml(null, modo));
    try {
      salida.innerHTML = resultadoHtml(calcularPurezaDeCarga(carga, d), modo);
    } catch (error) {
      salida.innerHTML = resultadoHtml({ error: error.message }, modo);
    }
  }
  contenedor.querySelectorAll('[name=modo]').forEach((r) =>
    r.addEventListener('change', () => {
      modo = r.value;
      calcular();
    }),
  );
  form.addEventListener('input', calcular);
  form.addEventListener('submit', (e) => e.preventDefault());
  contenedor.querySelector('#guardar-pureza').addEventListener('click', async () => {
    try {
      const guardada = await guardarPureza(carga.id, datos());
      avisar(`Pureza guardada en ${guardada.codigo}: ${numero(guardada.pureza, 1)} % (${guardada.purezaDetalle.clasificacion}).`);
    } catch (error) {
      avisar(error.message, { tipo: 'error' });
    }
  });
  calcular();
}

export default {
  render(contenedor, { params = [] } = {}) {
    if (params[0]) renderCarga(contenedor, params[0]);
    else {
      const hay = estado.listar('cargas').length;
      contenedor.innerHTML = `<div class="pila">${selectorCarga('')}
        <div class="vacio">${icono('pureza')}<h2>Calculadora de pureza</h2>
          <p>${hay ? 'Elegí una carga para calcular su pureza por densidad o en modo manual.' : 'Todavía no hay cargas. Creá una en Cargas.'}</p>
          ${hay ? '' : '<a class="boton boton--primario" href="#/cargas">Ir a Cargas</a>'}</div></div>`;
    }
    contenedor.querySelector('#elegir-carga')?.addEventListener('change', (e) => e.target.value && navegar(`pureza/${e.target.value}`));
    return null;
  },
};
