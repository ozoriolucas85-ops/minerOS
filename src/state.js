// Estado global de Canario.
// Mantiene en memoria una copia de todas las colecciones (lecturas sincrónicas
// para la UI) y escribe a través de la capa storage. Avisa a los suscriptores
// cada vez que algo cambia, venga de esta pestaña o de otra.

import { COLECCIONES } from './storage/index.js';

/**
 * Completa una config guardada con los valores por defecto (un nivel de
 * profundidad), para que los campos agregados en versiones nuevas existan.
 */
export function completarConfig(guardada, porDefecto) {
  if (!guardada) return porDefecto ? structuredClone(porDefecto) : null;
  if (!porDefecto) return guardada;
  const resultado = { ...structuredClone(porDefecto), ...guardada };
  for (const [clave, valor] of Object.entries(porDefecto)) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      resultado[clave] = { ...valor, ...(guardada[clave] ?? {}) };
    }
  }
  return resultado;
}

/**
 * @param {{ crearSeed: () => Record<string, object[]>, configPorDefecto?: object }} opciones
 */
export function crearEstado({ crearSeed, configPorDefecto } = {}) {
  let storage = null;
  /** @type {Record<string, Map<string, object>>} */
  const cache = {};
  const suscriptores = new Set();

  const vaciarCache = () => {
    for (const c of COLECCIONES) cache[c] = new Map();
  };
  vaciarCache();

  function avisar(cambio) {
    for (const fn of suscriptores) {
      try {
        fn(cambio);
      } catch (error) {
        console.error('Error en un suscriptor del estado', error);
      }
    }
  }

  async function recargar(coleccion) {
    const lista = await storage.listar(coleccion);
    cache[coleccion] = new Map(lista.map((o) => [o.id, o]));
  }

  async function recargarTodo() {
    vaciarCache();
    await Promise.all(COLECCIONES.map(recargar));
  }

  function exigirIniciado() {
    if (!storage) throw new Error('El estado no está iniciado: llamá a iniciar(storage) primero');
  }

  return {
    /**
     * Conecta el estado al storage. Si está vacío, carga la mina demo.
     * @returns {Promise<{ sembrado: boolean }>}
     */
    async iniciar(nuevoStorage) {
      storage = nuevoStorage;
      let sembrado = false;
      if ((await storage.estaVacio()) && crearSeed) {
        await storage.reemplazarTodo(crearSeed());
        sembrado = true;
      }
      await recargarTodo();
      // Cambios hechos desde otra pestaña: recargar y avisar.
      storage.suscribirse(async (cambio) => {
        if (cambio.tipo !== 'externo') return;
        await recargar(cambio.coleccion);
        avisar(cambio);
      });
      return { sembrado };
    },

    /** Lista de elementos de una colección (copia superficial del arreglo). */
    listar(coleccion, filtro) {
      const lista = [...(cache[coleccion]?.values() ?? [])];
      return filtro ? lista.filter(filtro) : lista;
    },

    obtener(coleccion, id) {
      return cache[coleccion]?.get(id) ?? null;
    },

    /** La configuración general (documento único con id "general"). */
    config() {
      return completarConfig(cache.config.get('general'), configPorDefecto);
    },

    async guardar(coleccion, objeto) {
      exigirIniciado();
      const guardado = await storage.guardar(coleccion, objeto);
      cache[coleccion].set(guardado.id, guardado);
      avisar({ coleccion, tipo: 'guardar', id: guardado.id });
      return guardado;
    },

    async guardarVarios(coleccion, lista) {
      exigirIniciado();
      const guardados = await storage.guardarVarios(coleccion, lista);
      for (const o of guardados) cache[coleccion].set(o.id, o);
      avisar({ coleccion, tipo: 'guardar' });
      return guardados;
    },

    async borrar(coleccion, id) {
      exigirIniciado();
      const borrado = await storage.borrar(coleccion, id);
      cache[coleccion].delete(id);
      if (borrado) avisar({ coleccion, tipo: 'borrar', id });
      return borrado;
    },

    /** Vuelve todo al estado inicial de la mina demo. */
    async restablecerDemo() {
      exigirIniciado();
      await storage.reemplazarTodo(crearSeed());
      await recargarTodo();
      avisar({ coleccion: '*', tipo: 'reemplazar' });
    },

    /** Cantidad de elementos por colección (para resúmenes). */
    resumen() {
      return Object.fromEntries(COLECCIONES.map((c) => [c, cache[c].size]));
    },

    /**
     * Escucha cambios. Si se pasan colecciones, solo avisa por esas (o por un reemplazo total).
     * @returns {() => void} función para desuscribirse
     */
    suscribirse(fn, colecciones) {
      const envoltura = colecciones
        ? (cambio) => {
            if (cambio.coleccion === '*' || colecciones.includes(cambio.coleccion)) fn(cambio);
          }
        : fn;
      suscriptores.add(envoltura);
      return () => suscriptores.delete(envoltura);
    },
  };
}

// Instancia única que usa la aplicación (se conecta al storage en main.js).
import { crearSeed, CONFIG_POR_DEFECTO } from './data/seed.js';
export const estado = crearEstado({ crearSeed, configPorDefecto: CONFIG_POR_DEFECTO });
