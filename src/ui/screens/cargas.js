// Pantalla Cargas (sección 3.4): pasaporte de la carga.
//   #/cargas            → nueva carga, ir a una carga (código o QR) e historial filtrable
//   #/cargas/CAN-0042   → seguimiento tramo a tramo, pesajes y QR de la carga

import { estado } from '../../state.js';
import { resumenCarga, filtrarTraslados } from '../../domain/traslados.js';
import { MINERALES, nombreMineral } from '../../domain/pureza.js';
import { codigoQrDeCarga, leerCodigoQr } from '../../domain/ubicacion.js';
import { indexarPorId } from '../../domain/utilidades.js';
import { crearCarga, registrarPesaje, buscarCargaPorCodigo, puntosDeCarga } from '../../servicios/cargas.js';
import { icono } from '../components/iconos.js';
import { avisar } from '../components/aviso.js';
import { leerQr } from '../components/lectorQr.js';
import { navegar } from '../../router.js';
import { esc, numero, hora, fechaHora, leerNumero, nombreNivel } from '../formato.js';
import { permite } from '../../servicios/permisos.js';
import { usuarioActualId } from '../../sesion.js';

const TIPOS_PESAJE = ['frente', 'cruce', 'boca', 'acopio'];

function opciones(lista, seleccionado, { vacio } = {}) {
  return (
    (vacio ? `<option value="">${vacio}</option>` : '') +
    lista.map((o) => `<option value="${o.valor}" ${o.valor === seleccionado ? 'selected' : ''} ${o.deshabilitado ? 'disabled' : ''}>${esc(o.texto)}</option>`).join('')
  );
}

function chipPureza(carga) {
  if (carga.pureza == null) return '';
  const clase = carga.purezaDetalle?.clasificacion ?? '';
  return `<span class="chip chip-pureza chip-pureza--${clase.toLowerCase()}">${icono('pureza')} ${numero(carga.pureza, 1)} % · ${clase}</span>`;
}

// ── Lista ────────────────────────────────────────────────────────

function formularioNuevaCarga() {
  const cuadrillas = estado.listar('cuadrillas').filter((c) => permite(usuarioActualId(), 'carga:crear', { cuadrillaId: c.id }));
  if (!cuadrillas.length) return `<p class="solo-lectura">${icono('info')} Tu rol no crea cargas.</p>`;
  const propias = new Set(cuadrillas.flatMap((c) => c.galeriaIds ?? []));
  const galerias = estado
    .listar('galerias')
    .filter((g) => usuarioActualId() && (estado.obtener('usuarios', usuarioActualId())?.rol === 'ingeniero' || propias.has(g.id)))
    .sort((a, b) => a.id.localeCompare(b.id));
  return `
    <form class="tarjeta pila" id="form-carga" novalidate>
      <h3 class="tarjeta__titulo">${icono('cargas')} Nueva carga</h3>
      <div class="grilla grilla--compacta-2">
        <label class="campo"><span class="campo__etiqueta">Cuadrilla</span>
          <select class="entrada" name="cuadrillaId">${opciones(cuadrillas.map((c) => ({ valor: c.id, texto: c.nombre })), null, { vacio: 'Elegí…' })}</select></label>
        <label class="campo"><span class="campo__etiqueta">Galería (frente de salida)</span>
          <select class="entrada" name="galeriaId">${opciones(
            galerias.map((g) => ({ valor: g.id, texto: `${g.id} · ${g.nombre}${g.bloqueada ? ' — CERRADA' : ''}`, deshabilitado: g.bloqueada })),
            null,
            { vacio: 'Elegí…' },
          )}</select></label>
        <label class="campo"><span class="campo__etiqueta">Mineral</span>
          <select class="entrada" name="mineral">${opciones(MINERALES.map((m) => ({ valor: m.clave, texto: m.nombre })), null, { vacio: 'Elegí…' })}</select></label>
        <label class="campo"><span class="campo__etiqueta">Volumen de la carretilla (m³)</span>
          <input class="entrada entrada--mono" name="volumen" inputmode="decimal" placeholder="0,25"></label>
      </div>
      <ul class="campo__error" id="errores-carga" role="alert"></ul>
      <button class="boton boton--primario" type="submit">Crear carga y generar código</button>
    </form>`;
}

