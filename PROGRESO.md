# Progreso — Canario (AGO Soluciones)

## Fase 0 — Base del proyecto ✅ (2026-11-20)

- Proyecto Vite en JavaScript vanilla (ES modules), sin framework.
- Estructura de carpetas de la sección 6 de CLAUDE.md (`src/storage`, `src/domain`, `src/ui/components`, `src/ui/screens`, `src/sim`, `src/data`, `src/styles`, `public`, `tests`). Los archivos de fases futuras quedaron como esqueletos comentados.
- Vitest configurado en `vite.config.js` (tests en `tests/**/*.test.js`, cobertura sobre `src/domain/`).
- Test de ejemplo: `tests/utilidades.test.js` sobre `acotar()` (utilidad pura que se va a usar en pureza y estabilidad).
- Scripts npm: `dev`, `build`, `preview`, `test`, `test:watch`, `coverage`.
- `.gitignore` para node_modules, dist, coverage, .env, etc.

**Verificación:** `npm test` ✔ (2 tests) · `npm run build` ✔ · `npm run dev` abre la página en http://localhost:5173 ✔

**Cómo levantarlo:** `npm install` y después `npm run dev`.

## Fase 1 — Sistema de diseño y navegación ✅ (2026-11-20)

**Decisiones aprobadas:** paleta "Ámbar + cobre" y las 4 tipografías de CLAUDE.md.

- `src/styles/tokens.css`: todos los valores visuales. Roca casi negra (`#12100E`), superficies pizarra cálida, textos pergamino/hueso, acento ámbar luz de casco (`#EE9A3A`) para acciones y foco, cobre/terracota (`#A84B24`) para marca y menú activo, oro viejo (`#E8C89A`) como secundario. Semáforo reservado: verde `#2FBF71`, amarillo `#FFD60A`, rojo `#E5383B`. Más espacios, radios, sombras, tamaños táctiles (48 px mínimo, pensado para guantes) y tiempos de animación.
- Tipografías con @fontsource (subset latin, incluidas en el build y sin conexión): Barlow Condensed 600, Barlow 400/500, JetBrains Mono 400/500 y Saira Stencil One.
- `src/styles/base.css`: reset, tipografía, botones (primario, secundario, fantasma, peligro, grande, ícono), tarjetas, cifras KPI, formularios con estado de error, chips y la insignia de estado del semáforo (color + ícono + texto).
- `src/styles/layout.css`: escritorio (≥1100 px) con barra lateral completa, tablet (768–1099 px) con barra lateral de íconos y celular (<768 px) con barra inferior (Panel, Mapa, Chapas, Galerías + "Más").
- `src/ui/components/iconos.js`: set de íconos SVG inline, incluidos los tres de estado (círculo ✓, triángulo !, octógono ✕).
- `src/router.js`: router por hash con parámetros (`#/galerias/G3`) y pantalla 404.
- `src/ui/shell.js` + `src/ui/screens/`: las 11 pantallas de la sección 4, cada una con su título (provisorias), más `#/estilos` con todo el sistema visual.
- Test nuevo: `tests/router.test.js`.

**Verificación:** `npm test` ✔ (5 tests) · `npm run build` ✔ · navegador: las 11 rutas, `#/estilos` y la 404 funcionan; se probó a 1440 px (lateral completa), 1057 px (lateral de íconos) y 390 px (barra inferior y hoja "Más"); fuentes cargadas; sin errores en consola.

## Fase 2 — Datos y mina de demostración ✅ (2026-11-20)

- `src/storage/index.js`: interfaz común documentada (`obtener`, `listar`, `guardar`, `guardarVarios`, `borrar`, `reemplazarTodo`, `exportar`, `estaVacio`, `suscribirse`). Todos los métodos devuelven Promesas, así Firebase entra después sin tocar el resto. Incluye `crearStorage(modo)` y `generarId()`.
- `src/storage/local.js`: adaptador localStorage (una clave por colección, `canario:v1:<colección>`). Devuelve copias, tolera JSON dañado y avisa los cambios hechos desde otras pestañas.
- `src/state.js`: estado global con caché en memoria (lecturas sincrónicas para la UI) y suscripción a cambios, filtrable por colección. Carga el seed la primera vez y tiene `restablecerDemo()`. Exporta la instancia `estado`.
- `src/data/seed.js`: "Mina La Esperanza" con 3 niveles (−20/−40/−60 m), 6 galerías (dura, media y blanda), 17 balizas (boca, acopio, 3 cruces de rampa, puntos intermedios, 6 frentes y 2 refugios) y 16 tramos. 1 ingeniero y 3 cuadrillas con capataz y 4–5 trabajadores cada una, un turno actual y 8 trabajadores ya adentro (escaneos). La config trae los valores por defecto.
  - Agregados al modelo: `cuadrillas.galeriaIds` (galerías asignadas) y, en `config`, `penalizacionVelocidad` (1,25), `penalizacionFisuras` (20), `pureza {alta: 80, media: 50}` y `nombreMina`. Así ningún número de negocio queda escrito a mano.
  - Los PIN de demo están en texto plano; en la fase 10 pasan a hash.
- Configuración: resumen de datos y botón "Restablecer demo" con diálogo de confirmación propio (`ui/components/confirmar.js`) y aviso (`ui/components/aviso.js`).
- Ajustes de diseño: el botón destructivo pasó a cobre de marca (el rojo queda solo para el semáforo) y se sacó el contorno de foco del `<main>`.
- Tests nuevos: `storage.test.js`, `state.test.js`, `seed.test.js`.

**Verificación:** `npm test` ✔ (33 tests) · `npm run build` ✔ · navegador: se ven las 12 claves `canario:v1:*` en Local Storage; un cambio sobrevive a la recarga; "Restablecer demo" (con clic real y confirmación) vuelve todo al estado inicial.
