// Pantalla Productividad (sección 3.6): por turno, cuadrilla y trabajador.

import { estado } from '../../state.js';
import { productividadDelPeriodo } from '../../servicios/productividad.js';
import { graficoBarras, graficoLinea, actualizarGrafico } from '../components/graficos.js';
import { icono } from '../components/iconos.js';
import { aCsv, descargar } from '../csv.js';
import { esc, numero } from '../formato.js';

const etiquetaTurno = (t) => `${t.fecha.slice(8, 10)}/${t.fecha.slice(5, 7)} ${t.tipo}`;

function opcionesTurnos(seleccionado) {
  return estado
    .listar('turnos')
    .sort((a, b) => b.inicio - a.inicio)
    .map((t) => `<option value="${t.id}" ${t.id === seleccionado ? 'selected' : ''}>${etiquetaTurno(t)}${t.id === 'T-ACTUAL' ? ' (en curso)' : ''}</option>`)
    .join('');
}

function filaRanking(t, i, max, cuadrillas) {
  const ancho = t.toneladasPorHora != null && max > 0 ? (t.toneladasPorHora / max) * 100 : 0;
  return `
    <li class="ranking__fila">
      <span class="ranking__puesto mono">${i + 1}</span>
      <div class="ranking__nombre"><strong>${esc(t.nombre)}</strong><span class="texto-tenue">${esc(cuadrillas.get(t.cuadrillaId) ?? '')}</span></div>
      <div class="ranking__barra" aria-hidden="true"><span style="width:${ancho}%"></span></div>
      <span class="ranking__valor mono">${t.toneladasPorHora != null ? `${numero(t.toneladasPorHora, 2)} t/h` : '—'}</span>
    </li>`;
}

