/**
 * Modulo: utils/notificar.js
 * Proposito: crear notificaciones sin interrumpir la operacion principal.
 * Si guardar la notificacion falla, se registra en consola pero la cita o el
 * pago ya realizados NO se deshacen.
 */
import { crearNotificaciones } from '../models/notificacion-model.js';
import { idsAdministradores } from '../models/usuario-model.js';

export async function notificar(idsUsuarios, tipo, mensaje) {
  try {
    await crearNotificaciones(idsUsuarios, tipo, mensaje);
  } catch (error) {
    console.error('No se pudo guardar la notificacion:', error.message);
  }
}

/** Notifica a todos los administradores activos (el dueno de la barberia). */
export async function notificarAdministradores(tipo, mensaje) {
  try {
    await crearNotificaciones(await idsAdministradores(), tipo, mensaje);
  } catch (error) {
    console.error('No se pudo notificar a los administradores:', error.message);
  }
}
