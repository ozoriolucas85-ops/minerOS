// Exportación a CSV (separador ";" y coma decimal, como lo abre Excel en español).

function celda(valor) {
  if (valor == null) return '';
  const texto = typeof valor === 'number' ? String(Math.round(valor * 100) / 100).replace('.', ',') : String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * @param {Array<{ titulo: string, valor: (fila) => any }>} columnas
 * @param {object[]} filas
 */
export function aCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(';')];
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(';'));
  return `﻿${lineas.join('\r\n')}\r\n`; // BOM para que Excel respete los acentos
}

/** Descarga un texto como archivo. */
export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
