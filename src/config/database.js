/**
 * Modulo: config/database.js
 * Proposito: pool de conexiones a la base de datos "sgb" (MySQL/MariaDB de XAMPP).
 *
 * - dateStrings: las fechas se manejan como texto "AAAA-MM-DD HH:MM:SS" en hora
 *   local, asi no hay desfases por zona horaria entre Node y MySQL.
 * - decimalNumbers: los DECIMAL (precios, montos) llegan como numeros.
 */
import mysql from 'mysql2/promise';
import { BASE_DATOS } from './entorno.js';

const pool = mysql.createPool({
  ...BASE_DATOS,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true,
  decimalNumbers: true,
});

/**
 * Ejecuta una funcion dentro de una transaccion.
 * Si la funcion termina bien se confirma (commit); si lanza un error se deshace (rollback).
 */
export async function enTransaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

export default pool;
