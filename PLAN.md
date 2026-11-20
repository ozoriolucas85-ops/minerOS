# Canario — Plan de construcción con Claude Code

Guía para construir Canario de punta a punta con Claude Code, fase por fase. Cada fase tiene un objetivo, el **prompt para pegar** en Claude Code y una lista de **"listo cuando"** para verificar antes de pasar a la siguiente.

---

## Antes de empezar

**Requisitos en tu computadora**
- Node.js 20 o superior (`node -v` para verificar)
- Git
- Claude Code instalado
- Un editor (VS Code recomendado)
- Una cuenta de GitHub (para guardar el código y publicar)

**Preparar la carpeta**
1. Creá una carpeta `canario` y poné adentro `CLAUDE.md` y este `PLAN.md`.
2. Abrí una terminal en esa carpeta y ejecutá `git init`.
3. Ejecutá `claude` para abrir Claude Code.

**Cómo trabajar con Claude Code (importante)**
- **Una fase a la vez.** No pegues todo el plan junto.
- **Pedí el plan antes del código:** usá el modo planificación (Shift+Tab) en las fases grandes, revisá lo que propone y recién después aprobá.
- **Probá vos mismo** cada fase en el navegador antes de seguir.
- **Commit al terminar cada fase:** pedile "hacé commit de esta fase".
- **`/clear` entre fases** para empezar con el contexto limpio; `CLAUDE.md` se vuelve a leer solo.
- **Si algo falla,** describí qué hiciste, qué esperabas y qué pasó, y pegá el error de la consola del navegador (F12).
- **Entendé lo que se hace:** al final de cada fase pedile "explicame en 5 puntos qué hiciste y por qué". Vas a tener que poder explicar el proyecto.

---

## Fase 0 — Base del proyecto

**Objetivo:** proyecto creado, corre en el navegador y tiene tests funcionando.

**Prompt:**
```
Leé CLAUDE.md. Creá la base del proyecto con Vite en JavaScript vanilla (sin framework),
con la estructura de carpetas de la sección 6. Instalá Vitest y dejá un test de ejemplo
que pase. Agregá los scripts npm: dev, build, preview y test. Creá un .gitignore adecuado.
No construyas pantallas todavía. Al terminar, decime cómo levantar el proyecto.
```

**Listo cuando:**
- [ ] `npm run dev` abre una página en el navegador
- [ ] `npm test` pasa
- [ ] La estructura de carpetas coincide con `CLAUDE.md`

---

## Fase 1 — Sistema de diseño y navegación

**Objetivo:** la "cáscara" de la app: estilos, menú y pantallas vacías navegables.

**Prompt:**
```
Implementá el sistema de diseño de la sección 8 de CLAUDE.md en src/styles/tokens.css
y base.css. Después creá el layout de la app: barra lateral en escritorio y barra
inferior en celular, con las 11 pantallas de la sección 4 como rutas por hash
(#/panel, #/mapa, etc.). Cada pantalla por ahora muestra solo su título.
Creá también una página interna #/estilos que muestre todos los colores, tipografías,
botones, tarjetas y los tres estados del semáforo, para revisar el diseño.
Antes de escribir código, proponeme la paleta exacta y las tipografías.
```

**Listo cuando:**
- [ ] Se puede navegar entre todas las pantallas
- [ ] Se ve bien en celular (probar con F12 → modo dispositivo) y en escritorio
- [ ] La página de estilos muestra todo el sistema visual de forma coherente

> Antes de esta fase, mirá tus tableros de Pinterest y contale a Claude qué te gustó ("quiero las tarjetas como en esta referencia: …"). Podés arrastrar capturas de pantalla a la terminal de Claude Code.

---

## Fase 2 — Datos y mina de demostración

**Objetivo:** capa de almacenamiento y una mina de ejemplo cargada.

