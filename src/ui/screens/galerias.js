// Pantalla Galerías: lista de fichas (#/galerias) y detalle (#/galerias/G3).
// Toda la lógica de negocio viene de domain/semaforo y servicios/galerias.

import { estado } from '../../state.js';
import { evaluarGaleria, ESTADOS } from '../../domain/semaforo.js';
import { personasEnGaleria } from '../../domain/ubicacion.js';
import {
  registrarAvance,
  registrarApuntalamiento,
  registrarFisuras,
  desbloquearGaleria,
  historialGaleria,
} from '../../servicios/galerias.js';
import { ubicacionesActuales, rutaDeSalidaDesde, describirCamino, nodosPorId } from '../../servicios/ubicacion.js';
import { canario } from '../components/canario.js';
import { bateria } from '../components/bateria.js';
import { insigniaEstado } from '../components/estado.js';
import { icono } from '../components/iconos.js';
import { confirmar } from '../components/confirmar.js';
import { avisar } from '../components/aviso.js';
import { numero, nombreRoca, nombreNivel, fechaHora, leerNumero, esc } from '../formato.js';

// ── Lista ────────────────────────────────────────────────────────

function ficha(galeria, config, ubicaciones) {
  const ev = evaluarGaleria(galeria, config);
  const personas = personasEnGaleria(ubicaciones, galeria.id).length;
  return `
    <a class="ficha ficha--${ev.estado} ${galeria.bloqueada ? 'ficha--bloqueada' : ''}" href="#/galerias/${galeria.id}" id="${galeria.svgId}-ficha">
      <div class="ficha__cabeza">
        <div>
          <h3 class="ficha__nombre">${esc(galeria.nombre)}</h3>
          <div class="fila ficha__chips">
            <span class="chip">${nombreNivel(galeria.nivel)}</span>
            <span class="chip">${nombreRoca(galeria.roca)}</span>
            ${galeria.bloqueada ? `<span class="chip chip--bloqueo">${icono('candado')} Bloqueada</span>` : ''}
          </div>
        </div>
        ${canario(ev.estado, { tamano: 88 })}
      </div>
      ${insigniaEstado(ev.estado)}
      ${bateria(ev.estabilidad, ev.estado)}
      <dl class="ficha__datos">
        <div><dt>Sin apuntalar</dt><dd class="mono">${numero(galeria.metrosSinApuntalar, 2)} / ${numero(galeria.metrosMax)} m</dd></div>
        <div><dt>Avance del turno</dt><dd class="mono">${numero(galeria.avanceTurno, 2)} / ${numero(galeria.velocidadMax)} m</dd></div>
        <div><dt>Fisuras</dt><dd>${galeria.hayFisuras ? 'Sí, reportadas' : 'No'}</dd></div>
        <div><dt>Personas</dt><dd class="mono">${personas}</dd></div>
      </dl>
    </a>`;
}

function dibujarLista(contenedor) {
  const config = estado.config();
  const ubicaciones = ubicacionesActuales();
  const galerias = estado.listar('galerias').sort((a, b) => b.nivel - a.nivel || a.id.localeCompare(b.id));
  const conteo = { verde: 0, amarillo: 0, rojo: 0 };
  galerias.forEach((g) => conteo[evaluarGaleria(g, config).estado]++);
  contenedor.innerHTML = `
    <div class="pila">
      <div class="fila resumen-estados" aria-label="Resumen de estados">
        ${['verde', 'amarillo', 'rojo']
          .map((e) => insigniaEstado(e, { texto: `${conteo[e]} · ${ESTADOS[e].mensaje}` }))
          .join('')}
      </div>
      <div class="grilla grilla--fichas">${galerias.map((g) => ficha(g, config, ubicaciones)).join('')}</div>
    </div>`;
}

// ── Detalle ──────────────────────────────────────────────────────

function opcionesUsuarios(rol) {
  return estado
    .listar('usuarios', (u) => u.rol === rol)
    .map((u) => `<option value="${u.id}">${esc(u.nombre)}</option>`)
    .join('');
}

