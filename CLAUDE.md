# Canario — Sistema de monitoreo de minas y excavaciones

> Este archivo es la especificación del producto. Claude Code lo lee automáticamente al trabajar en este proyecto. Toda decisión de código debe respetar lo que dice acá. Si algo no está definido, preguntar antes de inventar.

## 1. Qué es el producto

Canario es una aplicación web para empresas que excavan en roca y cuevas (extracción de caliza, cuarzo, hierro o cobre, y apertura de túneles estructurales). Resuelve dos problemas:

1. **Descontrol en la extracción:** no se sabe cuánto material saca cada cuadrilla por turno y hay pérdidas o robos en el traslado.
2. **Riesgo de derrumbe:** si se excava demasiado rápido en un sector sin apuntalar, la galería puede colapsar.

El concepto se inspira en dos tradiciones mineras:

- **El canario:** los mineros bajaban con un canario; si dejaba de cantar, había que salir. En la app, cada galería tiene un canario que muestra su estado estructural.
- **El tablero de chapas:** cada minero colgaba su chapa al entrar y la retiraba al salir. En la app, un tablero digital muestra quién está adentro y dónde.

## 2. Usuarios y permisos

| Rol                                        | Qué puede hacer                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingeniero / Arquitecto** (administrador) | Todo. Crea galerías, define límites de seguridad, ve todos los paneles, da la primera llave para desbloquear una galería.                |
| **Capataz**                                | Carga avances, apuntalamientos, fisuras y cargas de su cuadrilla. Da la segunda llave del desbloqueo. Ve el mapa y el tablero de chapas. |
| **Trabajador**                             | Escanea balizas y ve su propio recorrido y la ruta de salida.                                                                            |

## 3. Módulos

### 3.1 Galerías y semáforo estructural

Cada galería tiene: nombre, nivel de profundidad, tipo de roca, límites de seguridad (configurables, con valores por defecto según la roca), metros sin apuntalar acumulados, avance del turno actual y fisuras reportadas.

**Valores por defecto (editables por galería por el ingeniero):**

| Roca   | Metros máx. sin apuntalar | Velocidad máx. (m/turno) |
| ------ | ------------------------- | ------------------------ |
| Dura   | 6                         | 3                        |
| Media  | 4                         | 2                        |
| Blanda | 2                         | 1                        |

**Cálculo de estabilidad:**

```
desgaste = (metrosSinApuntalar / metrosMax) * 100
si avanceTurno > velocidadMax → desgaste *= 1.25
si hayFisuras → desgaste += 20
estabilidad = max(0, 100 - desgaste)
```

**Estados (texto y color obligatorios, exactamente así):**

| Estabilidad | Color    | Mensaje                          | Canario              | Efecto                                                                                                                                                                                                               |
| ----------- | -------- | -------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| > 40        | Verde    | "Puede seguir con la excavación" | Canta                | Operación normal                                                                                                                                                                                                     |
| > 15 y ≤ 40 | Amarillo | "EVACUACIÓN"                     | Agitado, en silencio | Banner parpadeante + alarma sonora; lista de quién está en esa galería con su ruta de salida                                                                                                                         |
| ≤ 15        | Rojo     | "PELIGRO DE DERRUMBE"            | Caído                | **Bloqueo automático:** no se pueden cargar avances ni cargas, la baliza de entrada rechaza escaneos, la galería aparece cerrada en el mapa, los trabajadores que siguen adentro parpadean como prioridad de rescate |

Reglas:

- El estado se recalcula automáticamente cada vez que cambia un dato de la galería. Nunca se cambia a mano.
- La estabilidad **solo sube al registrar un apuntalamiento**: `metrosSinApuntalar = 0`, `hayFisuras = false`.
- **Desbloqueo de dos llaves:** una galería en rojo solo se reabre si (1) se registró un apuntalamiento, (2) confirma un ingeniero y (3) confirma un capataz. Queda registrado quién y cuándo.
- Cada cambio de estado se guarda en un historial de eventos.

### 3.2 Mapa en corte lateral

- La mina se dibuja **en corte lateral (vista de perfil), como un hormiguero**: se ven los niveles de profundidad, los túneles y los trabajadores como puntos adentro.
- Se hace en **SVG inline**. Cada galería es un elemento con `id` propio, para colorearla según el semáforo y hacerla clickeable (abre su ficha).
- Elementos: boca de mina, galerías, cruces, frentes de excavación, refugios, acopio, balizas.
- La estructura de la mina es un **grafo** (nodos = balizas o puntos, aristas = tramos de túnel). El dibujo y el grafo salen de los mismos datos.
- **Ruta de salida:** algoritmo BFS sobre el grafo desde la posición del trabajador hasta la salida o el refugio más cercano, evitando galerías en rojo. Se resalta en el mapa.
- **Hilo de Ariadna:** el recorrido de cada trabajador (secuencia de balizas escaneadas) se dibuja como una línea sobre el mapa. "Volver por el hilo" lo recorre al revés.