function filaHistorial(c, ctx) {
  const r = resumenCarga(c, ctx.config, ctx.nodos);
  const ultimo = c.pesajes.at(-1);
  const estadoCarga = r.completa ? 'En acopio' : c.pesajes.length ? `En camino · ${esc(ctx.nodos.get(ultimo.nodoId)?.nombre ?? '')}` : 'Sin pesar';
  return `
    <tr class="${r.sospechosa ? 'fila--sospechosa' : ''}">
      <td data-etiqueta="Código"><a class="mono enlace-codigo" href="#/cargas/${c.codigo}">${c.codigo}</a>${c.simulado ? ' <span class="chip chip--acento">Simulado</span>' : ''}</td>
      <td data-etiqueta="Cuadrilla">${esc(ctx.cuadrillas.get(c.cuadrillaId)?.nombre ?? '—')}</td>
      <td data-etiqueta="Galería">${esc(c.galeriaId)}</td>
      <td data-etiqueta="Mineral">${esc(nombreMineral(c.mineral))}</td>
      <td data-etiqueta="Inicio" class="mono">${c.pesajes[0] ? fechaHora(c.pesajes[0].timestamp) : fechaHora(c.creada)}</td>
      <td data-etiqueta="Peso" class="mono">${r.pesoInicial != null ? `${numero(r.pesoInicial, 0)} → ${numero(r.pesoFinal, 0)} kg` : '—'}</td>
      <td data-etiqueta="Pérdida" class="mono">${r.pesoInicial != null ? `${numero(r.porcentajeTotal, 1)} %` : '—'}</td>
      <td data-etiqueta="Estado">${estadoCarga}</td>
      <td data-etiqueta="Control">${r.sospechosa ? `<span class="insignia-sospechosa">${icono('estado-rojo')} Sospechosa</span>` : `<span class="texto-tenue">${icono('estado-verde', { clase: 'icono-ok' })} OK</span>`}</td>
    </tr>`;
}

function dibujarLista(contenedor, filtros) {
  const config = estado.config();
  const ctx = {
    config,
    nodos: indexarPorId(estado.listar('nodos')),
    cuadrillas: indexarPorId(estado.listar('cuadrillas')),
  };
  const desde = filtros.desde ? new Date(`${filtros.desde}T00:00:00`).getTime() : null;
  const hasta = filtros.hasta ? new Date(`${filtros.hasta}T23:59:59`).getTime() : null;
  const cargas = filtrarTraslados(estado.listar('cargas'), { desde, hasta, cuadrillaId: filtros.cuadrillaId, soloSospechosos: filtros.soloSospechosos }, config).sort(
    (a, b) => (b.pesajes[0]?.timestamp ?? b.creada) - (a.pesajes[0]?.timestamp ?? a.creada),
  );
  const sospechosas = cargas.filter((c) => resumenCarga(c, config, ctx.nodos).sospechosa).length;

  const historial = contenedor.querySelector('#historial');
  historial.innerHTML = `
    <p class="texto-secundario historial-resumen">${cargas.length} ${cargas.length === 1 ? 'carga' : 'cargas'} · <strong class="${sospechosas ? 'texto-sospechoso' : ''}">${sospechosas} ${sospechosas === 1 ? 'sospechosa' : 'sospechosas'}</strong> · tolerancia ${numero(config.toleranciaPerdida, 1)} % por tramo</p>
    ${
      cargas.length
        ? `<div class="tabla-envoltura"><table class="tabla">
            <thead><tr><th>Código</th><th>Cuadrilla</th><th>Galería</th><th>Mineral</th><th>Inicio</th><th>Peso</th><th>Pérdida</th><th>Estado</th><th>Control</th></tr></thead>
            <tbody>${cargas.map((c) => filaHistorial(c, ctx)).join('')}</tbody>
          </table></div>`
        : '<p class="texto-tenue">No hay cargas con esos filtros.</p>'
    }`;
}

