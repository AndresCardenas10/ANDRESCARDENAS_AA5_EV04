/**
 * Modulo: models/producto-model.js
 * Proposito: consultas SQL de las tablas producto y movimiento_inventario (RF11).
 */
import pool, { enTransaccion } from '../config/database.js';
import { ErrorApi } from '../utils/error-api.js';

export function aProducto(fila) {
  if (!fila) return null;
  return {
    id: fila.id_producto,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    unidad: fila.unidad,
    precio: Number(fila.precio),
    stock: fila.stock,
    stockMinimo: fila.stock_minimo,
    stockBajo: fila.stock < fila.stock_minimo,
    activo: Boolean(fila.activo),
  };
}

export function aMovimiento(fila) {
  return {
    id: fila.id_movimiento,
    idProducto: fila.id_producto,
    nombreProducto: fila.nombre_producto,
    tipo: fila.tipo,
    cantidad: fila.cantidad,
    costoUnitario: fila.costo_unitario === null ? null : Number(fila.costo_unitario),
    motivo: fila.motivo,
    idUsuario: fila.id_usuario,
    nombreUsuario: fila.nombre_usuario,
    creadoEn: fila.creado_en,
  };
}

export async function listarProductos({ soloActivos = false, soloStockBajo = false } = {}) {
  const condiciones = [];
  if (soloActivos) condiciones.push('activo = 1');
  if (soloStockBajo) condiciones.push('stock < stock_minimo');
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.execute(`SELECT * FROM producto ${donde} ORDER BY nombre`);
  return filas.map(aProducto);
}

export async function buscarProductoPorId(idProducto) {
  const [filas] = await pool.execute('SELECT * FROM producto WHERE id_producto = ?', [idProducto]);
  return aProducto(filas[0]);
}

/** Crea el producto. Si trae stock inicial, lo registra como primera entrada. */
export async function crearProducto(datos, idUsuario) {
  return enTransaccion(async (conexion) => {
    const [resultado] = await conexion.execute(
      `INSERT INTO producto (nombre, descripcion, precio, stock, activo, categoria, unidad, stock_minimo)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      [datos.nombre, datos.descripcion, datos.precio, datos.stock, datos.categoria, datos.unidad, datos.stockMinimo]
    );
    if (datos.stock > 0) {
      await conexion.execute(
        `INSERT INTO movimiento_inventario (id_producto, id_usuario, tipo, cantidad, costo_unitario, motivo)
         VALUES (?, ?, 'entrada', ?, ?, 'Stock inicial')`,
        [resultado.insertId, idUsuario, datos.stock, datos.costoUnitario]
      );
    }
    return resultado.insertId;
  });
}

/** Actualiza los datos descriptivos. El stock solo cambia con movimientos. */
export async function actualizarProducto(idProducto, datos) {
  await pool.execute(
    `UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, unidad = ?, stock_minimo = ?
      WHERE id_producto = ?`,
    [datos.nombre, datos.descripcion, datos.precio, datos.categoria, datos.unidad, datos.stockMinimo, idProducto]
  );
}

export async function cambiarEstadoProducto(idProducto, activo) {
  await pool.execute('UPDATE producto SET activo = ? WHERE id_producto = ?', [activo ? 1 : 0, idProducto]);
}

/**
 * Registra una entrada o salida y actualiza el stock en la misma transaccion.
 * La fila del producto se bloquea para que dos movimientos simultaneos no
 * dejen un stock incorrecto. Una salida nunca deja el stock en negativo.
 */
export async function registrarMovimiento(idProducto, { tipo, cantidad, costoUnitario, motivo }, idUsuario) {
  return enTransaccion(async (conexion) => {
    const [filas] = await conexion.execute(
      'SELECT stock, activo FROM producto WHERE id_producto = ? FOR UPDATE',
      [idProducto]
    );
    if (filas.length === 0) throw new ErrorApi(404, 'Producto no encontrado');
    if (!filas[0].activo) throw new ErrorApi(409, 'El producto esta desactivado');

    const stockActual = filas[0].stock;
    const nuevoStock = tipo === 'entrada' ? stockActual + cantidad : stockActual - cantidad;
    if (nuevoStock < 0) {
      throw new ErrorApi(409, `Stock insuficiente: hay ${stockActual} y se intenta sacar ${cantidad}`);
    }

    await conexion.execute('UPDATE producto SET stock = ? WHERE id_producto = ?', [nuevoStock, idProducto]);
    const [resultado] = await conexion.execute(
      `INSERT INTO movimiento_inventario (id_producto, id_usuario, tipo, cantidad, costo_unitario, motivo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idProducto, idUsuario, tipo, cantidad, tipo === 'entrada' ? costoUnitario : null, motivo]
    );
    return { idMovimiento: resultado.insertId, stockAnterior: stockActual, stockNuevo: nuevoStock };
  });
}

export async function listarMovimientos({ idProducto = null, desde = null, hasta = null } = {}) {
  const condiciones = [];
  const valores = [];
  if (idProducto) { condiciones.push('m.id_producto = ?'); valores.push(idProducto); }
  if (desde) { condiciones.push('m.creado_en >= ?'); valores.push(`${desde} 00:00:00`); }
  if (hasta) { condiciones.push('m.creado_en <= ?'); valores.push(`${hasta} 23:59:59`); }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.execute(
    `SELECT m.*, p.nombre AS nombre_producto, CONCAT(u.nombre, ' ', u.apellido) AS nombre_usuario
       FROM movimiento_inventario m
       JOIN producto p ON p.id_producto = m.id_producto
       JOIN usuario u ON u.id_usuario = m.id_usuario
       ${donde}
      ORDER BY m.creado_en DESC, m.id_movimiento DESC`,
    valores
  );
  return filas.map(aMovimiento);
}
