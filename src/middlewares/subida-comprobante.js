/**
 * Modulo: middlewares/subida-comprobante.js
 * Proposito: recibir la imagen del comprobante de una transferencia (RF04).
 * - Solo imagenes JPG, PNG o WEBP de maximo 5 MB.
 * - Se guarda en uploads/comprobantes con un nombre aleatorio (nunca el nombre original).
 */
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ErrorApi } from '../utils/error-api.js';

// Carpeta uploads/comprobantes en la raiz del proyecto (sin importar desde donde se ejecute)
export const CARPETA_COMPROBANTES = fileURLToPath(new URL('../../uploads/comprobantes', import.meta.url));
fs.mkdirSync(CARPETA_COMPROBANTES, { recursive: true });

const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const TAMANO_MAXIMO = 5 * 1024 * 1024;

const almacenamiento = multer.diskStorage({
  destination: CARPETA_COMPROBANTES,
  filename: (req, archivo, listo) => {
    listo(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXTENSIONES[archivo.mimetype]}`);
  },
});

export const subirComprobante = multer({
  storage: almacenamiento,
  limits: { fileSize: TAMANO_MAXIMO, files: 1 },
  fileFilter: (req, archivo, listo) => {
    if (!EXTENSIONES[archivo.mimetype]) {
      return listo(new ErrorApi(400, 'El comprobante debe ser una imagen JPG, PNG o WEBP'));
    }
    listo(null, true);
  },
}).single('comprobante');

/** Borra un archivo subido (por ejemplo, si la validacion del pago fallo). */
export function borrarArchivoSubido(archivo) {
  if (archivo?.path) fs.promises.unlink(archivo.path).catch(() => {});
}
