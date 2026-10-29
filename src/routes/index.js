/**
 * Modulo: routes/index.js
 * Proposito: reunir todas las rutas de la API bajo el prefijo /api.
 */
import { Router } from 'express';
import pool from '../config/database.js';
import authRoutes from './auth-routes.js';
import usuarioRoutes from './usuario-routes.js';
import servicioRoutes from './servicio-routes.js';
import horarioRoutes from './horario-routes.js';
import citaRoutes from './cita-routes.js';
import pagoRoutes from './pago-routes.js';
import productoRoutes from './producto-routes.js';
import notificacionRoutes from './notificacion-routes.js';
import reporteRoutes from './reporte-routes.js';

const router = Router();

// GET /api/salud -> comprueba que la API y la base de datos responden
router.get('/salud', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ exito: true, mensaje: 'API del SGB activa', baseDatos: 'conectada', documentacion: '/api-docs' });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/servicios', servicioRoutes);
router.use('/horarios', horarioRoutes);
router.use('/citas', citaRoutes);
router.use('/pagos', pagoRoutes);
router.use('/productos', productoRoutes);
router.use('/notificaciones', notificacionRoutes);
router.use('/reportes', reporteRoutes);

export default router;