### 3.3 Ubicación: balizas y tablero de chapas

- Cada punto del mapa tiene una **baliza con código QR** (la app genera los QR imprimibles).
- El trabajador escanea con la cámara del celular; se registra `trabajador + baliza + hora`.
- **Tablero de chapas:** pantalla con una chapa por trabajador, agrupadas por galería donde está. Al salir por la boca de mina, la chapa vuelve a "afuera".
- **Sin señal:** si pasan más de 40 minutos (configurable) desde el último escaneo de alguien que está adentro, su chapa se pone gris con la etiqueta "sin señal".
- Contador visible: **personas adentro**.

### 3.4 Pasaporte de la carga (control de pérdidas)

- Cada carga (carretilla o vagoneta) recibe un **código único** al salir del frente.
- Se pesa en cada punto: **frente → cruce → boca de mina → acopio**.
- Se muestra como un seguimiento de envío (línea de tiempo por tramos).
- Por cada tramo: `pérdida = pesoAnterior - pesoActual`, `% = pérdida / pesoAnterior * 100`.
- Si el % supera la tolerancia (por defecto 3%, configurable) → el tramo se marca como **sospechoso**, con la cuadrilla responsable y la hora.
- Historial de traslados filtrable, con los sospechosos destacados.

### 3.5 Pureza del material

Dos modos:

**Por densidad (recomendado para hierro y cobre):**

```
densidad = peso / volumenCarretilla
pureza = (densidad - densidadEsteril) / (densidadMineral - densidadEsteril) * 100   (acotar entre 0 y 100)
mineralUtil = peso * pureza / 100
```

Densidades por defecto (g/cm³, configurables): caliza 2.71, cuarzo 2.65, hematita/hierro 5.2, calcopirita/cobre 4.2, roca estéril 2.6.

**Manual (para caliza y cuarzo):** como su densidad es casi igual a la del estéril, el método por densidad no es confiable. Se ingresa el peso de la muestra y el peso de mineral útil obtenido: `pureza = útil / muestra * 100`. La app sugiere este modo automáticamente para esos minerales y explica por qué en un texto de ayuda.

Clasificación: Alta (> 80%), Media (50–80%), Baja (< 50%).
Nota en la interfaz: la pureza por densidad es una **estimación**.

### 3.6 Productividad

Por turno, cuadrilla y trabajador:

- Producción de la cuadrilla = suma del peso de sus cargas (al llegar al acopio).
- Producción por trabajador = producción de la cuadrilla / cantidad de trabajadores.
- Horas efectivas = tiempo entre el escaneo de entrada al frente y el de salida.
- Toneladas por hora efectiva = toneladas / horas efectivas.
- Gráficos (Chart.js): barras por cuadrilla, evolución por turno, ranking.

### 3.7 Simulador de turno

- Botón "Simular turno": un turno de 8 h pasa en ~2 minutos.
- Genera datos realistas: trabajadores que se mueven por las balizas, cargas que viajan y se pesan, avances de excavación.
- Guion de la demo: una carga pierde material en un tramo (sospechosa); una galería baja de verde a amarillo (evacuación, chapas que vuelven al tablero) y otra llega a rojo (bloqueo y desbloqueo con dos llaves).
- Controles: iniciar, pausar, velocidad (1x, 5x, 20x), reiniciar datos demo.
- Los datos simulados están marcados y se pueden borrar sin afectar los reales.

## 4. Pantallas

1. **Ingreso:** usuario + PIN y elección de rol.
2. **Panel general:** alertas activas arriba, personas adentro, producción del turno, estado de cada galería, últimos traslados sospechosos.
3. **Mapa:** corte lateral interactivo, trabajadores, rutas, hilos.
4. **Tablero de chapas.**
5. **Galerías:** lista de fichas con el canario, la batería de estabilidad, el color y el mensaje; detalle con historial; formulario de avance, apuntalamiento y fisuras; desbloqueo con dos llaves.
6. **Cargas:** nueva carga, pesajes por punto, seguimiento tramo a tramo, historial.
7. **Pureza:** calculadora (dos modos) asociada a una carga.
8. **Productividad:** gráficos y rankings.
9. **Balizas:** escanear (celular) y generar e imprimir QR (ingeniero).
10. **Configuración:** límites, tolerancias, densidades, usuarios, cuadrillas, estructura de la mina.
11. **Simulador:** controles de la demo.

## 5. Stack técnico

