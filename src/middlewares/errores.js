/**
 * Modulo: middlewares/errores.js
 * Proposito: respuestas uniformes para rutas inexistentes y para cualquier error.
 * Nunca se envian al cliente detalles internos (SQL, rutas de archivos, trazas).
 */
import multer from 'multer';
import { ErrorApi } from '../utils/error-api.js';

/** Ruta de la API que no existe -> 404 en JSON. */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ exito: false, mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

/** Manejador final de errores (Express lo reconoce por tener 4 parametros). */
// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, req, res, next) {
  // Errores previstos por la aplicacion
  if (error instanceof ErrorApi) {
    const cuerpo = { exito: false, mensaje: error.message };
    if (error.errores) cuerpo.errores = error.errores;
    return res.status(error.estadoHttp).json(cuerpo);
  }

  // JSON mal escrito en el cuerpo de la peticion
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ exito: false, mensaje: 'El cuerpo de la peticion no es un JSON valido' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ exito: false, mensaje: 'El cuerpo de la peticion es demasiado grande' });
  }

  // Errores al subir archivos (comprobantes de pago)
  if (error instanceof multer.MulterError) {
    const mensaje = error.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el tamano maximo permitido (5 MB)'
      : 'No se pudo procesar el archivo enviado';
    return res.status(400).json({ exito: false, mensaje });
  }

  // Errores de la base de datos con significado claro
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ exito: false, mensaje: 'Ya existe un registro con esos datos' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ exito: false, mensaje: 'La operacion no es posible por datos relacionados' });
  }
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ETIMEDOUT'].includes(error.code)) {
    console.error('Base de datos no disponible:', error.code);
    return res.status(503).json({ exito: false, mensaje: 'La base de datos no esta disponible en este momento' });
  }

  console.error('Error no controlado:', error);
  return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
}