function seccionBloqueo(galeria) {
  const apuntalada = galeria.apuntaladaDesdeBloqueo != null;
  return `
    <section class="bloqueo" aria-labelledby="titulo-bloqueo">
      <div class="bloqueo__cabeza">
        ${icono('candado', { clase: 'bloqueo__icono' })}
        <div>
          <h3 id="titulo-bloqueo">PELIGRO DE DERRUMBE — galería bloqueada</h3>
          <p>No se pueden cargar avances ni cargas, la baliza de entrada rechaza escaneos y la galería figura cerrada en el mapa.
          Para reabrirla: apuntalar y confirmar con dos llaves.</p>
        </div>
      </div>
      <ol class="llaves">
        <li class="${apuntalada ? 'llaves__hecho' : ''}">${icono(apuntalada ? 'estado-verde' : 'galerias')} Apuntalamiento registrado después del bloqueo ${apuntalada ? `<span class="mono">(${fechaHora(galeria.apuntaladaDesdeBloqueo)})</span>` : '— pendiente'}</li>
        <li>${icono('llave')} Llave 1: PIN de un ingeniero</li>
        <li>${icono('llave')} Llave 2: PIN de un capataz</li>
      </ol>
      <form class="desbloqueo" id="form-desbloqueo" novalidate>
        <fieldset class="desbloqueo__llave">
          <legend>Llave 1 · Ingeniero</legend>
          <label class="campo"><span class="campo__etiqueta">Ingeniero</span>
            <select class="entrada" name="ingenieroId">${opcionesUsuarios('ingeniero')}</select></label>
          <label class="campo"><span class="campo__etiqueta">PIN</span>
            <input class="entrada entrada--mono" name="pinIngeniero" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label>
        </fieldset>
        <fieldset class="desbloqueo__llave">
          <legend>Llave 2 · Capataz</legend>
          <label class="campo"><span class="campo__etiqueta">Capataz</span>
            <select class="entrada" name="capatazId">${opcionesUsuarios('capataz')}</select></label>
          <label class="campo"><span class="campo__etiqueta">PIN</span>
            <input class="entrada entrada--mono" name="pinCapataz" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label>
        </fieldset>
        <div class="desbloqueo__pie">
          <ul class="campo__error" id="errores-desbloqueo" role="alert"></ul>
          <button class="boton boton--primario boton--grande" type="submit">${icono('llave')} Desbloquear con dos llaves</button>
        </div>
      </form>
    </section>`;
}

function seccionFormularios(galeria, config) {
  const puntos = numero(config.penalizacionFisuras);
  const bloqueada = galeria.bloqueada;
  const deshabilitado = bloqueada ? 'disabled' : '';
  return `
    <div class="grilla grilla--formularios">
      <form class="tarjeta pila" id="form-avance" novalidate>
        <h3 class="tarjeta__titulo">${icono('galerias')} Registrar avance</h3>
        ${bloqueada ? `<p class="aviso-bloqueo">${icono('candado')} Galería bloqueada: no se pueden cargar avances.</p>` : ''}
        <label class="campo"><span class="campo__etiqueta">Metros excavados</span>
          <input class="entrada entrada--mono" name="metros" inputmode="decimal" placeholder="0,5" ${deshabilitado} aria-describedby="error-metros">
          <span class="campo__ayuda">Velocidad máxima: ${numero(galeria.velocidadMax)} m por turno (${nombreRoca(galeria.roca).toLowerCase()}).</span>
          <span class="campo__error" id="error-metros"></span></label>
        <label class="casilla"><input type="checkbox" name="fisuras" ${deshabilitado}> Se vieron fisuras</label>
        <button class="boton boton--primario" type="submit" ${deshabilitado}>Registrar avance</button>
      </form>

      <div class="tarjeta pila">
        <h3 class="tarjeta__titulo">${icono('estado-verde')} Apuntalamiento</h3>
        <p class="texto-secundario">Hay <strong class="mono">${numero(galeria.metrosSinApuntalar, 2)} m</strong> sin apuntalar.
        Apuntalar deja los metros sin apuntalar en 0 y borra las fisuras: es lo único que sube la estabilidad.</p>
        <button class="boton boton--secundario" id="boton-apuntalar">Registrar apuntalamiento</button>
      </div>

      <div class="tarjeta pila">
        <h3 class="tarjeta__titulo">${icono('estado-amarillo')} Fisuras</h3>
        <p class="texto-secundario">${galeria.hayFisuras ? `Ya hay fisuras reportadas (restan ${puntos} puntos de estabilidad).` : `Reportar fisuras resta ${puntos} puntos de estabilidad hasta el próximo apuntalamiento.`}</p>
        <button class="boton boton--secundario" id="boton-fisuras" ${galeria.hayFisuras ? 'disabled' : ''}>Reportar fisuras</button>
      </div>
    </div>`;
}

