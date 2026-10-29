/**
 * Modulo: models/cita-model.js
 * Proposito: consultas SQL de las tablas cita y cita_servicio.
 * Las citas se devuelven con los nombres del cliente, del barbero y del servicio,
 * el precio aplicado y el estado del ultimo pago registrado.
 */
import pool from '../config/database.js';

const CONSULTA_BASE = `
  SELECT c.id_cita, c.id_cliente, c.id_barbero, c.id_servicio, c.fecha_hora, c.estado,
         c.expira_en, c.notas, c.creado_en,
         CONCAT(cl.nombre, ' ', cl.apellido) AS nombre_cliente, cl.correo AS correo_cliente,
         cl.telefono AS telefono_cliente,
         CONCAT(b.nombre, ' ', b.apellido) AS nombre_barbero,
         s.nombre AS nombre_servicio, s.duracion_min,
         COALESCE(cs.precio_aplicado, s.precio) AS precio,
         (SELECT p.estado_pago FROM pago p WHERE p.id_cita = c.id_cita ORDER BY p.id_pago DESC LIMIT 1) AS estado_pago,
         (SELECT p.metodo_pago FROM pago p WHERE p.id_cita = c.id_cita ORDER BY p.id_pago DESC LIMIT 1) AS metodo_pago
    FROM cita c
    JOIN usuario cl ON cl.id_usuario = c.id_cliente
    JOIN usuario b  ON b.id_usuario  = c.id_barbero
    JOIN servicio s ON s.id_servicio = c.id_servicio
    LEFT JOIN cita_servicio cs ON cs.id_cita = c.id_cita AND cs.id_servicio = c.id_servicio`;

export function aCita(fila) {
  if (!fila) return null;
  return {
    id: fila.id_cita,
    idCliente: fila.id_cliente,
    nombreCliente: fila.nombre_cliente,
    correoCliente: fila.correo_cliente,
    telefonoCliente: fila.telefono_cliente,
    idBarbero: fila.id_barbero,
    nombreBarbero: fila.nombre_barbero,
    idServicio: fila.id_servicio,
    nombreServicio: fila.nombre_servicio,
    duracionMin: fila.duracion_min,
    precio: Number(fila.precio),
    fechaHora: fila.fecha_hora,
    fecha: String(fila.fecha_hora).slice(0, 10),
    hora: String(fila.fecha_hora).slice(11, 16),
    estado: fila.estado,
    expiraEn: fila.expira_en,
    notas: fila.notas,
    estadoPago: fila.estado_pago || null,
    metodoPago: fila.metodo_pago || null,
    creadoEn: fila.creado_en,
  };
}

