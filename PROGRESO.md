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

## Fase 4 — Galerías, canario y bloqueo ✅ (2026-11-20)

- **Capa nueva `src/servicios/`** (une dominio y estado; la UI no calcula nada de negocio):
  - `galerias.js`: `registrarAvance`, `registrarApuntalamiento`, `registrarFisuras`, `desbloquearGaleria` (verifica los dos PIN, exige un apuntalamiento posterior al bloqueo y guarda en `desbloqueos` quién y cuándo) e `historialGaleria`. Cada cambio de estado, bloqueo, apuntalamiento, fisura y desbloqueo queda en `eventos`.
  - `ubicacion.js` (personas adentro y ruta de salida para la UI), `autenticacion.js` (`verificarPin`, único punto que compara PIN; pasa a hash en la fase 10) y `turnos.js` (`turnoActual`).
  - `src/sesion.js`: usuario actual (hasta la fase 10 es el ingeniero de la demo).
- **Componentes:** `canario.js` (SVG con 3 estados animados en CSS: canta con notas flotando, agitado temblando y con plumas erizadas, caído boca arriba con ojos en X), `bateria.js` (barra segmentada con % en mono, `role="meter"`), `estado.js` (insignia color + ícono + texto), `alarma.js` (alarma con Web Audio sin archivos, se desbloquea con el primer clic), `alertas.js` (banners globales).
- **Pantalla Galerías:** lista de fichas con resumen de estados; detalle `#/galerias/G3` con canario, batería, datos, formularios de avance (validado), apuntalamiento (con confirmación) y fisuras, personas en la galería con su ruta de salida, e historial.
- **Amarillo:** banner "EVACUACIÓN" parpadeante en todas las pantallas, alarma sonora con botón "Silenciar" (vuelve a sonar si aparece una alerta nueva) y lista de quién está en la galería con su ruta de salida (BFS).
- **Rojo:** banner "PELIGRO DE DERRUMBE", galería rayada con candado, formularios de avance deshabilitados y trabajadores adentro marcados como prioridad de rescate. Desbloqueo de dos llaves (ingeniero + PIN, capataz + PIN) con checklist de los 3 requisitos.
- En celular los banners son compactos y la lista de personas arranca cerrada. Se recuerda si el usuario la abre o la cierra.
- Lo que el usuario está escribiendo no se pierde cuando la pantalla se redibuja por cambios de datos.
- Test nuevo: `servicios-galerias.test.js`.

**Verificación:** `npm test` ✔ (167 tests) · `npm run build` ✔ · navegador con clics reales en G3: el formulario vacío muestra el error; 1 m → amarillo (banner, canario agitado, 37,5 %); 1,5 m → rojo y bloqueo automático (formularios deshabilitados, banner de rescate). Desbloqueo sin apuntalamiento → rechazado; apuntalamiento → ✓; PIN de capataz incorrecto → rechazado; PINs correctos → reabierta, con el historial completo. Banner y alarma visibles en otra pantalla (Panel); "Silenciar" apaga la alarma. Vista celular revisada a 390 px.

**Lista "Listo cuando":** ✔ verde → amarillo → rojo solo con cargar avances · ✔ en rojo no se puede cargar nada · ✔ el desbloqueo exige apuntalamiento y dos llaves · ✔ el estado se entiende sin color (texto + ícono + forma del canario).

## Fase 5 — Mapa en corte lateral ✅ (2026-11-20)

**Estilo aprobado:** A · "Corte geológico" (hormiguero), elegido entre dos bocetos generados con los datos reales.

- `src/ui/mapa/geometria.js` (pura y testeada): superficie, tamaño del lienzo, niveles calculados desde los nodos de cada galería, límites de estratos, lado hacia el que mira cada frente y extensión de cada galería.
- `src/ui/mapa/dibujo.js`: el SVG se genera completo a partir de nodos, aristas y galerías (no hay dibujo fijo). Cielo nocturno, terreno, estratos ondulados que se oscurecen con la profundidad, textura de grano, veta de mineral, guías y etiquetas de nivel (−20/−40/−60 m), túneles "excavados" (borde oscuro + interior) con la línea del semáforo y rampas punteadas. Íconos de boca (castillete con luz), acopio (pila), refugio (cruz), frente (roca) y balizas/cruces. Deja capas vacías para rutas y personas (fase 6).
  - Cada galería es un `<g id="galeria-G3">` con su clase de estado, `role="link"`, `tabindex` y `aria-label`: clic, Enter o espacio abren su ficha.
  - Bloqueadas: rayado rojo, círculos con X y "CERRADA" en la etiqueta. Cada etiqueta lleva ✓ / ! / ✕ (el estado no depende del color). En amarillo la línea parpadea.
  - Prefijo de ids configurable para reusar el dibujo como mini mapa en el panel (fase 8).
