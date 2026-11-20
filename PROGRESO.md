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