**Prompt:**
```
Implementá la capa de persistencia de la sección 5 de CLAUDE.md: src/storage/index.js
con una interfaz común (obtener, guardar, listar, borrar, suscribirse a cambios) y
src/storage/local.js con localStorage. Implementá src/state.js como estado global
que avisa a la UI cuando algo cambia.
Creá src/data/seed.js con una mina de demostración realista según el modelo de datos
de la sección 7: 3 niveles de profundidad, 6 galerías con distintos tipos de roca,
cruces, frentes, 2 refugios, boca de mina, acopio, 3 cuadrillas con capataz y
4-5 trabajadores cada una, un ingeniero, y la config con los valores por defecto.
Cargá el seed automáticamente la primera vez y agregá un botón en Configuración
para restablecer los datos de demo.
```

**Listo cuando:**
- [ ] Al recargar la página los datos siguen ahí
- [ ] "Restablecer demo" vuelve todo al estado inicial
- [ ] En las herramientas del navegador (Application → Local Storage) se ven los datos

---

## Fase 3 — Lógica de negocio con tests

**Objetivo:** todas las cuentas del producto, separadas de la interfaz y verificadas.

**Prompt:**
```
Implementá toda la lógica pura de src/domain/ según las secciones 3.1 a 3.6 de CLAUDE.md:
- semaforo.js: calcular estabilidad y estado, aplicar avance, aplicar apuntalamiento,
  validar desbloqueo de dos llaves
- pureza.js: densidad, pureza por densidad (acotada 0-100), pureza manual, mineral útil,
  clasificación, sugerencia de modo según el mineral
- traslados.js: pérdida por tramo, porcentaje, detección de sospechosos
- productividad.js: producción por cuadrilla, por trabajador, horas efectivas, t/hora
- ubicacion.js: quién está adentro y en qué galería, detección "sin señal"
- rutas.js: armar grafo desde nodos y aristas, BFS de ruta de salida evitando galerías
  bloqueadas, hilo de Ariadna (recorrido de un trabajador)
Todos los valores configurables se reciben por parámetro (config), nada hardcodeado.
Escribí tests en Vitest para cada función, incluyendo casos borde (peso 0, volumen 0,
pureza negativa, sin camino de salida, exactamente en los umbrales 15 y 40).
Usá estos casos de verificación:
- Roca media, 1,5 m sin apuntalar → estabilidad 62,5, verde
- Roca media, 2,5 m sin apuntalar → estabilidad 37,5, amarillo
- Roca media, 4 m sin apuntalar con avance de turno 2,5 → rojo
- Hierro, 900 kg en 0,25 m³ → densidad 3,6 g/cm³, pureza ≈ 38,5 %
- Pesajes 900 → 850 → 5,6 % de pérdida, sospechoso
```

**Listo cuando:**
- [ ] `npm test` pasa con todos los tests
- [ ] Pedile a Claude "mostrame la cobertura de tests" y que `src/domain/` supere el 90 %
- [ ] Podés explicar cada fórmula (pedile "explicame cada función de domain con un ejemplo numérico")

---

## Fase 4 — Galerías, canario y bloqueo

**Objetivo:** el corazón de seguridad del producto.

**Prompt:**
```
Construí la pantalla Galerías según la sección 3.1 de CLAUDE.md, usando solo la lógica
de src/domain/semaforo.js.
1. Componente Canario en SVG con tres estados animados con CSS: canta (verde, notas
   musicales flotando), agitado (amarillo, tiembla, sin notas) y caído (rojo).
2. Componente Batería de estabilidad: barra con el porcentaje, que cambia de color.
3. Lista de fichas de galería: canario, batería, color, mensaje exacto de la tabla,
   tipo de roca y metros sin apuntalar.
4. Detalle de galería: formularios para registrar avance, apuntalamiento y fisuras;
   historial de eventos.
5. Amarillo: banner global "EVACUACIÓN" parpadeante en todas las pantallas, con
   alarma sonora (con botón de silenciar).
6. Rojo: banner "PELIGRO DE DERRUMBE", formularios deshabilitados y desbloqueo con
   dos llaves (PIN de ingeniero + PIN de capataz, y exige apuntalamiento registrado).
Todo cambio de estado se guarda en eventos.
```

