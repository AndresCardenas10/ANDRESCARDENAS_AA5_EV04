/**
 * Modulo: utils/constantes.js
 * Proposito: valores fijos del dominio (roles y estados), escritos una sola vez.
 * Deben coincidir con la base de datos "sgb" (tabla rol y columnas ENUM).
 */
export const ROLES = Object.freeze({
  ADMIN: 'Administrador',
  BARBERO: 'Barbero',
  CLIENTE: 'Cliente',
});

export const ESTADOS_CITA = Object.freeze(['pendiente', 'confirmada', 'cancelada', 'completada']);
export const METODOS_PAGO = Object.freeze(['efectivo', 'transferencia']);
export const ESTADOS_PAGO = Object.freeze(['pendiente', 'verificado', 'rechazado']);
export const TIPOS_MOVIMIENTO = Object.freeze(['entrada', 'salida']);

// Intervalo (minutos) entre horas ofrecidas al consultar la disponibilidad
export const INTERVALO_AGENDA_MIN = 30;