function renderLista(contenedor) {
  const filtros = { desde: '', hasta: '', cuadrillaId: '', soloSospechosos: false };
  contenedor.innerHTML = `
    <div class="pila">
      <div class="grilla grilla--cargas">
        ${formularioNuevaCarga()}
        <form class="tarjeta pila" id="form-ir" novalidate>
          <h3 class="tarjeta__titulo">${icono('balizas')} Pesar una carga</h3>
          <p class="texto-secundario">Escaneá el QR de la carretilla o escribí su código para registrar el pesaje en este punto.</p>
          <label class="campo"><span class="campo__etiqueta">Código de carga</span>
            <input class="entrada entrada--mono" name="codigo" placeholder="CAN-0001" autocomplete="off"></label>
          <div class="fila">
            <button class="boton boton--primario" type="submit">Abrir carga</button>
            <button class="boton boton--secundario" type="button" id="escanear-carga">${icono('balizas')} Escanear QR</button>
          </div>
        </form>
      </div>

      <section class="tarjeta pila">
        <h3 class="tarjeta__titulo">${icono('cargas')} Historial de traslados</h3>
        <form class="filtros" id="filtros">
          <label class="campo"><span class="campo__etiqueta">Desde</span><input class="entrada" type="date" name="desde"></label>
          <label class="campo"><span class="campo__etiqueta">Hasta</span><input class="entrada" type="date" name="hasta"></label>
          <label class="campo"><span class="campo__etiqueta">Cuadrilla</span>
            <select class="entrada" name="cuadrillaId">${opciones(estado.listar('cuadrillas').map((c) => ({ valor: c.id, texto: c.nombre })), null, { vacio: 'Todas' })}</select></label>
          <label class="casilla"><input type="checkbox" name="soloSospechosos"> Solo sospechosos</label>
        </form>
        <div id="historial"></div>
      </section>
    </div>`;

  // Nueva carga
  const form = contenedor.querySelector('#form-carga');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const errores = [];
    if (!f.cuadrillaId.value) errores.push('Elegí la cuadrilla.');
    if (!f.galeriaId.value) errores.push('Elegí la galería.');
    if (!f.mineral.value) errores.push('Elegí el mineral.');
    const volumen = leerNumero(f.volumen.value);
    if (!(volumen > 0)) errores.push('El volumen tiene que ser un número mayor que 0 (por ejemplo 0,25).');
    f.volumen.setAttribute('aria-invalid', String(!(volumen > 0)));
    const lista = contenedor.querySelector('#errores-carga');
    lista.innerHTML = errores.map((t) => `<li>${t}</li>`).join('');
    if (errores.length) return;
    try {
      const carga = await crearCarga({ cuadrillaId: f.cuadrillaId.value, galeriaId: f.galeriaId.value, mineral: f.mineral.value, volumen });
      avisar(`Carga ${carga.codigo} creada.`);
      navegar(`cargas/${carga.codigo}`);
    } catch (error) {
      lista.innerHTML = `<li>${esc(error.message)}</li>`;
    }
  });

  // Ir a una carga
  const abrir = (texto) => {
    const leido = leerCodigoQr(texto);
    const codigo = leido?.tipo === 'carga' ? leido.valor : texto;
    const carga = buscarCargaPorCodigo(codigo);
    if (!carga) return avisar(`No existe la carga "${codigo}".`, { tipo: 'error' });
    navegar(`cargas/${carga.codigo}`);
  };
  contenedor.querySelector('#form-ir').addEventListener('submit', (e) => {
    e.preventDefault();
    const codigo = e.target.elements.codigo.value.trim();
    if (codigo) abrir(codigo);
  });
  contenedor.querySelector('#escanear-carga').addEventListener('click', async () => {
    const texto = await leerQr({ titulo: 'Escanear carga', ayuda: 'Apuntá al QR pegado en la carretilla o vagoneta.' });
    if (texto) abrir(texto);
  });

  // Filtros
  contenedor.querySelector('#filtros').addEventListener('input', (e) => {
    const f = e.currentTarget.elements;
    Object.assign(filtros, { desde: f.desde.value, hasta: f.hasta.value, cuadrillaId: f.cuadrillaId.value, soloSospechosos: f.soloSospechosos.checked });
    dibujarLista(contenedor, filtros);
  });

  dibujarLista(contenedor, filtros);
  return estado.suscribirse(() => dibujarLista(contenedor, filtros), ['cargas', 'config', 'cuadrillas']);
}

// ── Detalle ──────────────────────────────────────────────────────

