/**
 * Modulo: models/notificacion-model.js
 * Proposito: consultas SQL de la tabla notificacion (RF01, RF05, RF08).
 */
import pool from '../config/database.js';

export function aNotificacion(fila) {
  return {
    id: fila.id_notificacion,
    tipo: fila.tipo,
    mensaje: fila.mensaje,
    leida: Boolean(fila.leida),
    creadoEn: fila.creado_en,
  };
}

/** Crea la misma notificacion para varios usuarios. */
export async function crearNotificaciones(idsUsuarios, tipo, mensaje) {
  const destinatarios = [...new Set(idsUsuarios.filter(Boolean))];
  if (destinatarios.length === 0) return;
  const filas = destinatarios.map((idUsuario) => [idUsuario, tipo, mensaje]);
  await pool.query('INSERT INTO notificacion (id_usuario, tipo, mensaje) VALUES ?', [filas]);
}

export async function listarNotificaciones(idUsuario, { soloNoLeidas = false } = {}) {
  const filtro = soloNoLeidas ? 'AND leida = 0' : '';
  const [filas] = await pool.execute(
    `SELECT * FROM notificacion WHERE id_usuario = ? ${filtro}
      ORDER BY creado_en DESC, id_notificacion DESC LIMIT 100`,
    [idUsuario]
  );
  return filas.map(aNotificacion);
}

export async function contarNoLeidas(idUsuario) {
  const [filas] = await pool.execute(
    'SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leida = 0',
    [idUsuario]
  );
  return Number(filas[0].total);
}

/** Marca como leida solo si la notificacion pertenece al usuario. Devuelve true si existia. */
export async function marcarLeida(idNotificacion, idUsuario) {
  const [resultado] = await pool.execute(
    'UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?',
    [idNotificacion, idUsuario]
  );
  return resultado.affectedRows > 0;
}

export async function marcarTodasLeidas(idUsuario) {
  const [resultado] = await pool.execute(
    'UPDATE notificacion SET leida = 1 WHERE id_usuario = ? AND leida = 0',
    [idUsuario]
  );
  return resultado.affectedRows;
}
