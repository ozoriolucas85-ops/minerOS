// Pantalla Balizas (sección 3.3):
//   #/balizas            → Escanear (cámara con html5-qrcode + selector manual de respaldo)
//   #/balizas/imprimir   → QR imprimibles de cada punto (hoja A4, varios por hoja)

import { estado } from '../../state.js';
import { codigoDeBaliza, leerCodigoQr } from '../../domain/ubicacion.js';
import { registrarEscaneo } from '../../servicios/escaneos.js';
import { rutaDeSalidaDesde, describirCamino } from '../../servicios/ubicacion.js';
import { usuarioActualId } from '../../sesion.js';
import { icono } from '../components/iconos.js';
import { avisar } from '../components/aviso.js';
import { esc, hora, nombreNivel } from '../formato.js';
import { ahora } from '../../reloj.js';

const NOMBRE_TIPO = { boca: 'Boca de mina', acopio: 'Acopio', cruce: 'Cruce / punto', frente: 'Frente', refugio: 'Refugio' };

function pestanas(activa) {
  return `
    <nav class="pestanas" aria-label="Secciones de balizas">
      <a class="pestana" href="#/balizas" ${activa === 'escanear' ? 'aria-current="page"' : ''}>${icono('balizas')} Escanear</a>
      <a class="pestana" href="#/balizas/imprimir" ${activa === 'imprimir' ? 'aria-current="page"' : ''}>${icono('balizas')} Generar e imprimir QR</a>
    </nav>`;
}

function nombreNodo(n) {
  const galeria = n.galeriaId ? estado.obtener('galerias', n.galeriaId) : null;
  return galeria ? `${n.nombre} · ${galeria.id}` : n.nombre;
}

// ── Escanear ─────────────────────────────────────────────────────

function opcionesNodos() {
  const galerias = new Map(estado.listar('galerias').map((g) => [g.id, g]));
  return estado
    .listar('nodos')
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((n) => {
      const g = galerias.get(n.galeriaId);
      const cerrada = g?.bloqueada ? ' — CERRADA' : '';
      return `<option value="${n.id}">${esc(nombreNodo(n))}${cerrada}</option>`;
    })
    .join('');
}

function opcionesPersonas() {
  const actual = usuarioActualId();
  return estado
    .listar('usuarios')
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((u) => `<option value="${u.id}" ${u.id === actual ? 'selected' : ''}>${esc(u.nombre)} (${u.rol})</option>`)
    .join('');
}

function resultadoHtml({ ok, titulo, detalle, ruta }) {
  return `
    <div class="resultado-escaneo resultado-escaneo--${ok ? 'ok' : 'rechazo'}" role="status">
      ${icono(ok ? 'estado-verde' : 'estado-rojo', { clase: 'resultado-escaneo__icono' })}
      <div>
        <strong>${esc(titulo)}</strong>
        <p>${esc(detalle)}</p>
        ${ruta ? `<p class="resultado-escaneo__ruta">${icono('salida')} Ruta de salida: ${esc(ruta)}</p>` : ''}
      </div>
    </div>`;
}

