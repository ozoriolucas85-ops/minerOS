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

## Fase 3 — Lógica de negocio con tests ✅ (2026-11-20)

Todo `src/domain/` es puro: recibe datos y `config`, devuelve resultados, sin DOM ni storage. Los errores de datos se lanzan como `ErrorDeValidacion`, con un mensaje en español que se puede mostrar tal cual.

- **semaforo.js**: `calcularEstabilidad`, `estadoDeEstabilidad`, `evaluarGaleria`, `aplicarAvance` (bloquea solo al llegar a rojo y registra `bloqueadaDesde`), `reportarFisuras`, `aplicarApuntalamiento` (lo único que sube la estabilidad; no desbloquea), `reiniciarTurno`, `validarDesbloqueo` (apuntalamiento posterior al bloqueo + ingeniero + capataz, personas distintas), `desbloquear`, `motivoBloqueo`, `limitesParaRoca` y los textos exactos de cada estado (`ESTADOS`).
  - Ejemplo: roca media (máx. 4 m), 1,5 m sin apuntalar → desgaste 37,5 → estabilidad 62,5 → verde. Con 4 m y avance de 2,5 m en el turno (máx. 2) → 100 × 1,25 = 125 → estabilidad 0 → rojo y bloqueo.
- **pureza.js**: `calcularDensidad`, `purezaPorDensidad` (acotada 0–100), `purezaManual`, `mineralUtil`, `clasificarPureza`, `sugerirModo` y `MINERALES`.
  - Ejemplo: hierro, 900 kg en 0,25 m³ → 3.600 kg/m³ = 3,6 g/cm³ → (3,6 − 2,6) / (5,2 − 2,6) = 38,5 % → 346 kg de mineral útil → Baja.
  - El modo manual se sugiere cuando el mineral y el estéril tienen casi la misma densidad (diferencia menor que `config.pureza.contrasteMinimo` = 10 %). Caliza difiere 4 % y cuarzo 2 % → manual; cobre 62 % y hierro 100 % → densidad.
- **traslados.js**: `calcularPerdida`, `esSospechoso`, `calcularTramos`, `resumenCarga`, `validarPesaje` (orden frente → cruce → boca → acopio, sin repetir y nada después del acopio), `validarNuevaCarga`, `filtrarTraslados`, `generarCodigoCarga`/`siguienteCodigo` (CAN-0042).
  - Ejemplo: 900 → 850 kg = 50 kg = 5,6 % > 3 % de tolerancia → sospechoso.
- **productividad.js**: `pesoEnAcopio`, `produccionCuadrilla`, `produccionPorTrabajador`, `horasEfectivas` (desde que escanea un frente hasta su siguiente escaneo en otro punto), `toneladasPorHora`, `calcularProductividad`, `rankingTrabajadores`, `evolucionPorTurno`.
- **ubicacion.js**: `estadoDePersona` (escanear la boca viniendo de adentro = salió; viniendo de afuera = entró), `ubicarPersonas`, `quienEstaAdentro`, `personasAdentro`, `personasEnGaleria`, `agruparPorGaleria`, `estaSinSenal`, `validarEscaneo` (rechaza balizas de galerías bloqueadas).
- **rutas.js**: `crearGrafo`, `bfs`, `rutaDeSalida` (boca o refugio más cercano en tramos, sin pasar por galerías bloqueadas; quien está dentro de una galería bloqueada puede usar sus tramos para salir), `hiloDeAriadna`, `caminoDelHilo` (rellena tramos entre balizas salteadas), `volverPorElHilo`.
- **utilidades.js**: `acotar`, `redondear`, `exigirPositivo`, `exigirNoNegativo`, `indexarPorId`, `ErrorDeValidacion`.
- Config: se agregó `pureza.contrasteMinimo`. `state.config()` ahora completa una config guardada con los campos por defecto nuevos (`completarConfig`), así no se rompen los datos guardados antes.

**Verificación:** `npm test` ✔ (159 tests, incluidos los 5 casos de verificación del plan y los bordes: peso 0, volumen 0, pureza negativa, sin camino de salida y umbrales exactos 15 y 40) · cobertura de `src/domain/` (`npm run coverage`): 100 % de líneas, sentencias y funciones, 96,6 % de ramas · `npm run build` ✔ · navegador: la app carga y el dominio corre con los datos reales (6 galerías en verde, 8 personas adentro, ruta G5-F → R2).
