// Zoom y desplazamiento de un SVG cambiando su viewBox.
// Rueda del mouse (zoom hacia el cursor), arrastre con un dedo o el mouse y
// pellizco con dos dedos. Un arrastre no dispara el clic de lo que quede abajo.

const UMBRAL_ARRASTRE = 6; // px

/**
 * @param {SVGSVGElement} svg
 * @param {{ ancho: number, alto: number, relacion?: number, maximo?: number, alCambiar?: (vista) => void }} opciones
 *   relacion: ancho/alto de la ventana visible (por defecto, la del lienzo completo).
 *   En celular se usa una ventana más cuadrada que el lienzo y se desplaza por él.
 */
export function habilitarZoom(svg, { ancho, alto, relacion, maximo = 5, alCambiar } = {}) {
  let base = { x: 0, y: 0, ancho, alto };
  let proporcion = relacion ?? ancho / alto;
  let vista = vistaCompleta();

  /** La vista más alejada posible con la proporción actual, centrada. */
  function vistaCompleta() {
    const anchoMax = Math.min(base.ancho, base.alto * proporcion);
    const v = { ancho: anchoMax, alto: anchoMax / proporcion };
    return { ...v, x: base.x + (base.ancho - v.ancho) / 2, y: base.y + (base.alto - v.alto) / 2 };
  }
  const punteros = new Map();
  let inicio = null; // estado al comenzar un gesto
  let movio = false;

  function aplicar() {
    svg.setAttribute('viewBox', `${vista.x} ${vista.y} ${vista.ancho} ${vista.alto}`);
    alCambiar?.(vista);
  }

  function limitar() {
    const anchoMax = Math.min(base.ancho, base.alto * proporcion);
    const anchoMin = anchoMax / maximo;
    vista.ancho = Math.min(Math.max(vista.ancho, anchoMin), anchoMax);
    vista.alto = vista.ancho / proporcion;
    vista.x = Math.min(Math.max(vista.x, base.x), base.x + base.ancho - vista.ancho);
    vista.y = Math.min(Math.max(vista.y, base.y), base.y + base.alto - vista.alto);
  }

  /** Pasa coordenadas de pantalla a coordenadas del SVG. */
  function aSvg(clienteX, clienteY) {
    const matriz = svg.getScreenCTM();
    if (!matriz) return { x: vista.x + vista.ancho / 2, y: vista.y + vista.alto / 2 };
    const punto = new DOMPoint(clienteX, clienteY).matrixTransform(matriz.inverse());
    return { x: punto.x, y: punto.y };
  }

  /** factor < 1 acerca, > 1 aleja, manteniendo fijo el punto (cx, cy). */
  function escalar(factor, cx, cy) {
    const nuevoAncho = vista.ancho * factor;
    const nuevoAlto = vista.alto * factor;
    vista.x = cx - ((cx - vista.x) * nuevoAncho) / vista.ancho;
    vista.y = cy - ((cy - vista.y) * nuevoAlto) / vista.alto;
    vista.ancho = nuevoAncho;
    vista.alto = nuevoAlto;
    limitar();
    aplicar();
  }

  function centro() {
    return { x: vista.x + vista.ancho / 2, y: vista.y + vista.alto / 2 };
  }

  const alRueda = (e) => {
    e.preventDefault();
    const p = aSvg(e.clientX, e.clientY);
    escalar(e.deltaY < 0 ? 1 / 1.15 : 1.15, p.x, p.y);
  };

  const distancia = () => {
    const [a, b] = [...punteros.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const medio = () => {
    const [a, b] = [...punteros.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  function empezarGesto() {
    const pantalla = svg.getBoundingClientRect();
    inicio = {
      vista: { ...vista },
      escala: vista.ancho / pantalla.width,
      puntero: [...punteros.values()][0],
      distancia: punteros.size === 2 ? distancia() : null,
      medio: punteros.size === 2 ? medio() : null,
    };
    // Punto del pellizco en coordenadas del SVG, con la vista del inicio del gesto.
    inicio.medioSvg = inicio.medio ? aSvg(inicio.medio.x, inicio.medio.y) : null;
  }

  const alBajar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movio = false;
    empezarGesto();
  };

  const alMover = (e) => {
    if (!punteros.has(e.pointerId) || !inicio) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 1) {
      const p = punteros.get(e.pointerId);
      const dx = p.x - inicio.puntero.x;
      const dy = p.y - inicio.puntero.y;
      if (!movio && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;
      if (!movio) {
        try {
          svg.setPointerCapture(e.pointerId);
        } catch {
          // sin captura el arrastre igual funciona mientras el puntero esté sobre el mapa
        }
      }
      movio = true;
      vista.x = inicio.vista.x - dx * inicio.escala;
      vista.y = inicio.vista.y - dy * inicio.escala;
      limitar();
      aplicar();
    } else if (punteros.size === 2 && inicio.distancia) {
      movio = true;
      const factor = inicio.distancia / distancia();
      vista = { ...inicio.vista };
      escalar(factor, inicio.medioSvg.x, inicio.medioSvg.y);
    }
  };

  const alSoltar = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size) empezarGesto();
    else inicio = null;
  };

  // Si hubo arrastre, el clic que sigue no debe abrir una galería.
  const alClic = (e) => {
    if (movio) {
      e.stopPropagation();
      e.preventDefault();
      movio = false;
    }
  };

  svg.addEventListener('wheel', alRueda, { passive: false });
  svg.addEventListener('pointerdown', alBajar);
  svg.addEventListener('pointermove', alMover);
  svg.addEventListener('pointerup', alSoltar);
  svg.addEventListener('pointercancel', alSoltar);
  svg.addEventListener('pointerleave', alSoltar);
  svg.addEventListener('click', alClic, true);
  aplicar();

  return {
    acercar: () => escalar(1 / 1.4, centro().x, centro().y),
    alejar: () => escalar(1.4, centro().x, centro().y),
    restablecer: () => {
      vista = vistaCompleta();
      aplicar();
    },
    /** Actualiza el tamaño base (si cambian los datos) conservando el zoom. */
    redimensionar(nuevoAncho, nuevoAlto) {
      if (nuevoAncho === base.ancho && nuevoAlto === base.alto) return;
      base = { x: 0, y: 0, ancho: nuevoAncho, alto: nuevoAlto };
      limitar();
      aplicar();
    },
    /** Cambia la proporción de la ventana visible (p. ej. al rotar el celular). */
    cambiarRelacion(nueva) {
      if (Math.abs(nueva - proporcion) < 1e-6) return;
      proporcion = nueva;
      vista = vistaCompleta();
      aplicar();
    },
    vista: () => ({ ...vista }),
    destruir() {
      svg.removeEventListener('wheel', alRueda);
      svg.removeEventListener('pointerdown', alBajar);
      svg.removeEventListener('pointermove', alMover);
      svg.removeEventListener('pointerup', alSoltar);
      svg.removeEventListener('pointercancel', alSoltar);
      svg.removeEventListener('pointerleave', alSoltar);
      svg.removeEventListener('click', alClic, true);
    },
  };
}
