// Almacén en memoria que imita a localStorage, para los tests.
export function crearAlmacenFalso() {
  const datos = new Map();
  return {
    get length() {
      return datos.size;
    },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    clear: () => datos.clear(),
  };
}