function seccionPersonas(galeria, ubicaciones, nivel) {
  const personas = personasEnGaleria(ubicaciones, galeria.id);
  const nodos = nodosPorId();
  if (!personas.length) return `<section class="tarjeta"><h3 class="tarjeta__titulo">${icono('personas')} Personas en la galería</h3><p class="texto-tenue">No hay nadie registrado adentro.</p></section>`;
  return `
    <section class="tarjeta">
      <h3 class="tarjeta__titulo">${icono('personas')} Personas en la galería (${personas.length})</h3>
      <ul class="lista-personas">
        ${personas
          .map((p) => {
            const ruta = rutaDeSalidaDesde(p.nodoId);
            return `<li class="${nivel === 'rojo' ? 'lista-personas__rescate' : ''}">
              <strong>${esc(p.usuario.nombre)}</strong> <span class="texto-tenue">en ${esc(nodos.get(p.nodoId)?.nombre)}</span>
              ${nivel !== 'verde' ? `<span class="lista-personas__ruta">${icono('salida')} ${esc(ruta ? describirCamino(ruta.camino) : 'sin ruta de salida')}</span>` : ''}
            </li>`;
          })
          .join('')}
      </ul>
    </section>`;
}

const ICONO_EVENTO = {
  'cambio-estado': 'panel',
  bloqueo: 'candado',
  desbloqueo: 'llave',
  apuntalamiento: 'estado-verde',
  fisuras: 'estado-amarillo',
};

function seccionHistorial(galeria) {
  const historial = historialGaleria(galeria.id).slice(0, 40);
  const usuarios = new Map(estado.listar('usuarios').map((u) => [u.id, u.nombre]));
  const fila = (h) => {
    if (h.clase === 'avance') {
      return `<li>${icono('galerias')}<span class="mono historial__hora">${fechaHora(h.timestamp)}</span>
        <span>Avance de <strong class="mono">${numero(h.metros, 2)} m</strong>${h.fisuras ? ' con fisuras' : ''} · ${esc(usuarios.get(h.usuarioId) ?? '—')}</span></li>`;
    }
    const clase = h.estadoNuevo ? `historial__estado--${h.estadoNuevo}` : '';
    return `<li class="${clase}">${icono(ICONO_EVENTO[h.tipo] ?? 'panel')}<span class="mono historial__hora">${fechaHora(h.timestamp)}</span><span>${esc(h.detalle)}</span></li>`;
  };
  return `
    <section class="tarjeta">
      <h3 class="tarjeta__titulo">Historial</h3>
      ${historial.length ? `<ul class="historial">${historial.map(fila).join('')}</ul>` : '<p class="texto-tenue">Todavía no hay registros.</p>'}
    </section>`;
}

function dibujarDetalle(contenedor, galeria) {
  const config = estado.config();
  const ev = evaluarGaleria(galeria, config);
  const nivel = galeria.bloqueada ? 'rojo' : ev.estado;
  const ubicaciones = ubicacionesActuales();
  contenedor.innerHTML = `
    <div class="pila">
      <a class="volver" href="#/galerias">← Todas las galerías</a>
      <section class="detalle-galeria detalle-galeria--${ev.estado} tarjeta tarjeta--elevada">
        ${canario(ev.estado, { tamano: 150 })}
        <div class="pila detalle-galeria__info">
          <div>
            <h2 class="detalle-galeria__nombre">${esc(galeria.nombre)}</h2>
            <div class="fila"><span class="chip">${nombreNivel(galeria.nivel)}</span><span class="chip">${nombreRoca(galeria.roca)}</span><span class="chip mono">${galeria.id}</span></div>
          </div>
          ${insigniaEstado(ev.estado)}
          ${bateria(ev.estabilidad, ev.estado, { grande: true })}
          <dl class="ficha__datos ficha__datos--anchas">
            <div><dt>Sin apuntalar</dt><dd class="mono">${numero(galeria.metrosSinApuntalar, 2)} / ${numero(galeria.metrosMax)} m</dd></div>
            <div><dt>Avance del turno</dt><dd class="mono">${numero(galeria.avanceTurno, 2)} / ${numero(galeria.velocidadMax)} m</dd></div>
            <div><dt>Fisuras</dt><dd>${galeria.hayFisuras ? 'Sí' : 'No'}</dd></div>
            <div><dt>Canario</dt><dd>${ev.descripcionCanario}</dd></div>
          </dl>
        </div>
      </section>
      ${galeria.bloqueada ? seccionBloqueo(galeria) : ''}
      ${seccionFormularios(galeria, config)}
      ${seccionPersonas(galeria, ubicaciones, nivel)}
      ${seccionHistorial(galeria)}
    </div>`;
  conectarDetalle(contenedor, galeria);
}

function mostrarError(error) {
  avisar(error.message ?? String(error), { tipo: 'error' });
}

