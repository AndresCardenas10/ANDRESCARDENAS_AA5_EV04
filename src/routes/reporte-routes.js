/**
 * Modulo: routes/reporte-routes.js
 * Rutas de reportes: /api/reportes/...  (solo administrador)
 */
import { Router } from 'express';
import { verificarToken, permitirRoles } from '../middlewares/autenticacion.js';
import { ROLES } from '../utils/constantes.js';
import * as reportes from '../controllers/reporte-controller.js';

const router = Router();

router.use(verificarToken, permitirRoles(ROLES.ADMIN));
router.get('/resumen-mensual', reportes.resumenMensual);
router.get('/indicadores', reportes.indicadores);
router.get('/ingresos-por-mes', reportes.ingresosPorMes);

export default router;