function lineaDeTiempo(carga, ctx) {
  const { recorrido } = puntosDeCarga(carga);
  const r = resumenCarga(carga, ctx.config, ctx.nodos);
  const hechos = new Set(carga.pesajes.map((p) => p.nodoId));
  const ultimo = carga.pesajes.at(-1)?.nodoId;
  const pendientes = recorrido.slice(ultimo ? recorrido.indexOf(ultimo) + 1 : 0).filter((id) => !hechos.has(id));
  const pasos = [];
  carga.pesajes.forEach((p, i) => {
    if (i > 0) {
      const t = r.tramos[i - 1];
      pasos.push(`
        <li class="tramo ${t.sospechoso ? 'tramo--sospechoso' : ''}">
          <span class="tramo__dato mono">−${numero(t.perdida, 1)} kg · ${numero(t.porcentaje, 1)} %</span>
          ${t.sospechoso ? `<span class="tramo__alerta">${icono('estado-rojo')} SOSPECHOSO: supera la tolerancia de ${numero(ctx.config.toleranciaPerdida, 1)} % · ${esc(ctx.cuadrillas.get(carga.cuadrillaId)?.nombre ?? '')} · ${hora(t.horaHasta)}</span>` : ''}
        </li>`);
    }
    const nodo = ctx.nodos.get(p.nodoId);
    pasos.push(`
      <li class="parada parada--hecha">
        <span class="parada__marca" aria-hidden="true">${icono('estado-verde')}</span>
        <div class="parada__texto">
          <strong>${esc(nodo?.nombre ?? p.nodoId)}</strong>
          <span class="texto-tenue">${esc(nodo?.tipo ?? '')}</span>
        </div>
        <div class="parada__datos"><span class="mono parada__peso">${numero(p.peso, 1)} kg</span><span class="mono texto-tenue">${hora(p.timestamp)}</span></div>
      </li>`);
  });
  pendientes.forEach((id) => {
    pasos.push(`<li class="tramo tramo--pendiente"></li>`);
    pasos.push(`
      <li class="parada parada--pendiente">
        <span class="parada__marca" aria-hidden="true"></span>
        <div class="parada__texto"><strong>${esc(ctx.nodos.get(id)?.nombre ?? id)}</strong><span class="texto-tenue">pendiente</span></div>
      </li>`);
  });
  if (!carga.pesajes.length && pasos[0]?.includes('tramo--pendiente')) pasos.shift();
  return `<ol class="linea-tiempo" aria-label="Seguimiento de la carga">${pasos.join('')}</ol>`;
}

function opcionesPunto(carga, ctx) {
  const { recorrido, proximo } = puntosDeCarga(carga);
  const nodos = [...ctx.nodos.values()].filter(
    (n) => TIPOS_PESAJE.includes(n.tipo) && (n.tipo !== 'frente' || n.galeriaId === carga.galeriaId),
  );
  const orden = (n) => (recorrido.includes(n.id) ? recorrido.indexOf(n.id) : 100 + n.y);
  return opciones(
    nodos.sort((a, b) => orden(a) - orden(b)).map((n) => ({ valor: n.id, texto: `${n.nombre}${recorrido.includes(n.id) ? '' : ' (fuera del recorrido)'}` })),
    proximo,
  );
}