- `src/ui/mapa/zoom.js`: zoom con la rueda (hacia el cursor), arrastre, pellizco con dos dedos y botones + / − / ver todo (pensados para usar con guantes). Un arrastre no abre la galería que queda abajo. En celular la ventana es cuadrada y se desplaza por el corte a altura completa.
- Pantalla `#/mapa` con leyenda de colores e íconos (con los mismos símbolos que el mapa). Se redibuja sola cuando cambian galerías, nodos, aristas o config, y conserva el zoom.
- Colores del mapa como tokens nuevos (`--mapa-*`) en `tokens.css`; estilos en `styles/mapa.css`.
- Test nuevo: `tests/mapa-geometria.test.js` (geometría y contenido del SVG: ids, estados, bloqueo, íconos y capas).

**Verificación:** `npm test` ✔ (177 tests) · `npm run build` ✔ · navegador: el mapa se ve como el boceto aprobado; clic real en "G1 · Galería Norte" → abre `#/galerias/G1`; Enter con foco en G6 → abre su ficha; un avance en G1 la pasa de `galeria--verde` a `galeria--amarillo` al instante, sin recargar; los botones + y − y la rueda cambian el `viewBox`; un arrastre desplaza el mapa y no abre la galería. Celular (390 px): ventana cuadrada `287 0 606 606` con leyenda debajo; tablet (820 px) con el corte completo.

## Fase 6 — Balizas, tablero de chapas e hilo de Ariadna ✅ (2026-11-20)

- **Dominio:** `codigoDeBaliza`, `codigoQrDeCarga` y `leerCodigoQr` (formato `CANARIO:BALIZA:G3-F` / `CANARIO:CARGA:CAN-0042`), con tests.
- **Servicios:** `servicios/escaneos.js` → `registrarEscaneo` valida con el dominio (una baliza de galería bloqueada rechaza el escaneo y deja un evento `escaneo-rechazado`) y devuelve si la persona quedó adentro. `servicios/ubicacion.js` → `hiloDe(usuarioId)` (hilo de la visita actual, camino continuo por los túneles y vuelta).
- **Balizas `#/balizas`:**
  - Pestaña "Escanear": cámara con html5-qrcode (se carga solo al usarla, cámara trasera y sin repetir el mismo QR seguido) y selector manual de baliza de respaldo (las balizas de galerías cerradas dicen "CERRADA"). Muestra el resultado con la ruta de salida si la persona quedó adentro. Por ahora se elige quién escanea; en la fase 10 sale de la sesión.
  - Pestaña "Generar e imprimir QR" (`#/balizas/imprimir`): QR en SVG con la librería qrcode, 12 por hoja A4 con nombre, tipo, galería, nivel e id. Hoja `@media print` sin el resto de la app.
- **Tablero de chapas `#/chapas`:** chapas de latón (con agujero para colgar) con nombre, cuadrilla, lugar y hace cuánto escaneó. Agrupadas por galería (con su estado) más "Rampas, cruces y refugios" y "Afuera". Chapa gris "sin señal" según `config.minutosSinSenal`. En galerías en rojo, la chapa parpadea como prioridad de rescate. Contadores de personas adentro y sin señal; se actualiza cada 30 s.
- **Mapa:** trabajadores como puntos en su última baliza (repartidos si hay varios en el mismo punto), gris si no tienen señal, con pulso rojo si están en una galería en rojo, y nombre al tocarlos, pasar el mouse o con "Mostrar nombres". Panel lateral de personas adentro; al elegir una: **Hilo de Ariadna** (línea punteada animada en oro), **Volver por el hilo** (el mismo recorrido al revés) y **Ruta de salida** (BFS a la boca o al refugio más cercano, resaltada en ámbar, con los pasos en texto).
- **Alertas:** resumen siempre visible en la cabecera fija ("✕ PELIGRO DE DERRUMBE 1", "! EVACUACIÓN 1"), que lleva a los banners.
- **HTTPS local para probar la cámara en el celular:** `npm run dev:https` (plugin basic-ssl; abre en `https://<IP-de-la-PC>:5173`, aceptando el certificado).
- Colores de chapas y papel pasados a tokens; `[hidden]` siempre oculta.
- Tests nuevos: códigos QR, posiciones de personas y trazo de caminos.

