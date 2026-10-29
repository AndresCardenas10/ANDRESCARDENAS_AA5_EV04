/**
 * Modulo: routes/producto-routes.js
 * Rutas de inventario: /api/productos/...  (solo administrador)
 */
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/autenticacion.js';
import { ROLES } from '../utils/constantes.js';
import * as productos from '../controllers/producto-controller.js';

const router = Router();

router.use(verificarToken, permitirRoles(ROLES.ADMIN));
router.get('/', productos.listar);
router.get('/movimientos', productos.listarTodosLosMovimientos); // antes de "/:id"
router.get('/:id', productos.obtener);
router.post('/', productos.crear);
router.put('/:id', productos.actualizar);
router.patch('/:id/estado', productos.cambiarEstado);
router.get('/:id/movimientos', productos.listarMovimientosProducto);
router.post('/:id/movimientos', productos.registrarMovimientoProducto);

export default router;
