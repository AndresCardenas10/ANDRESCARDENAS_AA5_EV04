/**
 * Modulo: controllers/notificacion-controller.js
 * Proposito: cada usuario consulta y marca como leidas SUS notificaciones.
 * Las notificaciones las crea el sistema (citas, pagos, inventario).
 */
import { Validador, idDeRuta } from '../utils/validador.js';
import { noEncontrado } from '../utils/error-api.js';
import {
  listarNotificaciones, contarNoLeidas, marcarLeida, marcarTodasLeidas,
} from '../models/notificacion-model.js';

// GET /api/notificaciones?noLeidas=true
export async function listar(req, res) {
  const v = new Validador(req.query);
  const soloNoLeidas = v.booleano('noLeidas', { requerido: false }) ?? false;
  v.verificar();
  res.json({
    exito: true,
    datos: {
      noLeidas: await contarNoLeidas(req.usuario.id),
      notificaciones: await listarNotificaciones(req.usuario.id, { soloNoLeidas }),
    },
  });
}

// PATCH /api/notificaciones/:id/leida
export async function marcarComoLeida(req, res) {
  const existia = await marcarLeida(idDeRuta(req.params.id), req.usuario.id);
  if (!existia) throw noEncontrado('Notificacion');
  res.json({ exito: true, mensaje: 'Notificacion marcada como leida' });
}

// PATCH /api/notificaciones/leidas   -> marca todas
export async function marcarTodasComoLeidas(req, res) {
  const cantidad = await marcarTodasLeidas(req.usuario.id);
  res.json({ exito: true, mensaje: `${cantidad} notificaciones marcadas como leidas` });
}
