// Sesión del usuario actual.
// Hasta la fase 10 (ingreso y roles) la app trabaja como el ingeniero de la demo.

const USUARIO_POR_DEFECTO = 'U-ING';
let usuarioId = USUARIO_POR_DEFECTO;
const suscriptores = new Set();

export function usuarioActualId() {
  return usuarioId;
}

export function cambiarUsuario(id) {
  usuarioId = id;
  suscriptores.forEach((fn) => fn(usuarioId));
}

export function suscribirseASesion(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}