**Verificación:** `npm test` ✔ (181 tests) · `npm run build` ✔ · navegador:
- Con `minutosSinSenal` = 15, las 8 chapas pasan a gris "sin señal"; con 40 vuelven.
- Escaneo manual (clic real) de Jorge Medina en la boca: su chapa pasa a "Afuera" y el contador baja de 8 a 7.
- Con G5 bloqueada, escanear "Profunda · km 1" muestra "Acceso rechazado… PELIGRO DE DERRUMBE".
- La hoja de QR genera 2 hojas A4 con 17 códigos. Un QR generado leído con html5-qrcode (`scanFile`) devuelve `CANARIO:BALIZA:G3-F` → baliza G3-F.
- En el mapa, clic en Nicolás Vera (G5 en rojo) → hilo, vuelta y ruta de salida Frente Profunda → … → Refugio 2.
- Con G6 bloqueada, la salida desde el cruce −60 cambia de "C3→G6-P→R2" a "C3→C2→C1→BOCA" (esquiva la galería en rojo); quien está dentro de G6 puede salir por ella.
- Vistas a 390 px revisadas. La lectura con la cámara de un celular real queda para que la pruebes vos con `npm run dev:https`.

## Fase 7 — Cargas y pureza ✅ (2026-11-20)

- **Dominio:** `recorridoDeCarga` (frente → cruces del camino más corto → boca → acopio, por BFS) y `proximoPunto`. El texto de ayuda de pureza usa coma decimal.
- **Servicio `servicios/cargas.js`:** `crearCarga` (código único correlativo CAN-0001…; no se puede crear en una galería bloqueada), `puntosDeCarga`, `registrarPesaje` (validado; si el tramo supera la tolerancia guarda un evento `sospechoso` con la carga, el tramo, la cuadrilla responsable y la hora, que el panel general muestra en la fase 8), `calcularPurezaDeCarga` y `guardarPureza` (guarda `pureza`, `modoPureza` y `purezaDetalle` en la carga), `buscarCargaPorCodigo`.
- **Pantalla Cargas `#/cargas`:** formulario de nueva carga validado (las galerías cerradas aparecen deshabilitadas); "Pesar una carga" por código o escaneando su QR (diálogo de cámara reutilizable `ui/components/lectorQr.js`, con ingreso manual de respaldo); historial filtrable por fecha, cuadrilla y "solo sospechosos", con las sospechosas destacadas en rojo (en celular la tabla pasa a tarjetas).
- **Detalle `#/cargas/CAN-0001`:** datos y QR de la carga; seguimiento tipo envío, con cada punto (peso y hora), cada tramo (−kg y %) y los puntos pendientes; el tramo sospechoso queda en rojo con "SOSPECHOSO: supera la tolerancia… · cuadrilla · hora"; formulario de pesaje que sugiere el próximo punto.
- **Pantalla Pureza `#/pureza/CAN-0001`:** recomendación de modo con su explicación (manual para caliza y cuarzo, densidad para hierro y cobre) y elección entre los dos modos. Densidad: peso del frente editable ÷ volumen. Manual: muestra y útil. El resultado se ve en vivo: %, Alta/Media/Baja (colores de marca, no de semáforo), medidor con las marcas 50/80, mineral útil, densidad, y la nota "la pureza por densidad es una estimación". "Guardar en la carga".
- Íconos nuevos `info` y `sin-senal` (para no usar los del semáforo fuera de los estados).
- Tests nuevos: `servicios-cargas.test.js` y el recorrido de la carga.

