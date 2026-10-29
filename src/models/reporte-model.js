/**
 * Modulo: models/reporte-model.js
 * Proposito: consultas de resumen para el administrador (RF02).
 *   - Ingresos: pagos VERIFICADOS registrados en el mes.
 *   - Egresos: compras de inventario (entradas con costo) registradas en el mes.
 */
import pool from '../config/database.js';

export async function obtenerResumenMensual(inicio, fin) {
  const [[ingresos]] = await pool.execute(
    `SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
       FROM pago WHERE estado_pago = 'verificado' AND registrado_en >= ? AND registrado_en < ?`,
    [inicio, fin]
  );
  const [[egresos]] = await pool.execute(
    `SELECT COALESCE(SUM(cantidad * costo_unitario), 0) AS total, COUNT(*) AS cantidad
       FROM movimiento_inventario
      WHERE tipo = 'entrada' AND costo_unitario IS NOT NULL AND creado_en >= ? AND creado_en < ?`,
    [inicio, fin]
  );
  const [citasPorEstado] = await pool.execute(
    `SELECT estado, COUNT(*) AS cantidad FROM cita
      WHERE fecha_hora >= ? AND fecha_hora < ? GROUP BY estado`,
    [inicio, fin]
  );
  const [serviciosTop] = await pool.execute(
    `SELECT s.id_servicio, s.nombre, COUNT(*) AS cantidad
       FROM cita c JOIN servicio s ON s.id_servicio = c.id_servicio
      WHERE c.fecha_hora >= ? AND c.fecha_hora < ? AND c.estado <> 'cancelada'
      GROUP BY s.id_servicio, s.nombre ORDER BY cantidad DESC LIMIT 5`,
    [inicio, fin]
  );
  const [ingresosPorMetodo] = await pool.execute(
    `SELECT metodo_pago, COALESCE(SUM(monto), 0) AS total FROM pago
      WHERE estado_pago = 'verificado' AND registrado_en >= ? AND registrado_en < ?
      GROUP BY metodo_pago`,
    [inicio, fin]
  );
  const [[pendientes]] = await pool.execute(
    "SELECT COUNT(*) AS cantidad FROM pago WHERE estado_pago = 'pendiente'"
  );

  return { ingresos, egresos, citasPorEstado, serviciosTop, ingresosPorMetodo, pagosPendientes: Number(pendientes.cantidad) };
}

/** Ingresos verificados de cada mes de un anio (para la grafica del panel). */
export async function obtenerIngresosPorMes(anio) {
  const [filas] = await pool.execute(
    `SELECT MONTH(registrado_en) AS mes, COALESCE(SUM(monto), 0) AS total
       FROM pago WHERE estado_pago = 'verificado' AND YEAR(registrado_en) = ?
      GROUP BY MONTH(registrado_en)`,
    [anio]
  );
  const porMes = Array(12).fill(0);
  filas.forEach((fila) => { porMes[fila.mes - 1] = Number(fila.total); });
  return porMes;
}

/** Indicadores rapidos para el panel principal del administrador. */
export async function obtenerIndicadores(hoy) {
  const [[citasHoy]] = await pool.execute(
    `SELECT COUNT(*) AS cantidad FROM cita
      WHERE fecha_hora BETWEEN ? AND ? AND estado <> 'cancelada'`,
    [`${hoy} 00:00:00`, `${hoy} 23:59:59`]
  );
  const [[citasPendientes]] = await pool.execute("SELECT COUNT(*) AS cantidad FROM cita WHERE estado = 'pendiente'");
  const [[clientes]] = await pool.execute(
    `SELECT COUNT(*) AS cantidad FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre_rol = 'Cliente' AND u.activo = 1`
  );
  const [[stockBajo]] = await pool.execute(
    'SELECT COUNT(*) AS cantidad FROM producto WHERE activo = 1 AND stock < stock_minimo'
  );
  const [[pagosPendientes]] = await pool.execute("SELECT COUNT(*) AS cantidad FROM pago WHERE estado_pago = 'pendiente'");
  return {
    citasHoy: Number(citasHoy.cantidad),
    citasPendientes: Number(citasPendientes.cantidad),
    clientesActivos: Number(clientes.cantidad),
    productosStockBajo: Number(stockBajo.cantidad),
    pagosPendientes: Number(pagosPendientes.cantidad),
  };
}
