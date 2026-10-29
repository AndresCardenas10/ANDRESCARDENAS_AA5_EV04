/**
 * Modulo: routes/usuario-routes.js
 * Rutas de usuarios: /api/usuarios/...
 */
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/autenticacion.js';
import { ROLES } from '../utils/constantes.js';
import * as usuarios from '../controllers/usuario-controller.js';

const router = Router();
const soloAdmin = permitirRoles(ROLES.ADMIN);

router.use(verificarToken);
router.get('/barberos', usuarios.listarBarberos);          // cualquier rol: para agendar
router.get('/', soloAdmin, usuarios.listar);
router.get('/:id', soloAdmin, usuarios.obtener);
router.post('/', soloAdmin, usuarios.crear);
router.put('/:id', soloAdmin, usuarios.actualizar);
router.patch('/:id/estado', soloAdmin, usuarios.cambiarEstado);

export default router;