**Listo cuando:**
- [ ] Al cargar avances, la galería pasa de verde a amarillo a rojo sola
- [ ] En rojo no se puede cargar nada en esa galería
- [ ] El desbloqueo exige apuntalamiento y las dos llaves
- [ ] El estado se entiende sin depender del color (texto + ícono)

---

## Fase 5 — Mapa en corte lateral

**Objetivo:** la pantalla estrella.

**Prompt:**
```
Construí la pantalla Mapa según la sección 3.2 de CLAUDE.md.
Generá el SVG a partir de los nodos y aristas del seed (no un dibujo fijo): vista en
corte lateral tipo hormiguero, con la superficie arriba (cielo y terreno), capas de
roca con textura sutil por profundidad, etiquetas de nivel (-20 m, -40 m, -60 m),
túneles como trazos gruesos con bordes redondeados y los iconos de boca, refugio y acopio.
- Cada galería se colorea según su semáforo y es clickeable (abre su ficha)
- Las galerías bloqueadas se muestran con una "X" y rayado
- Zoom y desplazamiento (rueda del mouse, pellizco en celular)
- Leyenda de colores e íconos
Por ahora sin trabajadores; eso es la fase siguiente.
Proponeme primero el aspecto visual con una descripción y, si podés, un boceto en SVG.
```

**Listo cuando:**
- [ ] El mapa se ve claro y lindo en escritorio y en celular
- [ ] Cambiar un dato en una galería cambia su color en el mapa al instante
- [ ] Clic en una galería abre su ficha

---

## Fase 6 — Balizas, tablero de chapas e hilo de Ariadna

**Objetivo:** saber dónde está cada persona.

**Prompt:**
```
Implementá la sección 3.3 de CLAUDE.md y la parte de rutas de la 3.2:
1. Pantalla Balizas para el ingeniero: generar el QR de cada nodo con la librería qrcode,
   en una hoja imprimible (A4, varios por hoja, con nombre del punto).
2. Pantalla Escanear para el trabajador: cámara con html5-qrcode, más un selector manual
   de baliza como respaldo. Rechazar el escaneo si la baliza es de una galería bloqueada.
3. Tablero de chapas: una chapa metálica estilizada por trabajador (nombre, cuadrilla,
   hace cuánto escaneó), agrupadas por galería, con una columna "Afuera". Estado gris
   "sin señal" según config. Contador de personas adentro.
4. En el mapa: trabajadores como puntos en su última baliza, con nombre al tocarlos.
5. Hilo de Ariadna: al elegir un trabajador, dibujar su recorrido como línea punteada
   animada; botón "Volver por el hilo".
6. Botón "Ruta de salida": resaltar el camino BFS más corto a la boca o a un refugio,
   evitando galerías en rojo.
```

**Listo cuando:**
- [ ] Escanear con el celular un QR impreso actualiza el tablero y el mapa
- [ ] Alguien sin escanear por más del tiempo configurado aparece "sin señal"
- [ ] La ruta de salida esquiva las galerías bloqueadas

> Para probar con el celular: `npm run dev -- --host` y abrir la IP que muestra la terminal. La cámara puede exigir HTTPS; si falla, pedile a Claude que configure HTTPS local en Vite.

---

## Fase 7 — Cargas y pureza

**Objetivo:** control de pérdidas y calidad del material.

