/**
 * Modulo: controllers/usuario-controller.js
 * Proposito: gestion de usuarios por el administrador (RNF10/RNF11) y
 * listado de barberos activos para agendar citas.
 */
import { Validador, idDeRuta } from '../utils/validador.js';
import { ErrorApi, noEncontrado, conflicto } from '../utils/error-api.js';
import { ROLES } from '../utils/constantes.js';
import { generarHash } from './auth-controller.js';
import {
  listarUsuarios, buscarUsuarioPorId, buscarCredencialesPorCorreo, crearUsuario,
  obtenerIdRol, actualizarUsuario, cambiarEstadoUsuario,
} from '../models/usuario-model.js';

const NOMBRES_ROLES = Object.values(ROLES);

/** Convierte el texto del rol (sin importar mayusculas) al nombre exacto de la BD. */
function normalizarRol(v, campo, requerido) {
  const valor = v.texto(campo, { requerido, max: 50 });
  if (valor === null) return null;
  const rol = NOMBRES_ROLES.find((nombre) => nombre.toLowerCase() === valor.toLowerCase());
  if (!rol) return v.agregarError(campo, `Debe ser uno de: ${NOMBRES_ROLES.join(', ')}`);
  return rol;
}

// GET /api/usuarios?rol=&activo=&buscar=   (Administrador)
export async function listar(req, res) {
  const v = new Validador(req.query);
  const rol = normalizarRol(v, 'rol', false);
  const activo = v.booleano('activo', { requerido: false });
  const buscar = v.texto('buscar', { requerido: false, max: 100 });
  v.verificar();
  res.json({ exito: true, datos: await listarUsuarios({ rol, activo, buscar }) });
}

// GET /api/usuarios/barberos   (cualquier usuario con sesion; para agendar)
export async function listarBarberos(req, res) {
  const barberos = await listarUsuarios({ rol: ROLES.BARBERO, activo: true });
  // Solo datos necesarios para elegir barbero (sin correo ni telefono)
  res.json({
    exito: true,
    datos: barberos.map(({ id, nombre, apellido, nombreCompleto }) => ({ id, nombre, apellido, nombreCompleto })),
  });
}

// GET /api/usuarios/:id   (Administrador)
export async function obtener(req, res) {
  const usuario = await buscarUsuarioPorId(idDeRuta(req.params.id));
  if (!usuario) throw noEncontrado('Usuario');
  res.json({ exito: true, datos: usuario });
}

// POST /api/usuarios   (Administrador crea barberos, administradores o clientes)
export async function crear(req, res) {
  const v = new Validador(req.body);
  const nombre = v.texto('nombre', { max: 100 });
  const apellido = v.texto('apellido', { max: 100 });
  const correo = v.correo('correo');
  const contrasena = v.contrasena('contrasena');
  const telefono = v.telefono('telefono');
  const rol = normalizarRol(v, 'rol', true);
  v.verificar();

  if (await buscarCredencialesPorCorreo(correo)) throw conflicto('Ya existe una cuenta con ese correo');

  const idUsuario = await crearUsuario({
    idRol: await obtenerIdRol(rol), nombre, apellido, correo, hash: await generarHash(contrasena), telefono,
  });
  res.status(201).json({ exito: true, mensaje: 'Usuario creado', datos: await buscarUsuarioPorId(idUsuario) });
}

// PUT /api/usuarios/:id   (Administrador)
export async function actualizar(req, res) {
  const idUsuario = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const nombre = v.texto('nombre', { requerido: false, max: 100 });
  const apellido = v.texto('apellido', { requerido: false, max: 100 });
  const telefono = v.telefono('telefono');
  const rol = normalizarRol(v, 'rol', false);
  v.verificar();

  if (!(await buscarUsuarioPorId(idUsuario))) throw noEncontrado('Usuario');
  if (rol && idUsuario === req.usuario.id && rol !== ROLES.ADMIN) {
    throw new ErrorApi(409, 'No puede quitarse a si mismo el rol de administrador');
  }

  await actualizarUsuario(idUsuario, { nombre, apellido, telefono, idRol: rol ? await obtenerIdRol(rol) : null });
  res.json({ exito: true, mensaje: 'Usuario actualizado', datos: await buscarUsuarioPorId(idUsuario) });
}

// PATCH /api/usuarios/:id/estado   { "activo": true|false }   (Administrador)
export async function cambiarEstado(req, res) {
  const idUsuario = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const activo = v.booleano('activo');
  v.verificar();

  if (!(await buscarUsuarioPorId(idUsuario))) throw noEncontrado('Usuario');
  if (idUsuario === req.usuario.id && !activo) throw new ErrorApi(409, 'No puede desactivar su propia cuenta');

  await cambiarEstadoUsuario(idUsuario, activo);
  res.json({
    exito: true,
    mensaje: activo ? 'Usuario activado' : 'Usuario desactivado',
    datos: await buscarUsuarioPorId(idUsuario),
  });
}
