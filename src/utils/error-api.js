/**
 * Modulo: utils/error-api.js
 * Proposito: error con codigo HTTP. Los controladores lanzan ErrorApi y el
 * manejador de errores (middlewares/errores.js) lo convierte en respuesta JSON.
 *
 * Ejemplo: throw new ErrorApi(404, 'Cita no encontrada');
 */
export class ErrorApi extends Error {
  constructor(estadoHttp, mensaje, errores = undefined) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estadoHttp = estadoHttp;
    this.errores = errores; // lista opcional [{ campo, mensaje }]
  }
}

// Atajos para los errores mas comunes
const PALABRAS_FEMENINAS = new Set(['Cita', 'Notificacion']);
export const noEncontrado = (que) => new ErrorApi(404, `${que} no encontrad${PALABRAS_FEMENINAS.has(que) ? 'a' : 'o'}`);
export const prohibido = (mensaje = 'No tiene permiso para realizar esta accion') => new ErrorApi(403, mensaje);
export const conflicto = (mensaje) => new ErrorApi(409, mensaje);
