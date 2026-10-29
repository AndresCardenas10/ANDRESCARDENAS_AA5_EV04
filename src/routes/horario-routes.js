/**
 * Modulo: routes/horario-routes.js
 * Rutas de horarios de barberos: /api/horarios/...
 */
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/autenticacion.js';
import { ROLES } from '../utils/constantes.js';
import * as horarios from '../controllers/horario-controller.js';

const router = Router();

router.use(verificarToken);
router.get('/barbero/:idBarbero', horarios.obtenerHorario);
router.put('/barbero/:idBarbero', permitirRoles(ROLES.ADMIN, ROLES.BARBERO), horarios.reemplazarHorario);

export default router;