**Prompt:**
```
Implementá las secciones 3.4 y 3.5 de CLAUDE.md:
1. Nueva carga: cuadrilla, galería, mineral, volumen; genera un código único
   (ej. CAN-0042) y su QR.
2. Registrar pesaje: elegir carga (o escanear su QR), punto y peso.
3. Seguimiento de la carga como línea de tiempo de envío: cada punto con peso y hora;
   cada tramo con pérdida en kg y %; los sospechosos en rojo con aviso claro.
4. Historial de traslados con filtros (fecha, cuadrilla, solo sospechosos).
5. Calculadora de pureza en dos modos; sugerir el modo manual para caliza y cuarzo con
   un texto de ayuda breve; mostrar la clasificación Alta/Media/Baja y aclarar que la
   pureza por densidad es una estimación. El resultado queda guardado en la carga.
6. Cada traslado sospechoso genera un evento que aparece en el panel general.
```

**Listo cuando:**
- [ ] Una carga con pérdida mayor a la tolerancia aparece marcada en el tramo exacto
- [ ] Los cálculos de pureza coinciden con los casos de la fase 3

---

## Fase 8 — Productividad y panel general

**Objetivo:** la vista del ingeniero.

**Prompt:**
```
Implementá la sección 3.6 de CLAUDE.md con Chart.js, con los colores de tokens.css:
- Pantalla Productividad: filtros por turno y rango de fechas; barras por cuadrilla;
  línea de evolución por turno; ranking de trabajadores por t/hora efectiva; tabla exportable a CSV.
- Panel general: arriba, las alertas activas (galerías en amarillo y rojo); tarjetas
  con personas adentro, toneladas del turno, pureza promedio y traslados sospechosos;
  mini mapa con estados; últimos eventos.
Todo se actualiza solo cuando cambian los datos.
```

**Listo cuando:**
- [ ] El panel resume la situación de la mina de un vistazo
- [ ] Los gráficos se actualizan al cargar datos nuevos

---

## Fase 9 — Simulador de turno

**Objetivo:** una demo que se cuenta sola.

**Prompt:**
```
Implementá el simulador de la sección 3.7 de CLAUDE.md en src/sim/.
Usá un reloj simulado con velocidad ajustable (1x, 5x, 20x) y controles de iniciar,
pausar y reiniciar. Los trabajadores entran, se mueven por las balizas y trabajan
en los frentes; se generan cargas que viajan y se pesan; las galerías avanzan.
Seguí el guion: minuto ~2 simulado una carga pierde 6 % en un tramo; a mitad del turno
la galería G3 pasa a amarillo (evacuación: sus trabajadores salen por la ruta y las
chapas vuelven al tablero); hacia el final G5 llega a rojo y queda bloqueada.
Todo dato simulado lleva simulado: true y se puede borrar aparte.
Que todo pase por las mismas funciones que usa un usuario real, sin atajos.
```

**Listo cuando:**
- [ ] Una corrida completa muestra todas las funciones del producto en unos 2 minutos
- [ ] Después se puede desbloquear G5 con las dos llaves en vivo

---

## Fase 10 — Ingreso y roles

**Objetivo:** cada usuario ve y hace solo lo que le corresponde.

**Prompt:**
```
Implementá la pantalla de ingreso (usuario + PIN) y los permisos de la sección 2
de CLAUDE.md. El menú muestra solo las pantallas permitidas según el rol; las acciones
no permitidas se ocultan y además se validan en la lógica. El trabajador entra
directo a Escanear y ve su hilo y su ruta de salida. Cerrar sesión. Los PIN se guardan
con hash (no en texto plano).
```

**Listo cuando:**
- [ ] Un capataz no puede cambiar límites de seguridad
- [ ] Un trabajador solo ve escaneo, su recorrido y la ruta de salida

---

## Fase 11 — Funciona sin señal (PWA)

**Objetivo:** utilizable bajo tierra.

**Prompt:**
```
Convertí la app en PWA instalable que funcione sin conexión (sección 5 de CLAUDE.md):
manifest con íconos (usá el canario), service worker con vite-plugin-pwa, caché de
todos los recursos. Indicador visible "Sin conexión / Sincronizado". Las acciones
hechas sin conexión quedan en una cola que se sincroniza al volver la red
(preparado para la fase Firebase).
```

