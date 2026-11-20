// Pantalla de ingreso: elección de rol, usuario y PIN.

import { estado } from '../../state.js';
import { ingresar } from '../../servicios/autenticacion.js';
import { NOMBRE_ROL } from '../../domain/permisos.js';
import { icono } from '../components/iconos.js';
import { esc } from '../formato.js';

const ROLES = [
  { rol: 'ingeniero', icono: 'configuracion', ayuda: 'Ve todo, define límites y da la primera llave.' },
  { rol: 'capataz', icono: 'casco', ayuda: 'Carga avances y cargas de su cuadrilla. Segunda llave.' },
  { rol: 'trabajador', icono: 'balizas', ayuda: 'Escanea balizas y ve su ruta de salida.' },
];

// PIN de la mina de demostración (solo para presentar; los guardados están con hash).
const AYUDA_DEMO = `
  <details class="demo-usuarios">
    <summary>Usuarios de la demo</summary>
    <ul>
      <li><strong>Ingeniera:</strong> Laura Benítez · PIN <span class="mono">1111</span></li>
      <li><strong>Capataces:</strong> Héctor Ramírez <span class="mono">2222</span> · Marta Quiroga <span class="mono">3333</span> · Rubén Sosa <span class="mono">4444</span></li>
      <li><strong>Trabajadores:</strong> PIN <span class="mono">1001</span> a <span class="mono">1013</span> en el orden de la lista (Jorge Medina 1001…)</li>
    </ul>
  </details>`;

export default {
  render(contenedor) {
    let rol = 'ingeniero';
    const opcionesUsuarios = () => {
      const cuadrillas = new Map(estado.listar('cuadrillas').map((c) => [c.id, c.nombre]));
      return estado
        .listar('usuarios', (u) => u.rol === rol)
        .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))
        .map((u) => `<option value="${u.id}">${esc(u.nombre)}${u.cuadrillaId ? ` · ${esc(cuadrillas.get(u.cuadrillaId) ?? '')}` : ''}</option>`)
        .join('');
    };

    contenedor.innerHTML = `
      <div class="ingreso">
        <div class="ingreso__fondo" aria-hidden="true"></div>
        <form class="ingreso__tarjeta pila" id="form-ingreso" novalidate>
          <div class="ingreso__marca">
            <span class="logo__marca ingreso__logo">${icono('canario')}</span>
            <div><span class="logo__texto ingreso__nombre">CANARIO</span>
              <span class="ingreso__lema">Monitoreo de minas y excavaciones · AGO Soluciones</span></div>
          </div>
          <fieldset class="ingreso__roles">
            <legend class="campo__etiqueta">Rol</legend>
            ${ROLES.map(
              (r) => `<label class="opcion-rol"><input type="radio" name="rol" value="${r.rol}" ${r.rol === rol ? 'checked' : ''}>
                <span>${icono(r.icono)}<strong>${NOMBRE_ROL[r.rol]}</strong><small>${r.ayuda}</small></span></label>`,
            ).join('')}
          </fieldset>
          <label class="campo"><span class="campo__etiqueta">Usuario</span>
            <select class="entrada" name="usuarioId" id="usuario">${opcionesUsuarios()}</select></label>
          <label class="campo"><span class="campo__etiqueta">PIN</span>
            <input class="entrada entrada--mono ingreso__pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" placeholder="••••"></label>
          <p class="campo__error" id="error-ingreso" role="alert"></p>
          <button class="boton boton--primario boton--grande boton--bloque" type="submit">${icono('ingreso')} Ingresar</button>
          ${AYUDA_DEMO}
        </form>
      </div>`;

    const form = contenedor.querySelector('#form-ingreso');
    form.querySelectorAll('[name=rol]').forEach((r) =>
      r.addEventListener('change', () => {
        rol = r.value;
        form.elements.usuarioId.innerHTML = opcionesUsuarios();
      }),
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = contenedor.querySelector('#error-ingreso');
      try {
        await ingresar(form.elements.usuarioId.value, form.elements.pin.value);
      } catch (err) {
        error.textContent = err.message;
        form.elements.pin.value = '';
        form.elements.pin.focus();
      }
    });
    return null;
  },
};
