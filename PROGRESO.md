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
