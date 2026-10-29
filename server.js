/**
 * Archivo: server.js
 * Proposito: punto de entrada. Verifica la configuracion y la base de datos,
 * enciende el servidor e inicia la cancelacion automatica de citas.
 *
 * Ejecucion: npm start
 */
import { PUERTO, JWT_SECRETO, BASE_DATOS } from './src/config/entorno.js';
import app from './src/app.js';
import pool from './src/config/database.js';
import { iniciarCancelacionAutomatica } from './src/jobs/cancelar-citas-expiradas.js';

// 1. Configuracion minima obligatoria
if (JWT_SECRETO.length < 16) {
  console.error('Falta JWT_SECRET en el archivo .env (minimo 16 caracteres). Copie .env.example como .env.');
  process.exit(1);
}

// 2. Verificar la base de datos y que la migracion de EV03 este aplicada
try {
  const conexion = await pool.getConnection();
  const [tablas] = await conexion.query("SHOW TABLES LIKE 'movimiento_inventario'");
  conexion.release();
  console.log(`Conexion a la base de datos "${BASE_DATOS.database}" (puerto ${BASE_DATOS.port}): OK`);
  if (tablas.length === 0) {
    console.warn('AVISO: falta la tabla movimiento_inventario. Importe database/migracion-ev03.sql en phpMyAdmin.');
  }
} catch (error) {
  console.error('No se pudo conectar a la base de datos.');
  console.error(`Detalle: ${error.code || error.message}`);
  console.error('Revise que MySQL este iniciado en XAMPP, que la base "sgb" exista y que DB_PORT en .env sea el correcto (3307).');
  process.exit(1);
}

// 3. Encender el servidor
const servidor = app.listen(PUERTO);

servidor.once('listening', () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
  console.log(`Documentacion de la API (Swagger): http://localhost:${PUERTO}/api-docs`);
  iniciarCancelacionAutomatica();
});

servidor.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PUERTO} ya esta en uso. Cierre el otro servidor o cambie PORT en el archivo .env.`);
  } else {
    console.error('No se pudo iniciar el servidor:', error.message);
  }
  process.exit(1);
});
