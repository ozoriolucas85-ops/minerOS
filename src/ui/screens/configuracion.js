// Configuración (solo ingeniero): límites, tolerancias, umbrales, densidades,
// usuarios, cuadrillas, estructura de la mina y datos de demostración.

import { estado } from '../../state.js';
import { simulador } from '../../sim/simulador.js';
import { actualizarConfig } from '../../servicios/configuracion.js';
import { NOMBRE_ROL } from '../../domain/permisos.js';
import { nombreMineral } from '../../domain/pureza.js';
import { confirmar } from '../components/confirmar.js';
import { avisar } from '../components/aviso.js';
import { icono } from '../components/iconos.js';
import { esc, leerNumero, nombreRoca } from '../formato.js';

const coma = (n) => String(n).replace('.', ',');
const campo = (nombre, etiqueta, valor, ayuda = '') => `
  <label class="campo"><span class="campo__etiqueta">${etiqueta}</span>
    <input class="entrada entrada--mono" name="${nombre}" inputmode="decimal" value="${coma(valor)}">
    ${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ''}</label>`;

function dibujar(contenedor) {
  const c = estado.config();
  const resumen = estado.resumen();
  const cuadrillas = estado.listar('cuadrillas');
  const usuarios = estado.listar('usuarios').sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
  contenedor.innerHTML = `
    <div class="pila">
      <form class="tarjeta pila" id="form-config" novalidate>
        <h3 class="tarjeta__titulo">${icono('configuracion')} Seguridad y control</h3>
        <div class="grilla grilla--compacta-2">
          ${campo('toleranciaPerdida', 'Tolerancia de pérdida por tramo (%)', c.toleranciaPerdida, 'Más que esto marca el traslado como sospechoso.')}
          ${campo('minutosSinSenal', 'Minutos sin escanear para "sin señal"', c.minutosSinSenal)}
          ${campo('umbralVerde', 'Umbral verde (estabilidad >)', c.umbrales.verde, 'Por encima: puede seguir.')}
          ${campo('umbralRojo', 'Umbral rojo (estabilidad ≤)', c.umbrales.rojo, 'Igual o debajo: peligro y bloqueo.')}
        </div>
        <h4>Límites por defecto según la roca</h4>
        <p class="texto-tenue" style="margin:0">Se usan para galerías nuevas. Cada galería puede ajustarse en su ficha.</p>
        <div class="grilla grilla--compacta-2">
          ${['dura', 'media', 'blanda']
            .map(
              (r) => `${campo(`max-${r}`, `${nombreRoca(r)}: metros máx. sin apuntalar`, c.limitesPorRoca[r].metrosMax)}
                      ${campo(`vel-${r}`, `${nombreRoca(r)}: velocidad máx. (m/turno)`, c.limitesPorRoca[r].velocidadMax)}`,
            )
            .join('')}
        </div>
        <h4>Densidades (g/cm³)</h4>
        <div class="grilla grilla--compacta-2">
          ${Object.entries(c.densidades)
            .map(([m, d]) => campo(`dens-${m}`, m === 'esteril' ? 'Roca estéril' : nombreMineral(m), d))
            .join('')}
        </div>
        <ul class="campo__error" id="errores-config" role="alert"></ul>
        <button class="boton boton--primario" type="submit">Guardar configuración</button>
      </form>

      <section class="tarjeta pila">
        <h3 class="tarjeta__titulo">${icono('personas')} Usuarios y cuadrillas</h3>
        <div class="tabla-envoltura"><table class="tabla">
          <thead><tr><th>Nombre</th><th>Rol</th><th>Cuadrilla</th></tr></thead>
          <tbody>${usuarios
            .map(
              (u) => `<tr><td data-etiqueta="Nombre">${esc(u.nombre)}</td><td data-etiqueta="Rol">${NOMBRE_ROL[u.rol] ?? u.rol}</td>
                <td data-etiqueta="Cuadrilla">${esc(cuadrillas.find((q) => q.id === u.cuadrillaId)?.nombre ?? '—')}</td></tr>`,
            )
            .join('')}</tbody>
        </table></div>
        <p class="texto-tenue" style="margin:0">Los PIN se guardan con hash (SHA-256 con sal), nunca en texto plano.</p>
      </section>

      <section class="tarjeta">
        <h3 class="tarjeta__titulo">${icono('mapa')} ${esc(c.nombreMina ?? 'Mina')} · estructura y datos</h3>
        <div class="grilla grilla--compacta">
          ${[['galerias', 'Galerías'], ['nodos', 'Balizas'], ['aristas', 'Tramos'], ['usuarios', 'Usuarios'], ['cuadrillas', 'Cuadrillas'], ['escaneos', 'Escaneos'], ['cargas', 'Cargas'], ['eventos', 'Eventos']]
            .map(([k, t]) => `<div class="tarjeta tarjeta--elevada"><p class="etiqueta">${t}</p><span class="cifra">${resumen[k] ?? 0}</span></div>`)
            .join('')}
        </div>
      </section>

      <section class="tarjeta">
        <h3>Datos de demostración</h3>
        <p class="texto-secundario">Restablecer borra todo lo cargado y vuelve a la mina demo inicial: galerías, balizas, cuadrillas y valores por defecto.</p>
        <button class="boton boton--secundario" id="restablecer">${icono('simulador')} Restablecer demo</button>
      </section>
    </div>`;

  contenedor.querySelector('#form-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const n = (nombre) => leerNumero(f[nombre].value);
    const cambios = {
      toleranciaPerdida: n('toleranciaPerdida'),
      minutosSinSenal: n('minutosSinSenal'),
      umbrales: { verde: n('umbralVerde'), rojo: n('umbralRojo') },
      limitesPorRoca: Object.fromEntries(['dura', 'media', 'blanda'].map((r) => [r, { metrosMax: n(`max-${r}`), velocidadMax: n(`vel-${r}`) }])),
      densidades: Object.fromEntries(Object.keys(c.densidades).map((m) => [m, n(`dens-${m}`)])),
    };
    try {
      await actualizarConfig(cambios);
      avisar('Configuración guardada.');
    } catch (err) {
      contenedor.querySelector('#errores-config').innerHTML = `<li>${esc(err.message)}</li>`;
    }
  });

  contenedor.querySelector('#restablecer').addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: '¿Restablecer la mina demo?',
      mensaje: 'Se van a borrar todos los avances, cargas, escaneos y eventos de este dispositivo. No se puede deshacer.',
      aceptar: 'Restablecer',
      peligro: true,
    });
    if (!ok) return;
    await simulador.reiniciarDemo(); // también detiene el simulador y vuelve el reloj a la hora real
    avisar('Se restableció la mina demo.');
  });
}

export default {
  render(contenedor) {
    dibujar(contenedor);
    return estado.suscribirse(() => dibujar(contenedor), ['config', 'usuarios', 'cuadrillas', '*']);
  },
};
