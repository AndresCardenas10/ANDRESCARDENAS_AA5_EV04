/**
 * Modulo: models/servicio-model.js
 * Proposito: consultas SQL de la tabla servicio (catalogo de la barberia).
 */
import pool from '../config/database.js';

export function aServicio(fila) {
  if (!fila) return null;
  return {
    id: fila.id_servicio,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    duracionMin: fila.duracion_min,
    categoria: fila.categoria,
    activo: Boolean(fila.activo),
  };
}

export async function listarServicios({ soloActivos = true } = {}) {
  const donde = soloActivos ? 'WHERE activo = 1' : '';
  const [filas] = await pool.execute(`SELECT * FROM servicio ${donde} ORDER BY nombre`);
  return filas.map(aServicio);
}

export async function buscarServicioPorId(idServicio) {
  const [filas] = await pool.execute('SELECT * FROM servicio WHERE id_servicio = ?', [idServicio]);
  return aServicio(filas[0]);
}

export async function crearServicio({ nombre, descripcion, precio, duracionMin, categoria }) {
  const [resultado] = await pool.execute(
    `INSERT INTO servicio (nombre, descripcion, precio, duracion_min, categoria, activo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [nombre, descripcion, precio, duracionMin, categoria]
  );
  return resultado.insertId;
}

export async function actualizarServicio(idServicio, { nombre, descripcion, precio, duracionMin, categoria }) {
  await pool.execute(
    `UPDATE servicio SET nombre = ?, descripcion = ?, precio = ?, duracion_min = ?, categoria = ?
      WHERE id_servicio = ?`,
    [nombre, descripcion, precio, duracionMin, categoria, idServicio]
  );
}

export async function cambiarEstadoServicio(idServicio, activo) {
  await pool.execute('UPDATE servicio SET activo = ? WHERE id_servicio = ?', [activo ? 1 : 0, idServicio]);
}