export async function listarCitas({ idCliente = null, idBarbero = null, estado = null, desde = null, hasta = null } = {}) {
  const condiciones = [];
  const valores = [];
  if (idCliente) { condiciones.push('c.id_cliente = ?'); valores.push(idCliente); }
  if (idBarbero) { condiciones.push('c.id_barbero = ?'); valores.push(idBarbero); }
  if (estado) { condiciones.push('c.estado = ?'); valores.push(estado); }
  if (desde) { condiciones.push('c.fecha_hora >= ?'); valores.push(`${desde} 00:00:00`); }
  if (hasta) { condiciones.push('c.fecha_hora <= ?'); valores.push(`${hasta} 23:59:59`); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.execute(`${CONSULTA_BASE} ${donde} ORDER BY c.fecha_hora DESC`, valores);
  return filas.map(aCita);
}

export async function buscarCitaPorId(idCita, conexion = pool) {
  const [filas] = await conexion.execute(`${CONSULTA_BASE} WHERE c.id_cita = ?`, [idCita]);
  return aCita(filas[0]);
}

/**
 * Bloquea la fila del barbero hasta terminar la transaccion. Asi, dos reservas
 * simultaneas para el mismo barbero se procesan una despues de la otra y no
 * pueden quedar dos citas en la misma hora.
 */
export async function bloquearAgendaBarbero(conexion, idBarbero) {
  await conexion.execute('SELECT id_usuario FROM usuario WHERE id_usuario = ? FOR UPDATE', [idBarbero]);
}

/**
 * Citas activas (pendiente o confirmada) que se cruzan con el intervalo [inicio, fin)
 * para el barbero o para el cliente indicados. Lectura con bloqueo (FOR UPDATE)
 * para ver siempre los datos mas recientes dentro de la transaccion.
 */
export async function citasQueSeCruzan(conexion, { idBarbero, idCliente, inicio, fin, excluirIdCita = 0 }) {
  const [filas] = await conexion.execute(
    `SELECT c.id_cita, c.id_barbero, c.id_cliente
       FROM cita c JOIN servicio s ON s.id_servicio = c.id_servicio
      WHERE c.estado IN ('pendiente', 'confirmada')
        AND c.id_cita <> ?
        AND (c.id_barbero = ? OR c.id_cliente = ?)
        AND c.fecha_hora < ?
        AND DATE_ADD(c.fecha_hora, INTERVAL s.duracion_min MINUTE) > ?
      FOR UPDATE`,
    [excluirIdCita, idBarbero, idCliente, fin, inicio]
  );
  return filas;
}

/** Citas activas de un barbero en una fecha (para calcular la disponibilidad). */
export async function citasActivasDelBarberoEnFecha(idBarbero, fecha) {
  const [filas] = await pool.execute(
    `SELECT c.fecha_hora, s.duracion_min
       FROM cita c JOIN servicio s ON s.id_servicio = c.id_servicio
      WHERE c.id_barbero = ? AND c.estado IN ('pendiente', 'confirmada')
        AND c.fecha_hora BETWEEN ? AND ?`,
    [idBarbero, `${fecha} 00:00:00`, `${fecha} 23:59:59`]
  );
  return filas;
}

export async function insertarCita(conexion, { idCliente, idBarbero, idServicio, fechaHora, expiraEn, notas, precio }) {
  const [resultado] = await conexion.execute(
    `INSERT INTO cita (id_cliente, id_barbero, id_servicio, fecha_hora, estado, expira_en, notas)
     VALUES (?, ?, ?, ?, 'pendiente', ?, ?)`,
    [idCliente, idBarbero, idServicio, fechaHora, expiraEn, notas]
  );
  // Precio historico del servicio en el momento de agendar
  await conexion.execute(
    'INSERT INTO cita_servicio (id_cita, id_servicio, precio_aplicado) VALUES (?, ?, ?)',
    [resultado.insertId, idServicio, precio]
  );
  return resultado.insertId;
}

/** Reprograma: nueva fecha, y opcionalmente otro barbero u otro servicio. */
export async function reprogramarCita(conexion, idCita, { idBarbero, idServicio, fechaHora, precio, cambioServicio }) {
  await conexion.execute(
    'UPDATE cita SET id_barbero = ?, id_servicio = ?, fecha_hora = ? WHERE id_cita = ?',
    [idBarbero, idServicio, fechaHora, idCita]
  );
  if (cambioServicio) {
    await conexion.execute('DELETE FROM cita_servicio WHERE id_cita = ?', [idCita]);
    await conexion.execute(
      'INSERT INTO cita_servicio (id_cita, id_servicio, precio_aplicado) VALUES (?, ?, ?)',
      [idCita, idServicio, precio]
    );
  }
}

/** Cambia el estado. Al confirmar se quita el limite de expiracion. */
export async function cambiarEstadoCita(idCita, estado) {
  const quitarExpiracion = estado === 'confirmada' ? ', expira_en = NULL' : '';
  await pool.execute(`UPDATE cita SET estado = ?${quitarExpiracion} WHERE id_cita = ?`, [estado, idCita]);
}

/**
 * Cancela las citas pendientes cuyo plazo de confirmacion ya vencio (RF06).
 * Devuelve las citas afectadas para poder notificar a los involucrados.
 */
export async function cancelarCitasExpiradas(ahora) {
  const [vencidas] = await pool.execute(
    `SELECT id_cita, id_cliente, id_barbero, fecha_hora FROM cita
      WHERE estado = 'pendiente' AND expira_en IS NOT NULL AND expira_en < ?`,
    [ahora]
  );
  if (vencidas.length === 0) return [];
  const ids = vencidas.map((cita) => cita.id_cita);
  await pool.query(
    `UPDATE cita SET estado = 'cancelada' WHERE estado = 'pendiente' AND id_cita IN (?)`,
    [ids]
  );
  return vencidas;
}