export default {
  render(contenedor) {
    const filtros = { turnoId: '', desde: '', hasta: '' };
    contenedor.innerHTML = `
      <div class="pila">
        <form class="filtros tarjeta" id="filtros-prod">
          <label class="campo"><span class="campo__etiqueta">Turno</span>
            <select class="entrada" name="turnoId"><option value="">Todos los turnos del rango</option>${opcionesTurnos('')}</select></label>
          <label class="campo"><span class="campo__etiqueta">Desde</span><input class="entrada" type="date" name="desde"></label>
          <label class="campo"><span class="campo__etiqueta">Hasta</span><input class="entrada" type="date" name="hasta"></label>
        </form>
        <div class="grilla kpis" id="kpis"></div>
        <div class="grilla grilla--graficos">
          <section class="tarjeta"><h3 class="tarjeta__titulo">${icono('productividad')} Toneladas por cuadrilla</h3><div class="grafico"><canvas id="g-cuadrillas" role="img" aria-label="Toneladas por cuadrilla"></canvas></div></section>
          <section class="tarjeta"><h3 class="tarjeta__titulo">${icono('productividad')} Evolución por turno</h3><div class="grafico"><canvas id="g-turnos" role="img" aria-label="Toneladas por turno"></canvas></div></section>
        </div>
        <section class="tarjeta"><h3 class="tarjeta__titulo">${icono('personas')} Ranking por toneladas por hora efectiva</h3><ol class="ranking" id="ranking"></ol></section>
        <section class="tarjeta pila">
          <div class="fila"><h3 class="tarjeta__titulo" style="margin:0;flex:1">${icono('cargas')} Detalle por trabajador</h3>
            <button class="boton boton--secundario" id="exportar">Exportar CSV</button></div>
          <div class="tabla-envoltura" id="tabla-prod"></div>
        </section>
      </div>`;

    let datos = null;
    let gCuadrillas = null;
    let gTurnos = null;

    function dibujar() {
      datos = productividadDelPeriodo(filtros);
      const cuadrillas = new Map(estado.listar('cuadrillas').map((c) => [c.id, c.nombre]));
      contenedor.querySelector('#kpis').innerHTML = `
        <div class="tarjeta tarjeta--elevada"><p class="etiqueta">Producción</p><span class="cifra">${numero(datos.toneladas, 1)}<span class="cifra__unidad">t</span></span><p class="texto-tenue">${datos.turnos.length} ${datos.turnos.length === 1 ? 'turno' : 'turnos'}</p></div>
        <div class="tarjeta tarjeta--elevada"><p class="etiqueta">Toneladas por hora efectiva</p><span class="cifra">${datos.toneladasPorHora != null ? numero(datos.toneladasPorHora, 2) : '—'}<span class="cifra__unidad">t/h</span></span><p class="texto-tenue">promedio de todas las cuadrillas</p></div>
        <div class="tarjeta tarjeta--elevada"><p class="etiqueta">Cargas en el acopio</p><span class="cifra">${datos.cargasEnAcopio}</span><p class="texto-tenue">pesadas al llegar</p></div>`;

      const barras = { etiquetas: datos.cuadrillas.map((c) => c.nombre.replace('Cuadrilla ', '')), valores: datos.cuadrillas.map((c) => Math.round(c.toneladas * 100) / 100) };
      const linea = { etiquetas: datos.evolucion.map((e) => etiquetaTurno(datos.turnos.find((t) => t.id === e.turnoId))), valores: datos.evolucion.map((e) => Math.round(e.toneladas * 100) / 100) };
      if (!gCuadrillas) gCuadrillas = graficoBarras(contenedor.querySelector('#g-cuadrillas'), { ...barras, nombre: 'Toneladas' });
      else actualizarGrafico(gCuadrillas, barras);
      if (!gTurnos) gTurnos = graficoLinea(contenedor.querySelector('#g-turnos'), { ...linea, nombre: 'Toneladas' });
      else actualizarGrafico(gTurnos, linea);

      const max = Math.max(0, ...datos.trabajadores.map((t) => t.toneladasPorHora ?? 0));
      contenedor.querySelector('#ranking').innerHTML = datos.trabajadores.slice(0, 10).map((t, i) => filaRanking(t, i, max, cuadrillas)).join('') || '<li class="texto-tenue">Sin datos en este período.</li>';

      contenedor.querySelector('#tabla-prod').innerHTML = `
        <table class="tabla">
          <thead><tr><th>Trabajador</th><th>Cuadrilla</th><th>Toneladas</th><th>Horas efectivas</th><th>t / hora</th></tr></thead>
          <tbody>${datos.trabajadores
            .map(
              (t) => `<tr><td data-etiqueta="Trabajador">${esc(t.nombre)}</td><td data-etiqueta="Cuadrilla">${esc(cuadrillas.get(t.cuadrillaId) ?? '')}</td>
                <td data-etiqueta="Toneladas" class="mono">${numero(t.toneladas, 2)}</td><td data-etiqueta="Horas" class="mono">${numero(t.horasEfectivas, 1)}</td>
                <td data-etiqueta="t / hora" class="mono">${t.toneladasPorHora != null ? numero(t.toneladasPorHora, 2) : '—'}</td></tr>`,
            )
            .join('')}</tbody>
        </table>`;
    }

    contenedor.querySelector('#filtros-prod').addEventListener('input', (e) => {
      const f = e.currentTarget.elements;
      Object.assign(filtros, { turnoId: f.turnoId.value, desde: f.desde.value, hasta: f.hasta.value });
      dibujar();
    });
    contenedor.querySelector('#exportar').addEventListener('click', () => {
      const cuadrillas = new Map(estado.listar('cuadrillas').map((c) => [c.id, c.nombre]));
      const csv = aCsv(
        [
          { titulo: 'Trabajador', valor: (t) => t.nombre },
          { titulo: 'Cuadrilla', valor: (t) => cuadrillas.get(t.cuadrillaId) },
          { titulo: 'Toneladas', valor: (t) => t.toneladas },
          { titulo: 'Horas efectivas', valor: (t) => t.horasEfectivas },
          { titulo: 'Toneladas por hora', valor: (t) => t.toneladasPorHora },
        ],
        datos.trabajadores,
      );
      descargar(`canario-productividad-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    });

    dibujar();
    const salir = estado.suscribirse(dibujar, ['cargas', 'escaneos', 'turnos', 'cuadrillas', 'usuarios']);
    return () => {
      salir();
      gCuadrillas?.destroy();
      gTurnos?.destroy();
    };
  },
};
