// Alarma sonora generada con Web Audio (no necesita archivos: funciona sin conexión).
// Dos tonos alternados. Los navegadores solo permiten sonar después de una
// interacción del usuario: se "desbloquea" con el primer clic o tecla.

let contexto = null;
let intervalo = null;
let sonando = false;

function obtenerContexto() {
  if (!contexto) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contexto = new Contexto();
  }
  return contexto;
}

function pitido(frecuencia, duracion) {
  const ctx = obtenerContexto();
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = frecuencia;
  vol.gain.setValueAtTime(0.0001, ctx.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracion);
  osc.connect(vol).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duracion + 0.02);
}

function ciclo(urgente) {
  // urgente (rojo): más agudo y más rápido
  const [a, b] = urgente ? [1040, 780] : [880, 660];
  pitido(a, 0.22);
  setTimeout(() => pitido(b, 0.22), 280);
}

/** Desbloquea el audio en la primera interacción del usuario. */
export function prepararAlarma() {
  const desbloquear = () => {
    const ctx = obtenerContexto();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, desbloquear, { passive: true }));
}

/** Enciende (o actualiza) la alarma. */
export function encenderAlarma({ urgente = false } = {}) {
  apagarAlarma();
  sonando = true;
  ciclo(urgente);
  intervalo = setInterval(() => ciclo(urgente), urgente ? 900 : 1400);
}

export function apagarAlarma() {
  sonando = false;
  if (intervalo) clearInterval(intervalo);
  intervalo = null;
}

export function alarmaSonando() {
  return sonando;
}
