// Reloj de la aplicación. Normalmente es la hora real; el simulador de turno lo
// adelanta (un turno de 8 h en pocos minutos) y toda la app lo usa en vez de
// Date.now(), así "hace cuánto", "sin señal" y el turno en curso son coherentes.
// El desfase se guarda para que sobreviva a una recarga.

const CLAVE = 'canario:reloj';
const almacen = () => globalThis.localStorage ?? null;

function leer() {
  try {
    return Number(JSON.parse(almacen()?.getItem(CLAVE) ?? '0')) || 0;
  } catch {
    return 0;
  }
}

let desfase = leer();

function guardar() {
  almacen()?.setItem(CLAVE, JSON.stringify(desfase));
}

/** Hora actual de la app (ms). */
export function ahora() {
  return Date.now() + desfase;
}

/** Adelanta el reloj de la app. */
export function adelantar(ms) {
  desfase += ms;
  guardar();
}

/** Diferencia entre el reloj de la app y la hora real. */
export function desfaseActual() {
  return desfase;
}

/** Vuelve a la hora real. */
export function reiniciarReloj() {
  desfase = 0;
  guardar();
}
