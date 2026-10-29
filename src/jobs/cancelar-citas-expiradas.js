/**
 * Modulo: jobs/cancelar-citas-expiradas.js
 * Proposito: tarea automatica (RF06). Cada minuto cancela las citas "pendientes"
 * cuyo plazo de confirmacion (cita.expira_en) ya vencio, y avisa al cliente,
 * al barbero y al administrador.
 */
import { cancelarCitasExpiradas } from '../models/cita-model.js';
import { ahoraTexto } from '../utils/fechas.js';
import { notificar, notificarAdministradores } from '../utils/notificar.js';

const CADA_MINUTO_MS = 60 * 1000;

export async function ejecutarCancelacion() {
  try {
    const canceladas = await cancelarCitasExpiradas(ahoraTexto());
    for (const cita of canceladas) {
      const cuando = String(cita.fecha_hora).slice(0, 16);
      const mensaje = `La cita #${cita.id_cita} del ${cuando} se cancelo automaticamente porque no fue confirmada a tiempo.`;
      await notificar([cita.id_cliente, cita.id_barbero], 'cita', mensaje);
      await notificarAdministradores('cita', mensaje);
    }
    if (canceladas.length > 0) console.log(`Citas canceladas por vencimiento: ${canceladas.length}`);
  } catch (error) {
    // Si la base de datos no esta disponible, se intenta de nuevo en el siguiente minuto
    console.error('No se pudo ejecutar la cancelacion automatica:', error.code || error.message);
  }
}

export function iniciarCancelacionAutomatica() {
  ejecutarCancelacion();
  const temporizador = setInterval(ejecutarCancelacion, CADA_MINUTO_MS);
  temporizador.unref(); // no impide cerrar el servidor
}
