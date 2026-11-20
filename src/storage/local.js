// Adaptador de persistencia sobre localStorage.
// Cada colección se guarda en una clave propia como objeto { id: elemento }.
// Recibe el almacén por parámetro para poder testearlo con uno falso.

const PREFIJO_POR_DEFECTO = 'canario:v1';

const copiar = (valor) => (valor == null ? valor : structuredClone(valor));

/**
 * @param {{ almacen: Storage, prefijo?: string, ventana?: Window }} opciones
 */
export function crearAlmacenLocal({ almacen, prefijo = PREFIJO_POR_DEFECTO, ventana = globalThis.window } = {}) {
  if (!almacen) throw new Error('crearAlmacenLocal necesita un almacén (localStorage)');

  const suscriptores = new Set();
  const clave = (coleccion) => `${prefijo}:${coleccion}`;
  const claveMeta = `${prefijo}:meta`;

  function leer(coleccion) {
    const crudo = almacen.getItem(clave(coleccion));
    if (!crudo) return {};
    try {
      return JSON.parse(crudo);
    } catch {
      return {};
    }
  }

  function escribir(coleccion, mapa) {
    almacen.setItem(clave(coleccion), JSON.stringify(mapa));
  }

  function avisar(cambio) {
    for (const fn of suscriptores) fn(cambio);
  }

  function validar(objeto) {
    if (!objeto || typeof objeto !== 'object' || !objeto.id) {
      throw new Error('Cada elemento guardado necesita un "id"');
    }
  }

  // Cambios hechos desde otra pestaña del mismo navegador.
  if (ventana?.addEventListener) {
    ventana.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith(`${prefijo}:`)) return;
      const coleccion = e.key.slice(prefijo.length + 1);
      if (coleccion !== 'meta') avisar({ coleccion, tipo: 'externo' });
    });
  }

  return {
    async obtener(coleccion, id) {
      return copiar(leer(coleccion)[id] ?? null);
    },

    async listar(coleccion, filtro) {
      const lista = Object.values(leer(coleccion));
      return copiar(filtro ? lista.filter(filtro) : lista);
    },

    async guardar(coleccion, objeto) {
      validar(objeto);
      const mapa = leer(coleccion);
      mapa[objeto.id] = copiar(objeto);
      escribir(coleccion, mapa);
      avisar({ coleccion, tipo: 'guardar', id: objeto.id });
      return copiar(objeto);
    },

    async guardarVarios(coleccion, lista) {
      lista.forEach(validar);
      const mapa = leer(coleccion);
      for (const objeto of lista) mapa[objeto.id] = copiar(objeto);
      escribir(coleccion, mapa);
      avisar({ coleccion, tipo: 'guardar' });
      return copiar(lista);
    },

    async borrar(coleccion, id) {
      const mapa = leer(coleccion);
      if (!(id in mapa)) return false;
      delete mapa[id];
      escribir(coleccion, mapa);
      avisar({ coleccion, tipo: 'borrar', id });
      return true;
    },

    async reemplazarTodo(datos) {
      // Borra todas las colecciones de Canario y escribe las nuevas.
      const claves = [];
      for (let i = 0; i < almacen.length; i++) {
        const k = almacen.key(i);
        if (k && k.startsWith(`${prefijo}:`)) claves.push(k);
      }
      claves.forEach((k) => almacen.removeItem(k));
      for (const [coleccion, lista] of Object.entries(datos)) {
        lista.forEach(validar);
        escribir(coleccion, Object.fromEntries(lista.map((o) => [o.id, o])));
      }
      almacen.setItem(claveMeta, JSON.stringify({ creado: Date.now() }));
      avisar({ coleccion: '*', tipo: 'reemplazar' });
    },

    async exportar() {
      const salida = {};
      for (let i = 0; i < almacen.length; i++) {
        const k = almacen.key(i);
        if (!k || !k.startsWith(`${prefijo}:`) || k === claveMeta) continue;
        const coleccion = k.slice(prefijo.length + 1);
        salida[coleccion] = Object.values(leer(coleccion));
      }
      return copiar(salida);
    },

    async estaVacio() {
      return almacen.getItem(claveMeta) === null;
    },

    suscribirse(fn) {
      suscriptores.add(fn);
      return () => suscriptores.delete(fn);
    },
  };
}
