// Formato de números, fechas y horas para la interfaz (es-AR: coma decimal).

const formatos = new Map();
function formateador(decimales) {
  if (!formatos.has(decimales)) {
    formatos.set(
      decimales,
      new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: decimales }),
    );
  }
  return formatos.get(decimales);
}

/** 62.5 → "62,5" */
export function numero(valor, decimales = 1) {
  if (valor == null || Number.isNaN(valor)) return '—';
  return formateador(decimales).format(valor);
}

/** Timestamp → "14:32" */
export function hora(timestamp) {
  if (timestamp == null) return '—';
  return new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** Timestamp → "20/11 14:32" */
export function fechaHora(timestamp) {
  if (timestamp == null) return '—';
  const d = new Date(timestamp);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${hora(timestamp)}`;
}

/** Minutos → "hace 5 min" / "hace 1 h 20 min" */
export function haceCuanto(minutos) {
  if (minutos == null) return 'sin escaneos';
  const m = Math.max(0, Math.round(minutos));
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `hace ${h} h ${resto} min` : `hace ${h} h`;
}

/** Nombre del tipo de roca para mostrar. */
export function nombreRoca(roca) {
  return { dura: 'Roca dura', media: 'Roca media', blanda: 'Roca blanda' }[roca] ?? roca;
}

/** Nivel −40 → "Nivel −40 m" */
export function nombreNivel(nivel) {
  return `Nivel ${String(nivel).replace('-', '−')} m`;
}

/** Lee un número escrito por el usuario ("1,5" o "1.5"). Vacío o inválido → NaN. */
export function leerNumero(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  if (limpio === '') return NaN;
  return Number(limpio);
}

/** Escapa texto para insertarlo en HTML. */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
