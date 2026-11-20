// Ubicación de las personas: quién está adentro, dónde y "sin señal" (sección 3.3).

import { ErrorDeValidacion } from './utilidades.js';

const MS_POR_MINUTO = 60 * 1000;

/** Puntos "afuera": la superficie. Todo lo demás (incluidos refugios) es adentro. */
const TIPOS_SUPERFICIE = new Set(['boca', 'acopio']);

const esSubterraneo = (nodo) => Boolean(nodo) && !TIPOS_SUPERFICIE.has(nodo.tipo);

/** Escaneos de un usuario ordenados por hora. */
export function escaneosDe(escaneos, usuarioId) {
  return escaneos.filter((e) => e.usuarioId === usuarioId).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Recorre los escaneos de una persona y dice si está adentro.
 * Escanear la boca viniendo de adentro = salió; viniendo de afuera = entró
 * (queda "adentro", en la boca). Escanear el acopio = afuera.
 * @returns {{ adentro: boolean, ultimo: object|null, entrada: object|null }}
 *   entrada = escaneo con el que entró en la visita actual
 */
export function estadoDePersona(escaneosUsuario, nodosPorId) {
  let adentro = false;
  let ultimo = null;
  let entrada = null;
  let anteriorSubterraneo = false;
  for (const e of escaneosUsuario) {
    const nodo = nodosPorId.get(e.nodoId);
    if (!nodo) continue;
    if (nodo.tipo === 'boca') {
      if (anteriorSubterraneo) {
        adentro = false;
        entrada = null;
      } else if (!adentro) {
        adentro = true;
        entrada = e;
      }
    } else if (nodo.tipo === 'acopio') {
      adentro = false;
      entrada = null;
    } else {
      if (!adentro) entrada = e;
      adentro = true;
    }
    anteriorSubterraneo = esSubterraneo(nodo);
    ultimo = e;
  }
  return { adentro, ultimo, entrada };
}

/** true si pasó más tiempo que el configurado desde el último escaneo. */
export function estaSinSenal(ultimoTimestamp, ahora, minutosSinSenal) {
  return ahora - ultimoTimestamp > minutosSinSenal * MS_POR_MINUTO;
}

/**
 * Ubicación de cada persona.
 * @returns {Array<{ usuario, adentro, nodoId, galeriaId, ultimoEscaneo, minutosDesdeEscaneo, sinSenal }>}
 */
export function ubicarPersonas({ escaneos, usuarios, nodosPorId, ahora, config }) {
  return usuarios.map((usuario) => {
    const { adentro, ultimo } = estadoDePersona(escaneosDe(escaneos, usuario.id), nodosPorId);
    const nodo = ultimo ? nodosPorId.get(ultimo.nodoId) : null;
    return {
      usuario,
      adentro,
      nodoId: adentro ? (nodo?.id ?? null) : null,
      galeriaId: adentro ? (nodo?.galeriaId ?? null) : null,
      ultimoEscaneo: ultimo,
      minutosDesdeEscaneo: ultimo ? (ahora - ultimo.timestamp) / MS_POR_MINUTO : null,
      sinSenal: adentro && ultimo ? estaSinSenal(ultimo.timestamp, ahora, config.minutosSinSenal) : false,
    };
  });
}

/** Solo las personas que están adentro. */
export function quienEstaAdentro(datos) {
  return ubicarPersonas(datos).filter((p) => p.adentro);
}

/** Cantidad de personas adentro. */
export function personasAdentro(datos) {
  return quienEstaAdentro(datos).length;
}

/** Personas adentro de una galería. */
export function personasEnGaleria(ubicaciones, galeriaId) {
  return ubicaciones.filter((p) => p.adentro && p.galeriaId === galeriaId);
}

/** Agrupa las ubicaciones por galería (clave null = rampas, cruces y refugios). */
export function agruparPorGaleria(ubicaciones) {
  const grupos = new Map();
  for (const p of ubicaciones.filter((x) => x.adentro)) {
    const clave = p.galeriaId ?? null;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(p);
  }
  return grupos;
}

/**
 * Valida un escaneo: la baliza tiene que existir y no pertenecer a una
 * galería bloqueada (en rojo la baliza rechaza escaneos).
 */
export function validarEscaneo({ nodoId, nodosPorId, galeriasPorId }) {
  const nodo = nodosPorId.get(nodoId);
  if (!nodo) throw new ErrorDeValidacion('Baliza desconocida: el código no corresponde a ningún punto de la mina.');
  const galeria = nodo.galeriaId ? galeriasPorId.get(nodo.galeriaId) : null;
  if (galeria?.bloqueada) {
    throw new ErrorDeValidacion(`Acceso rechazado: ${galeria.nombre} está bloqueada por PELIGRO DE DERRUMBE.`);
  }
  return nodo;
}

// ── Códigos QR ───────────────────────────────────────────────────
// Formato: "CANARIO:BALIZA:<nodoId>" y "CANARIO:CARGA:<codigo>".

const PREFIJO_QR = 'CANARIO';

/** Texto que lleva el QR impreso de una baliza. */
export function codigoDeBaliza(nodoId) {
  return `${PREFIJO_QR}:BALIZA:${nodoId}`;
}

/** Texto que lleva el QR de una carga. */
export function codigoQrDeCarga(codigoCarga) {
  return `${PREFIJO_QR}:CARGA:${codigoCarga}`;
}

/**
 * Interpreta el texto leído de un QR.
 * @returns {{ tipo: 'baliza'|'carga', valor: string } | null}
 */
export function leerCodigoQr(texto) {
  const partes = String(texto ?? '').trim().split(':');
  if (partes.length !== 3 || partes[0] !== PREFIJO_QR || !partes[2]) return null;
  const tipo = { BALIZA: 'baliza', CARGA: 'carga' }[partes[1]];
  return tipo ? { tipo, valor: partes[2] } : null;
}