**Verificación:** `npm test` ✔ (189 tests) · `npm run build` ✔ · navegador con clics reales:
- El formulario vacío muestra los 4 errores.
- Se crea CAN-0001 (Cuadrilla Este, G3, hierro, 0,25 m³) y sugiere el Frente Este.
- 900 kg en el frente → 850 kg en el cruce −40: ese tramo exacto queda "−50 kg · 5,6 %" y "SOSPECHOSO… Cuadrilla Este · hora", y se guarda el evento.
- Pureza de CAN-0001: 3,6 g/cm³ → 38,5 % Baja, 346,2 kg útiles (igual que el caso de la fase 3), guardada en la carga.
- Una carga de cuarzo sugiere y preselecciona el modo manual con la explicación; 500 g → 420 g da 84 % Alta.
- El historial con "Solo sospechosos" deja solo CAN-0001.

**Lista "Listo cuando":** ✔ la carga con pérdida mayor a la tolerancia aparece marcada en el tramo exacto · ✔ los cálculos de pureza coinciden con los casos de la fase 3.

## Fase 8 — Productividad y panel general ✅ (2026-11-20)

- **Datos de demo con historia:** el seed trae 5 turnos anteriores (mañana/tarde/noche) más el actual. En cada uno, los trabajadores escanean la boca, su frente y de nuevo la boca (para las horas efectivas), y cada cuadrilla tiene 4–7 cargas pesadas frente → cruces → boca → acopio, con pérdidas normales (menos de 1,2 % por tramo) y pureza medida en una de cada dos (con el mismo cálculo de la app). Generador pseudoaleatorio con semilla: la demo es reproducible. `MINERAL_POR_GALERIA` define qué se extrae en cada galería.
- **Servicio `servicios/productividad.js`:** `productividadDelPeriodo({turnoId | desde, hasta})` (por cuadrilla, por trabajador, ranking, evolución por turno y KPIs) y `resumenDelPanel()` (personas adentro, toneladas y cargas del turno, pureza promedio de 24 h, sospechosos del turno, últimos eventos).
- **Gráficos (`ui/components/graficos.js`, Chart.js con tree-shaking):** colores y fuentes desde tokens; una sola serie en ámbar por gráfico (el verde, el amarillo y el rojo quedan para los estados; se validó el contraste con el script de la guía de visualización), tooltip en español, sin leyenda por ser una sola serie (la nombra el título).
- **Pantalla Productividad:** filtros por turno y por rango de fechas; KPIs (producción, t/h efectiva, cargas en el acopio); barras de toneladas por cuadrilla; línea de evolución por turno; ranking top 10 por t/hora efectiva; tabla por trabajador con "Exportar CSV" (separador `;`, coma decimal y BOM para Excel en español, `ui/csv.js`).
- **Panel general:** arriba las alertas activas (o "sin alertas"); tarjetas de personas adentro, producción del turno, pureza promedio y traslados sospechosos (resaltada si hay); mini mapa con los estados (clic → mapa); estado de cada galería con canario y batería; últimos traslados sospechosos y últimos eventos. Se redibuja con cualquier cambio de datos y cada minuto.
- Tests nuevos: historia del seed (turnos seguidos, cargas completas sin sospechosos, reproducible), servicio de productividad y CSV. Se ajustaron los tests que suponían un seed sin cargas.

**Verificación:** `npm test` ✔ (194 tests) · `npm run build` ✔ · navegador:
- Con el panel abierto, un avance en G3 y una carga con 900 → 860 kg actualizan solos la alerta (EVACUACIÓN, Galería Este), la producción (0,9 t), los sospechosos (1) y la lista "CAN-0087 · −40 kg (4,4 %) · Cuadrilla Este".
- En Productividad, el filtro por turno cambia los KPI (T-H1: 14,9 t, 17 cargas) y las barras.
- Con el turno en curso elegido, una carga nueva de la cuadrilla Norte llegada al acopio sube su barra de 0 a 0,99 t sin recargar.
- La exportación CSV se probó con tests unitarios; no hice clic en "Exportar CSV" en el navegador porque descarga un archivo.
- Vistas a 390 px revisadas.

**Lista "Listo cuando":** ✔ el panel resume la mina de un vistazo · ✔ los gráficos se actualizan con datos nuevos.