**Listo cuando:**
- [ ] Se puede instalar en el celular como app
- [ ] Con el modo avión activado, la app abre y deja escanear y cargar datos

---

## Fase 12 — Varios dispositivos en tiempo real (Firebase)

**Objetivo:** que el capataz cargue en la mina y el ingeniero lo vea al instante en la oficina.

**Pasos manuales previos:** crear un proyecto gratis en console.firebase.google.com, activar Firestore y Authentication, y copiar la configuración web.

**Prompt:**
```
Implementá src/storage/firebase.js con la misma interfaz que local.js, usando Firestore
con persistencia offline y Firebase Auth. Migrá el ingreso a Firebase Auth manteniendo
los roles. Escribí reglas de seguridad de Firestore que apliquen los permisos de la
sección 2. Una variable de entorno elige el modo (local o firebase). Explicame paso a
paso qué tengo que configurar en la consola de Firebase. No subas claves al repositorio.
```

**Listo cuando:**
- [ ] Dos dispositivos ven el mismo cambio en segundos
- [ ] Las reglas impiden que un trabajador modifique galerías

---

## Fase 13 — Pulido final y publicación

**Prompt de revisión:**
```
Hacé una revisión completa del producto contra CLAUDE.md:
1. Listá todo lo especificado que falte o no coincida.
2. Revisá accesibilidad (contraste, foco con teclado, textos alternativos, estados no
   dependientes del color).
3. Revisá responsive en 375 px, 768 px y 1440 px.
4. Buscá errores en la consola y código duplicado.
5. Verificá que todos los textos de la interfaz estén en español y sin errores.
Dame la lista priorizada antes de corregir.
```

**Prompt de publicación:**
```
Prepará la publicación:
- README.md de producto: qué es, problema que resuelve, capturas, funciones,
  cómo instalarlo, cómo usar la demo.
- Publicá en Firebase Hosting (o Netlify si estamos en modo local) y explicame los pasos.
- Una página de presentación (#/inicio) para clientes: propuesta de valor, las tres
  funciones clave (seguridad, trazabilidad, ubicación) y un botón "Ver demo" que entra
  con un usuario demo y arranca el simulador.
```

**Listo cuando:**
- [ ] La app está publicada con una URL que se puede compartir
- [ ] Alguien que no conoce el producto entiende qué hace en 30 segundos desde la página de inicio
- [ ] La demo funciona de punta a punta desde esa URL

---

## Guion de presentación (5 minutos)

1. **El problema (30 s):** pérdidas de material sin control y riesgo de derrumbe.
2. **La idea (30 s):** el canario y el tablero de chapas, tradiciones mineras convertidas en tecnología.
3. **Demo en vivo (3 min):** iniciar el simulador en 20x y mostrar:
   - el mapa en corte con los trabajadores moviéndose,
   - la carga sospechosa marcada en el tramo exacto,
   - la galería que pasa a amarillo, la evacuación y las chapas que vuelven al tablero,
   - la galería en rojo con bloqueo y el desbloqueo con dos llaves en vivo,
   - la pureza calculada por densidad.
4. **Cómo funciona por dentro (1 min):** la fórmula de estabilidad, la de pureza y la ruta de salida con BFS.

## Checklist final del producto

- [ ] Las tres funciones clave (seguridad, trazabilidad y ubicación) funcionan de punta a punta
- [ ] El semáforo muestra exactamente: rojo "PELIGRO DE DERRUMBE", amarillo "EVACUACIÓN", verde "Puede seguir con la excavación"
- [ ] El bloqueo en rojo impide realmente operar
- [ ] Mapa de referencia con ruta de salida
- [ ] Productividad por cuadrilla, turno y trabajador
- [ ] Pureza en dos modos
- [ ] Funciona sin conexión
- [ ] Tests de lógica pasando
- [ ] Publicado con URL y página de presentación
