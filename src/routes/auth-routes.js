/**
 * Modulo: routes/auth-routes.js
 * Rutas de autenticacion: /api/auth/...
 */
import { Router } from 'express';
import { verificarToken } from '../middlewares/autenticacion.js';
import * as auth from '../controllers/auth-controller.js';

const router = Router();

router.post('/registro', auth.registrarCliente);           // publico: crear cuenta de cliente
router.post('/login', auth.iniciarSesion);                 // publico: obtener token
router.post('/recuperar', auth.solicitarRecuperacion);     // publico: pedir codigo
router.post('/restablecer', auth.restablecer);             // publico: nueva contrasena con codigo
router.get('/perfil', verificarToken, auth.obtenerPerfil);
router.put('/perfil', verificarToken, auth.actualizarPerfil);
router.put('/contrasena', verificarToken, auth.cambiarContrasena);

export default router;
