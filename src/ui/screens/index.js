// Registro de pantallas (sección 4 de CLAUDE.md).
// `inferior: true` → aparece en la barra inferior del celular (máx. 4 + "Más").
import ingreso from './ingreso.js';
import panel from './panel.js';
import mapa from './mapa.js';
import chapas from './chapas.js';
import galerias from './galerias.js';
import cargas from './cargas.js';
import pureza from './pureza.js';
import productividad from './productividad.js';
import balizas from './balizas.js';
import configuracion from './configuracion.js';
import simulador from './simulador.js';
import estilos from './estilos.js';

export const pantallas = [
  { ruta: 'panel', titulo: 'Panel general', tituloCorto: 'Panel', icono: 'panel', grupo: 'Operación', modulo: panel, inferior: true },
  { ruta: 'mapa', titulo: 'Mapa', tituloCorto: 'Mapa', icono: 'mapa', grupo: 'Operación', modulo: mapa, inferior: true },
  { ruta: 'chapas', titulo: 'Tablero de chapas', tituloCorto: 'Chapas', icono: 'chapas', grupo: 'Operación', modulo: chapas, inferior: true },
  { ruta: 'galerias', titulo: 'Galerías', tituloCorto: 'Galerías', icono: 'galerias', grupo: 'Operación', modulo: galerias, inferior: true },
  { ruta: 'cargas', titulo: 'Cargas', tituloCorto: 'Cargas', icono: 'cargas', grupo: 'Material', modulo: cargas },
  { ruta: 'pureza', titulo: 'Pureza', tituloCorto: 'Pureza', icono: 'pureza', grupo: 'Material', modulo: pureza },
  { ruta: 'productividad', titulo: 'Productividad', tituloCorto: 'Productividad', icono: 'productividad', grupo: 'Material', modulo: productividad },
  { ruta: 'balizas', titulo: 'Balizas', tituloCorto: 'Balizas', icono: 'balizas', grupo: 'Ubicación', modulo: balizas },
  { ruta: 'simulador', titulo: 'Simulador', tituloCorto: 'Simulador', icono: 'simulador', grupo: 'Sistema', modulo: simulador },
  { ruta: 'configuracion', titulo: 'Configuración', tituloCorto: 'Config.', icono: 'configuracion', grupo: 'Sistema', modulo: configuracion },
  { ruta: 'ingreso', titulo: 'Ingreso', tituloCorto: 'Ingreso', icono: 'ingreso', grupo: 'Sistema', modulo: ingreso },
  // Página interna para revisar el sistema visual (no aparece en el menú).
  { ruta: 'estilos', titulo: 'Sistema de diseño', tituloCorto: 'Estilos', icono: 'estilos', grupo: 'Interno', modulo: estilos, oculta: true },
];

export const rutaInicial = 'panel';

export function buscarPantalla(ruta) {
  return pantallas.find((p) => p.ruta === ruta);
}
