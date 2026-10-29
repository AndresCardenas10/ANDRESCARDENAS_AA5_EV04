/**
 * Modulo: middlewares/autenticacion.js
 * Proposito: proteger las rutas.
 *   - verificarToken: exige el encabezado "Authorization: Bearer <token>" con un
 *     token JWT valido y un usuario activo. Deja los datos en req.usuario.
 *   - permitirRoles: deja pasar solo a los roles indicados.
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRETO } from '../config/entorno.js';
import { ErrorApi } from '../utils/error-api.js';
import { buscarUsuarioPorId } from '../models/usuario-model.js';

export async function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new ErrorApi(401, 'Debe iniciar sesion (falta el token de acceso)');
  }

  let contenido;
  try {
    contenido = jwt.verify(token, JWT_SECRETO);
  } catch {
    throw new ErrorApi(401, 'La sesion no es valida o ya expiro. Inicie sesion de nuevo');
  }

  // Se consulta el usuario en cada peticion: si fue desactivado o cambio de rol,
  // el cambio aplica de inmediato aunque su token siga vigente.
  const usuario = await buscarUsuarioPorId(Number(contenido.sub));
  if (!usuario || !usuario.activo) {
    throw new ErrorApi(401, 'El usuario no existe o esta inactivo');
  }

  req.usuario = usuario;
  next();
}

/**
 * Para rutas publicas que muestran mas datos si quien consulta es administrador
 * (ej. GET /api/servicios?todos=true). Si hay token valido llena req.usuario;
 * si no lo hay, simplemente continua como visitante.
 */
export async function tokenOpcional(req, res, next) {
  const encabezado = req.headers.authorization || '';
  if (!encabezado.startsWith('Bearer ')) return next();
  try {
    const contenido = jwt.verify(encabezado.slice(7), JWT_SECRETO);
    const usuario = await buscarUsuarioPorId(Number(contenido.sub));
    if (usuario?.activo) req.usuario = usuario;
  } catch {
    // Token invalido en una ruta publica: se atiende como visitante
  }
  next();
}

export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new ErrorApi(403, 'Su rol no tiene permiso para esta accion');
    }
    next();
  };
}
