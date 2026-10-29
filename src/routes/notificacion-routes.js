/**
 * Modulo: routes/notificacion-routes.js
 * Rutas de notificaciones: /api/notificaciones/...  (cada usuario, las suyas)
 */
import { Router } from 'express';
import { verificarToken } from '../middlewares/autenticacion.js';
import * as notificaciones from '../controllers/notificacion-controller.js';

const router = Router();

router.use(verificarToken);
router.get('/', notificaciones.listar);
router.patch('/leidas', notificaciones.marcarTodasComoLeidas); // antes de "/:id"
router.patch('/:id/leida', notificaciones.marcarComoLeida);

export default router;
