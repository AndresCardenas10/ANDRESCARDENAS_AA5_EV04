/**
 * Modulo: routes/cita-routes.js
 * Rutas de citas: /api/citas/...
 * Los permisos finos (que cita puede ver o cambiar cada rol) estan en el controlador.
 */
import { Router } from 'express';
import { verificarToken } from '../middlewares/autenticacion.js';
import * as citas from '../controllers/cita-controller.js';

const router = Router();

router.use(verificarToken);
router.get('/', citas.listar);
router.get('/disponibilidad', citas.disponibilidad);       // antes de "/:id"
router.get('/:id', citas.obtener);
router.post('/', citas.crear);
router.put('/:id', citas.reprogramar);
router.patch('/:id/estado', citas.cambiarEstado);

export default router;