function renderEscanear(contenedor) {
  contenedor.innerHTML = `
    <div class="pila">
      ${pestanas('escanear')}
      <div class="grilla grilla--escaneo">
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('balizas')} Escanear con la cámara</h3>
          <label class="campo"><span class="campo__etiqueta">Escanea</span>
            <select class="entrada" id="persona">${opcionesPersonas()}</select></label>
          <div class="camara" id="camara" aria-live="polite">
            <p class="texto-tenue">Apuntá la cámara al código QR de la baliza.</p>
          </div>
          <div class="fila">
            <button class="boton boton--primario boton--grande" id="boton-camara">${icono('balizas')} Abrir cámara</button>
            <button class="boton boton--secundario" id="boton-detener" hidden>Detener</button>
          </div>
          <p class="campo__ayuda">La cámara necesita permiso del navegador y una conexión segura (https o localhost).</p>
        </section>
        <section class="tarjeta pila">
          <h3 class="tarjeta__titulo">${icono('mapa')} Sin cámara: elegir la baliza</h3>
          <label class="campo"><span class="campo__etiqueta">Baliza</span>
            <select class="entrada" id="baliza-manual">${opcionesNodos()}</select></label>
          <button class="boton boton--secundario boton--grande" id="boton-manual">Registrar paso por esta baliza</button>
          <div id="resultado"></div>
        </section>
      </div>
    </div>`;

  const resultado = contenedor.querySelector('#resultado');
  const persona = () => contenedor.querySelector('#persona').value;

  async function procesar(nodoId) {
    try {
      const { nodo, adentro } = await registrarEscaneo({ nodoId, usuarioId: persona() });
      const ruta = adentro ? rutaDeSalidaDesde(nodo.id) : null;
      resultado.innerHTML = resultadoHtml({
        ok: true,
        titulo: `Registrado: ${nodo.nombre}`,
        detalle: `${hora(ahora())} · ${adentro ? 'adentro de la mina' : 'afuera: la chapa volvió al tablero'}`,
        ruta: ruta && ruta.camino.length > 1 ? describirCamino(ruta.camino) : null,
      });
    } catch (error) {
      resultado.innerHTML = resultadoHtml({ ok: false, titulo: 'Escaneo rechazado', detalle: error.message });
    }
  }

  contenedor.querySelector('#boton-manual').addEventListener('click', () => procesar(contenedor.querySelector('#baliza-manual').value));

  // Cámara: html5-qrcode se carga solo cuando se usa.
  let lector = null;
  const botonCamara = contenedor.querySelector('#boton-camara');
  const botonDetener = contenedor.querySelector('#boton-detener');
  async function detener() {
    if (lector) {
      try {
        await lector.stop();
      } catch {
        /* ya estaba detenida */
      }
      lector = null;
    }
    botonCamara.hidden = false;
    botonDetener.hidden = true;
  }
  botonCamara.addEventListener('click', async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      lector = new Html5Qrcode('camara');
      let ultimo = '';
      await lector.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (texto) => {
          if (texto === ultimo) return; // evita registrar el mismo QR varias veces seguidas
          ultimo = texto;
          setTimeout(() => (ultimo = ''), 4000);
          const codigo = leerCodigoQr(texto);
          if (codigo?.tipo !== 'baliza') {
            resultado.innerHTML = resultadoHtml({ ok: false, titulo: 'Código no reconocido', detalle: 'Ese QR no es una baliza de Canario.' });
            return;
          }
          await procesar(codigo.valor);
        },
      );
      botonCamara.hidden = true;
      botonDetener.hidden = false;
    } catch (error) {
      lector = null;
      avisar(`No se pudo abrir la cámara: ${error?.message ?? error}. Usá el selector manual.`, { tipo: 'error', duracion: 6000 });
    }
  });
  botonDetener.addEventListener('click', detener);
  return detener;
}

// ── Imprimir QR ──────────────────────────────────────────────────

async function renderImprimir(contenedor) {
  const nodos = estado.listar('nodos').sort((a, b) => a.y - b.y || a.x - b.x);
  contenedor.innerHTML = `
    <div class="pila">
      ${pestanas('imprimir')}
      <div class="fila no-imprimir">
        <p class="texto-secundario" style="margin:0;flex:1">${nodos.length} balizas · 12 por hoja A4. Imprimí, recortá y colocá cada QR en su punto de la mina.</p>
        <button class="boton boton--primario" id="boton-imprimir">${icono('balizas')} Imprimir</button>
      </div>
      <div class="hojas-qr" id="hojas"><p class="texto-tenue">Generando códigos…</p></div>
    </div>`;
  contenedor.querySelector('#boton-imprimir').addEventListener('click', () => window.print());

  const QRCode = (await import('qrcode')).default;
  const tarjetas = await Promise.all(
    nodos.map(async (n) => {
      const svg = await QRCode.toString(codigoDeBaliza(n.id), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
      const galeria = n.galeriaId ? estado.obtener('galerias', n.galeriaId) : null;
      return `
        <figure class="qr">
          <div class="qr__codigo">${svg}</div>
          <figcaption>
            <strong class="qr__nombre">${esc(n.nombre)}</strong>
            <span class="qr__detalle">${NOMBRE_TIPO[n.tipo] ?? n.tipo}${galeria ? ` · ${esc(galeria.nombre)} · ${nombreNivel(galeria.nivel)}` : ''}</span>
            <span class="qr__id mono">${esc(n.id)}</span>
          </figcaption>
        </figure>`;
    }),
  );
  const POR_HOJA = 12;
  const hojas = [];
  for (let i = 0; i < tarjetas.length; i += POR_HOJA) hojas.push(tarjetas.slice(i, i + POR_HOJA));
  const destino = contenedor.querySelector('#hojas');
  if (!destino) return; // se cambió de pantalla mientras se generaban
  destino.innerHTML = hojas
    .map(
      (h, i) => `
      <section class="hoja-a4" aria-label="Hoja ${i + 1} de ${hojas.length}">
        <header class="hoja-a4__cabeza"><span class="logo__texto">CANARIO</span><span>${esc(estado.config()?.nombreMina ?? '')} · Balizas · hoja ${i + 1}/${hojas.length}</span></header>
        <div class="hoja-a4__grilla">${h.join('')}</div>
      </section>`,
    )
    .join('');
}

export default {
  render(contenedor, { params = [] } = {}) {
    if (params[0] === 'imprimir') {
      renderImprimir(contenedor);
      return null;
    }
    return renderEscanear(contenedor);
  },
};

