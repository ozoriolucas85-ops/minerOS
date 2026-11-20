// Sesión del usuario actual. Se guarda en sessionStorage: sobrevive a una
// recarga pero se cierra al cerrar la pestaña.

const CLAVE = 'canario:sesion';
const almacen = () => globalThis.sessionStorage ?? null;
const suscriptores = new Set();

function leer() {
  try {
    return JSON.parse(almacen()?.getItem(CLAVE) ?? 'null')?.usuarioId ?? null;
  } catch {
    return null;
  }
}

let usuarioId = leer();

export function usuarioActualId() {
  return usuarioId;
}

export function cambiarUsuario(id) {
  usuarioId = id ?? null;
  if (usuarioId) almacen()?.setItem(CLAVE, JSON.stringify({ usuarioId }));
  else almacen()?.removeItem(CLAVE);
  suscriptores.forEach((fn) => fn(usuarioId));
}

export function suscribirseASesion(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}