function conectarDetalle(contenedor, galeria) {
  const formAvance = contenedor.querySelector('#form-avance');
  formAvance.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entrada = formAvance.elements.metros;
    const error = contenedor.querySelector('#error-metros');
    const metros = leerNumero(entrada.value);
    if (!(metros > 0)) {
      entrada.setAttribute('aria-invalid', 'true');
      error.textContent = 'Ingresá los metros excavados: un número mayor que 0 (por ejemplo 0,5).';
      entrada.focus();
      return;
    }
    try {
      const r = await registrarAvance(galeria.id, { metros, fisuras: formAvance.elements.fisuras.checked });
      contenedor.querySelector('#form-avance')?.reset();
      avisar(`Avance registrado: ${numero(metros, 2)} m.${r.cambioEstado ? ` Nuevo estado: ${ESTADOS[r.estadoNuevo].mensaje}.` : ''}`);
    } catch (err) {
      mostrarError(err);
    }
  });

  contenedor.querySelector('#boton-apuntalar').addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: `¿Registrar apuntalamiento en ${galeria.nombre}?`,
      mensaje: `Se registran ${numero(galeria.metrosSinApuntalar, 2)} m apuntalados. Los metros sin apuntalar vuelven a 0 y se borran las fisuras.`,
      aceptar: 'Registrar apuntalamiento',
    });
    if (!ok) return;
    try {
      await registrarApuntalamiento(galeria.id);
      avisar('Apuntalamiento registrado.');
    } catch (err) {
      mostrarError(err);
    }
  });

  contenedor.querySelector('#boton-fisuras').addEventListener('click', async () => {
    try {
      const r = await registrarFisuras(galeria.id);
      avisar(`Fisuras reportadas.${r.cambioEstado ? ` Nuevo estado: ${ESTADOS[r.estadoNuevo].mensaje}.` : ''}`);
    } catch (err) {
      mostrarError(err);
    }
  });

  const formDesbloqueo = contenedor.querySelector('#form-desbloqueo');
  formDesbloqueo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = formDesbloqueo.elements;
    const lista = contenedor.querySelector('#errores-desbloqueo');
    const faltan = [];
    if (!f.pinIngeniero.value.trim()) faltan.push('Ingresá el PIN del ingeniero.');
    if (!f.pinCapataz.value.trim()) faltan.push('Ingresá el PIN del capataz.');
    if (faltan.length) {
      lista.innerHTML = faltan.map((t) => `<li>${t}</li>`).join('');
      return;
    }
    const r = await desbloquearGaleria(galeria.id, {
      ingenieroId: f.ingenieroId.value,
      pinIngeniero: f.pinIngeniero.value,
      capatazId: f.capatazId.value,
      pinCapataz: f.pinCapataz.value,
    });
    if (!r.valido) {
      lista.innerHTML = r.errores.map((t) => `<li>${esc(t)}</li>`).join('');
      return;
    }
    avisar(`${galeria.nombre} reabierta con dos llaves.`);
  });
}

// ── Montaje ──────────────────────────────────────────────────────

/** Guarda lo que el usuario estaba escribiendo para no perderlo al redibujar. */
function conservarFormularios(contenedor, redibujar) {
  const valores = {};
  contenedor.querySelectorAll('form').forEach((form) => {
    for (const el of form.elements) {
      if (el.name) valores[`${form.id}:${el.name}`] = el.type === 'checkbox' ? el.checked : el.value;
    }
  });
  const enfocado = document.activeElement?.closest('form') ? `${document.activeElement.form?.id}:${document.activeElement.name}` : null;
  redibujar();
  contenedor.querySelectorAll('form').forEach((form) => {
    for (const el of form.elements) {
      const clave = `${form.id}:${el.name}`;
      if (!el.name || !(clave in valores)) continue;
      if (el.type === 'checkbox') el.checked = valores[clave];
      else el.value = valores[clave];
      if (clave === enfocado) el.focus();
    }
  });
}

export default {
  render(contenedor, { params = [] } = {}) {
    const [galeriaId] = params;
    let ultimoBloqueo = null;
    const dibujar = () => {
      if (!galeriaId) return dibujarLista(contenedor);
      const galeria = estado.obtener('galerias', galeriaId);
      if (!galeria) {
        contenedor.innerHTML = `<div class="vacio"><h2>Galería no encontrada</h2><a class="boton boton--primario" href="#/galerias">Ver galerías</a></div>`;
        return;
      }
      // Si cambió el bloqueo, los formularios cambian: no conservar lo escrito.
      if (ultimoBloqueo !== null && ultimoBloqueo !== galeria.bloqueada) dibujarDetalle(contenedor, galeria);
      else conservarFormularios(contenedor, () => dibujarDetalle(contenedor, galeria));
      ultimoBloqueo = galeria.bloqueada;
    };
    dibujar();
    const salir = estado.suscribirse(dibujar, ['galerias', 'avances', 'eventos', 'escaneos', 'config', 'usuarios']);
    const reloj = setInterval(dibujar, 60 * 1000);
    return () => {
      salir();
      clearInterval(reloj);
    };
  },
};
