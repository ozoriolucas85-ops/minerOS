// Gráficos con Chart.js, con colores y tipografías de tokens.css.
// Una sola serie por gráfico (ámbar): verde/amarillo/rojo quedan para los estados.

import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

function token(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function tema() {
  return {
    serie: token('--color-acento'),
    serieTenue: token('--color-acento-tenue'),
    texto: token('--color-texto-2'),
    tenue: token('--color-texto-3'),
    grilla: token('--color-borde'),
    superficie: token('--color-superficie'),
    fuente: token('--fuente-texto') || 'Barlow',
    mono: token('--fuente-mono') || 'monospace',
  };
}

const formato = (n, d = 1) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: d }).format(n);

function opcionesBase(t, unidad) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false }, // una sola serie: el título del gráfico la nombra
      tooltip: {
        backgroundColor: t.superficie,
        borderColor: t.grilla,
        borderWidth: 1,
        titleColor: t.texto,
        bodyColor: t.texto,
        titleFont: { family: t.fuente, weight: '600' },
        bodyFont: { family: t.mono },
        padding: 10,
        callbacks: { label: (ctx) => ` ${formato(ctx.parsed.y ?? ctx.parsed.x)} ${unidad}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: t.grilla },
        ticks: { color: t.tenue, font: { family: t.fuente, size: 13 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: t.grilla, lineWidth: 1 },
        border: { display: false },
        ticks: { color: t.tenue, font: { family: t.mono, size: 12 }, callback: (v) => `${formato(v)} ${unidad}` },
      },
    },
  };
}

/** Barras verticales (p. ej. toneladas por cuadrilla). */
export function graficoBarras(canvas, { etiquetas, valores, unidad = 't', nombre }) {
  const t = tema();
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{ label: nombre, data: valores, backgroundColor: t.serie, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', maxBarThickness: 56 }],
    },
    options: opcionesBase(t, unidad),
  });
}

/** Línea con área suave (p. ej. evolución por turno). */
export function graficoLinea(canvas, { etiquetas, valores, unidad = 't', nombre }) {
  const t = tema();
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: nombre,
          data: valores,
          borderColor: t.serie,
          backgroundColor: t.serieTenue,
          fill: true,
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: t.serie,
          pointBorderColor: t.superficie,
          pointBorderWidth: 2,
        },
      ],
    },
    options: opcionesBase(t, unidad),
  });
}

/** Reemplaza los datos de un gráfico existente. */
export function actualizarGrafico(grafico, { etiquetas, valores }) {
  grafico.data.labels = etiquetas;
  grafico.data.datasets[0].data = valores;
  grafico.update();
}