- **HTML + CSS + JavaScript (ES modules)**, sin frameworks de interfaz.
- **Vite** como servidor de desarrollo y para el build.
- **SVG inline** para el mapa y el canario.
- **Chart.js** para los gráficos.
- **html5-qrcode** para escanear y **qrcode** para generar QR.
- **Vitest** para los tests de las cuentas.
- **Persistencia:** capa `storage` abstracta. Primero `localStorage`; después, Firebase (Firestore + Auth) sin tocar el resto del código.
- **PWA offline-first:** bajo tierra no hay señal. La app tiene que funcionar sin conexión (service worker + cola de sincronización cuando vuelve la red).

## 6. Estructura de carpetas

```
canario/
├── index.html
├── public/                # íconos, manifest, sonidos de alarma
├── src/
│   ├── main.js            # arranque y router
│   ├── router.js          # navegación por hash (#/mapa, #/galerias…)
│   ├── state.js           # estado global + suscripción a cambios
│   ├── storage/
│   │   ├── index.js       # interfaz común
│   │   ├── local.js       # localStorage
│   │   └── firebase.js    # (fase posterior)
│   ├── domain/            # LÓGICA PURA, sin DOM, 100% testeada
│   │   ├── semaforo.js
│   │   ├── pureza.js
│   │   ├── traslados.js
│   │   ├── productividad.js
│   │   ├── ubicacion.js
│   │   └── rutas.js       # grafo + BFS
│   ├── ui/
│   │   ├── components/    # canario, chapa, bateria, alerta, etc.
│   │   └── screens/       # una carpeta o archivo por pantalla
│   ├── sim/               # simulador de turno
│   ├── data/seed.js       # mina demo
│   └── styles/            # tokens.css, base.css, componentes
└── tests/                 # tests de domain/
```

## 7. Modelo de datos

```
config        { toleranciaPerdida, minutosSinSenal, densidades{}, limitesPorRoca{}, umbrales{verde, rojo} }
usuarios      { id, nombre, rol: 'ingeniero'|'capataz'|'trabajador', pin, cuadrillaId? }
cuadrillas    { id, nombre, capatazId, trabajadorIds[] }
galerias      { id, nombre, nivel, roca, metrosMax, velocidadMax, metrosSinApuntalar, avanceTurno, hayFisuras, bloqueada, svgId }
nodos         { id, nombre, tipo: 'boca'|'cruce'|'frente'|'refugio'|'acopio', galeriaId, x, y }
aristas       { id, desde, hasta, galeriaId }
escaneos      { id, usuarioId, nodoId, timestamp, simulado }
turnos        { id, fecha, tipo: 'mañana'|'tarde'|'noche', inicio, fin }
avances       { id, galeriaId, turnoId, metros, apuntalado, fisuras, usuarioId, timestamp }
cargas        { id, codigo, cuadrillaId, turnoId, galeriaId, mineral, volumen, pesajes[{nodoId, peso, timestamp}], pureza, modoPureza }
eventos       { id, tipo, galeriaId?, detalle, timestamp }   # cambios de semáforo, sospechosos, desbloqueos
desbloqueos   { id, galeriaId, ingenieroId, capatazId, timestamp }
```

## 8. Diseño visual

- **Estética:** industrial, oscura, como un tablero de control. Fondo casi negro con un tono roca, superficies gris pizarra, acento ámbar (como la luz de un casco).
- **Colores del semáforo:** reservados solo para estados. No usar verde, amarillo ni rojo para otra cosa.
- **Tipografía:** una sans robusta para la interfaz y una monoespaciada para números, códigos de carga y pesos.
- **Contraste alto** y botones grandes: se usa con guantes, con poca luz, en tablet o celular.
- Todos los valores visuales en `styles/tokens.css` (colores, espacios, radios, tipografía). Nada hardcodeado en los componentes.
- El estado nunca se comunica solo con color: siempre color + texto + ícono (accesibilidad).
- Responsive: celular (trabajador y capataz), tablet y escritorio (ingeniero).
- Tipografías: Barlow Condensed 600 (títulos y alertas), Barlow 400/500 (texto),
  JetBrains Mono (números y códigos), Saira Stencil One (solo logo).
  Instalarlas con paquetes @fontsource para que queden dentro del build y funcionen sin conexión.
- Referencias visuales en la carpeta /inspo: respetar esa paleta y ese estilo.

## 9. Reglas para escribir código

- Todo el texto de la interfaz en **español**.
- Código (variables, funciones) en español y camelCase, consistente con el modelo de datos.
- La lógica de `src/domain/` es **pura**: recibe datos y devuelve resultados, sin DOM ni storage. Cada función tiene tests.
- Ningún cálculo de negocio dentro de la UI: la UI llama a `domain/`.
- Los números configurables (límites, tolerancias, umbrales, densidades) salen de `config`, nunca escritos a mano en el código.
- Validar todos los formularios (pesos positivos, volumen > 0, etc.) con mensajes claros.
- Antes de dar una fase por terminada: `npm test` pasa, `npm run build` sin errores, y se probó en el navegador.
- Un commit por tarea terminada, con mensaje descriptivo en español.
