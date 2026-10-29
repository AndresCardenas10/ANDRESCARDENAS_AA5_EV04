/**
 * Modulo: models/pago-model.js
 * Proposito: consultas SQL de la tabla pago (RF04).
 */
import pool from '../config/database.js';

const CONSULTA_BASE = `
  SELECT p.*, c.id_cliente, c.id_barbero, c.fecha_hora, c.estado AS estado_cita,
         CONCAT(cl.nombre, ' ', cl.apellido) AS nombre_cliente,
         CONCAT(b.nombre, ' ', b.apellido) AS nombre_barbero,
         s.nombre AS nombre_servicio
    FROM pago p
    JOIN cita c ON c.id_cita = p.id_cita
    JOIN usuario cl ON cl.id_usuario = c.id_cliente
    JOIN usuario b ON b.id_usuario = c.id_barbero
    JOIN servicio s ON s.id_servicio = c.id_servicio`;

export function aPago(fila) {
  if (!fila) return null;
  return {
    id: fila.id_pago,
    idCita: fila.id_cita,
    idCliente: fila.id_cliente,
    nombreCliente: fila.nombre_cliente,
    idBarbero: fila.id_barbero,
    nombreBarbero: fila.nombre_barbero,
    nombreServicio: fila.nombre_servicio,
    fechaCita: fila.fecha_hora,
    estadoCita: fila.estado_cita,
    monto: Number(fila.monto),
    metodoPago: fila.metodo_pago,
    tieneComprobante: Boolean(fila.url_comprobante),
    // El comprobante se descarga por una ruta protegida, no como archivo publico
    urlComprobante: fila.url_comprobante ? `/api/pagos/${fila.id_pago}/comprobante` : null,
    estadoPago: fila.estado_pago,
    registradoEn: fila.registrado_en,
  };
}

export async function listarPagos({ idCliente = null, idBarbero = null, estado = null } = {}) {
  const condiciones = [];
  const valores = [];
  if (idCliente) { condiciones.push('c.id_cliente = ?'); valores.push(idCliente); }
  if (idBarbero) { condiciones.push('c.id_barbero = ?'); valores.push(idBarbero); }
  if (estado) { condiciones.push('p.estado_pago = ?'); valores.push(estado); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.execute(`${CONSULTA_BASE} ${donde} ORDER BY p.registrado_en DESC, p.id_pago DESC`, valores);
  return filas.map(aPago);
}

/** Devuelve la fila completa (incluye el nombre del archivo del comprobante). */
export async function buscarPagoPorId(idPago) {
  const [filas] = await pool.execute(`${CONSULTA_BASE} WHERE p.id_pago = ?`, [idPago]);
  return filas[0] || null;
}

/** Pago pendiente o verificado de una cita (una cita no puede pagarse dos veces). */
export async function buscarPagoVigenteDeCita(idCita) {
  const [filas] = await pool.execute(
    `SELECT id_pago, estado_pago FROM pago
      WHERE id_cita = ? AND estado_pago IN ('pendiente', 'verificado') LIMIT 1`,
    [idCita]
  );
  return filas[0] || null;
}

export async function crearPago({ idCita, monto, metodoPago, archivoComprobante }) {
  const [resultado] = await pool.execute(
    `INSERT INTO pago (id_cita, monto, metodo_pago, url_comprobante, estado_pago)
     VALUES (?, ?, ?, ?, 'pendiente')`,
    [idCita, monto, metodoPago, archivoComprobante]
  );
  return resultado.insertId;
}

export async function cambiarEstadoPago(idPago, estado) {
  await pool.execute('UPDATE pago SET estado_pago = ? WHERE id_pago = ?', [estado, idPago]);
}
