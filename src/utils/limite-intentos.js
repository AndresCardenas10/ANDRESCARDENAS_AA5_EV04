/**
 * Modulo: utils/limite-intentos.js
 * Proposito: frenar ataques de adivinar contrasenas. Tras 5 intentos fallidos
 * con el mismo correo, se bloquea ese correo por 15 minutos (respuesta 429).
 * Los datos viven en memoria: se reinician al reiniciar el servidor.
 */
const MAXIMO_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const fallosPorCorreo = new Map();

export function estaBloqueado(correo) {
  const registro = fallosPorCorreo.get(correo);
  if (!registro) return false;
  if (Date.now() - registro.desde > VENTANA_MS) {
    fallosPorCorreo.delete(correo);
    return false;
  }
  return registro.fallos >= MAXIMO_FALLOS;
}

export function registrarFallo(correo) {
  const registro = fallosPorCorreo.get(correo);
  if (!registro || Date.now() - registro.desde > VENTANA_MS) {
    fallosPorCorreo.set(correo, { fallos: 1, desde: Date.now() });
  } else {
    registro.fallos += 1;
  }
}

export function limpiarFallos(correo) {
  fallosPorCorreo.delete(correo);
}
