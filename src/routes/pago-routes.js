/**
 * Modulo: routes/pago-routes.js
 * Rutas de pagos: /api/pagos/...
 */
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/autenticacion.js';
import { subirComprobante } from '../middlewares/subida-comprobante.js';
import { ROLES } from '../utils/constantes.js';
import * as pagos from '../controllers/pago-controller.js';

const router = Router();

router.use(verificarToken);
router.get('/', pagos.listar);
router.get('/:id', pagos.obtener);
router.get('/:id/comprobante', pagos.descargarComprobante);
router.post('/', subirComprobante, pagos.registrar);       // acepta JSON o multipart/form-data
router.patch('/:id/estado', permitirRoles(ROLES.ADMIN), pagos.cambiarEstado);

export default router;
