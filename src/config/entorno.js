/**
 * Modulo: config/entorno.js
 * Proposito: leer la configuracion del archivo .env en un solo lugar y
 * entregar valores ya convertidos (numeros, booleanos) al resto del codigo.
 */
import 'dotenv/config';

export const PUERTO = Number(process.env.PORT) || 3000;

export const BASE_DATOS = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3307, // XAMPP del proyecto usa el 3307
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sgb',
};

// Clave para firmar los tokens JWT. Debe definirse en .env (ver .env.example).
export const JWT_SECRETO = process.env.JWT_SECRET || '';
export const JWT_EXPIRA = process.env.JWT_EXPIRA || '8h';

// En modo desarrollo el codigo de recuperacion de contrasena se devuelve en la
// respuesta (no hay servidor de correo). En produccion debe ser false.
export const MODO_DESARROLLO = (process.env.MODO_DESARROLLO || 'true').toLowerCase() === 'true';

// Minutos que tiene una cita "pendiente" para ser confirmada antes de cancelarse sola (RF06)
export const MINUTOS_CONFIRMACION_CITA = Number(process.env.MINUTOS_CONFIRMACION_CITA) || 60;