async function dibujarDetalle(contenedor, codigo) {
  const carga = buscarCargaPorCodigo(codigo);
  if (!carga) {
    contenedor.innerHTML = `<div class="vacio"><h2>Carga no encontrada</h2><p class="mono">${esc(codigo)}</p><a class="boton boton--primario" href="#/cargas">Ver cargas</a></div>`;
    return;
  }
  const config = estado.config();
  const ctx = { config, nodos: indexarPorId(estado.listar('nodos')), cuadrillas: indexarPorId(estado.listar('cuadrillas')) };
  const r = resumenCarga(carga, config, ctx.nodos);
  const galeria = estado.obtener('galerias', carga.galeriaId);
  const terminada = r.completa;
  const valoresPrevios = { peso: contenedor.querySelector('#form-pesaje [name=peso]')?.value ?? '' };

  contenedor.innerHTML = `
    <div class="pila">
      <a class="volver" href="#/cargas">← Todas las cargas</a>
      <section class="tarjeta tarjeta--elevada cabeza-carga">
        <div class="pila cabeza-carga__info">
          <div class="fila"><h2 class="mono cabeza-carga__codigo">${carga.codigo}</h2>
            ${r.sospechosa ? `<span class="insignia-sospechosa insignia-sospechosa--grande">${icono('estado-rojo')} Traslado sospechoso</span>` : ''}
            ${carga.simulado ? '<span class="chip chip--acento">Simulado</span>' : ''}</div>
          <div class="fila">
            <span class="chip chip--marca">${icono('casco')} ${esc(ctx.cuadrillas.get(carga.cuadrillaId)?.nombre ?? '')}</span>
            <span class="chip">${esc(galeria?.nombre ?? carga.galeriaId)} · ${galeria ? nombreNivel(galeria.nivel) : ''}</span>
            <span class="chip">${esc(nombreMineral(carga.mineral))}</span>
            <span class="chip mono">${numero(carga.volumen, 3)} m³</span>
            ${chipPureza(carga)}
          </div>
          <dl class="ficha__datos ficha__datos--anchas">
            <div><dt>Peso inicial</dt><dd class="mono">${r.pesoInicial != null ? `${numero(r.pesoInicial, 1)} kg` : '—'}</dd></div>
            <div><dt>Peso actual</dt><dd class="mono">${r.pesoFinal != null ? `${numero(r.pesoFinal, 1)} kg` : '—'}</dd></div>
            <div><dt>Pérdida total</dt><dd class="mono">${r.pesoInicial != null ? `${numero(r.perdidaTotal, 1)} kg · ${numero(r.porcentajeTotal, 1)} %` : '—'}</dd></div>
            <div><dt>Estado</dt><dd>${terminada ? 'En acopio' : carga.pesajes.length ? 'En camino' : 'Sin pesar'}</dd></div>
          </dl>
          <a class="boton boton--secundario" href="#/pureza/${carga.codigo}">${icono('pureza')} ${carga.pureza == null ? 'Calcular pureza' : 'Ver o recalcular pureza'}</a>
        </div>
        <figure class="qr-carga">
          <div class="qr-carga__codigo" id="qr-carga"></div>
          <figcaption class="mono">${carga.codigo}</figcaption>
        </figure>
      </section>

      <section class="tarjeta pila">
        <h3 class="tarjeta__titulo">${icono('cargas')} Seguimiento tramo a tramo</h3>
        ${lineaDeTiempo(carga, ctx)}
      </section>

      ${
        !permite(usuarioActualId(), 'carga:pesar', { cuadrillaId: carga.cuadrillaId })
          ? `<p class="solo-lectura">${icono('info')} Solo lectura: esta carga la pesa la ${esc(ctx.cuadrillas.get(carga.cuadrillaId)?.nombre ?? 'cuadrilla')} o un ingeniero.</p>`
          : terminada
          ? `<p class="texto-secundario">${icono('estado-verde', { clase: 'icono-ok' })} La carga llegó al acopio: no admite más pesajes.</p>`
          : `<form class="tarjeta pila" id="form-pesaje" novalidate>
              <h3 class="tarjeta__titulo">${icono('balizas')} Registrar pesaje</h3>
              <div class="grilla grilla--compacta-2">
                <label class="campo"><span class="campo__etiqueta">Punto</span><select class="entrada" name="nodoId">${opcionesPunto(carga, ctx)}</select></label>
                <label class="campo"><span class="campo__etiqueta">Peso (kg)</span><input class="entrada entrada--mono" name="peso" inputmode="decimal" placeholder="900" value="${esc(valoresPrevios.peso)}"></label>
              </div>
              <span class="campo__error" id="error-pesaje" role="alert"></span>
              <button class="boton boton--primario" type="submit">Registrar pesaje</button>
            </form>`
      }
    </div>`;

  const QRCode = (await import('qrcode')).default;
  const destino = contenedor.querySelector('#qr-carga');
  if (destino) destino.innerHTML = await QRCode.toString(codigoQrDeCarga(carga.codigo), { type: 'svg', margin: 1 });

  contenedor.querySelector('#form-pesaje')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const error = contenedor.querySelector('#error-pesaje');
    const peso = leerNumero(f.peso.value);
    if (!(peso > 0)) {
      f.peso.setAttribute('aria-invalid', 'true');
      error.textContent = 'Ingresá el peso en kg: un número mayor que 0.';
      return;
    }
    try {
      const { tramo } = await registrarPesaje(carga.id, { nodoId: f.nodoId.value, peso });
      const entrada = contenedor.querySelector('#form-pesaje [name=peso]');
      if (entrada) entrada.value = '';
      avisar(tramo?.sospechoso ? `Pesaje registrado. ¡Tramo sospechoso: ${numero(tramo.porcentaje, 1)} % de pérdida!` : 'Pesaje registrado.', {
        tipo: tramo?.sospechoso ? 'error' : 'info',
      });
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

function renderDetalle(contenedor, codigo) {
  const dibujar = () => dibujarDetalle(contenedor, codigo);
  dibujar();
  return estado.suscribirse(dibujar, ['cargas', 'config', 'nodos']);
}

export default {
  render(contenedor, { params = [] } = {}) {
    return params[0] ? renderDetalle(contenedor, params[0]) : renderLista(contenedor);
  },
};
