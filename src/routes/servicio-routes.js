/**
 * Modulo: routes/servicio-routes.js
 * Rutas del catalogo de servicios: /api/servicios/...
 */
import { Router } from 'express';
import { verificarToken, tokenOpcional, permitirRoles } from '../middlewares/autenticacion.js';
import { ROLES } from '../utils/constantes.js';
import * as servicios from '../controllers/servicio-controller.js';

const router = Router();
const soloAdmin = [verificarToken, permitirRoles(ROLES.ADMIN)];

router.get('/', tokenOpcional, servicios.listar);          // publico
router.get('/:id', tokenOpcional, servicios.obtener);      // publico
router.post('/', soloAdmin, servicios.crear);
router.put('/:id', soloAdmin, servicios.actualizar);
router.patch('/:id/estado', soloAdmin, servicios.cambiarEstado);

export default router;
