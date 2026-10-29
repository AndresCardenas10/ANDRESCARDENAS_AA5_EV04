/**
 * Modulo: controllers/auth-controller.js
 * Proposito: registro de clientes, inicio de sesion (JWT), perfil y
 * recuperacion de contrasena (RNF04, RNF08).
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { JWT_SECRETO, JWT_EXPIRA, MODO_DESARROLLO } from '../config/entorno.js';
import { Validador } from '../utils/validador.js';
import { ErrorApi, conflicto } from '../utils/error-api.js';
import { ROLES } from '../utils/constantes.js';
import { sumarMinutos, ahoraTexto } from '../utils/fechas.js';
import { estaBloqueado, registrarFallo, limpiarFallos } from '../utils/limite-intentos.js';
import {
  buscarCredencialesPorCorreo, buscarUsuarioPorId, buscarHashPorId, crearUsuario, obtenerIdRol,
  actualizarUsuario, actualizarHash, guardarTokenRecuperacion, restablecerContrasena, aUsuarioPublico,
} from '../models/usuario-model.js';

const RONDAS_BCRYPT = 10;
const MINUTOS_VALIDEZ_CODIGO = 15;
const MENSAJE_CREDENCIALES = 'Correo o contrasena incorrectos';

/**
 * Genera el hash bcrypt con prefijo "$2a$". Es el mismo algoritmo que "$2b$",
 * pero asi tambien lo reconoce la API Java del proyecto (jBCrypt), que comparte la base.
 */
export async function generarHash(contrasena) {
  const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
  return hash.replace(/^\$2b\$/, '$2a$');
}

/** Compara la contrasena. Acepta contrasenas antiguas guardadas sin cifrar. */
async function contrasenaCoincide(contrasena, guardada) {
  if (/^\$2[aby]\$\d{2}\$/.test(guardada)) return bcrypt.compare(contrasena, guardada);
  // Contrasena antigua en texto plano: comparacion en tiempo constante
  const a = Buffer.from(contrasena);
  const b = Buffer.from(guardada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const hashCodigo = (codigo) => crypto.createHash('sha256').update(codigo).digest('hex');

function firmarToken(usuario) {
  return jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, JWT_SECRETO, { expiresIn: JWT_EXPIRA });
}

// POST /api/auth/registro  -> crea una cuenta de Cliente
export async function registrarCliente(req, res) {
  const v = new Validador(req.body);
  const nombre = v.texto('nombre', { max: 100 });
  const apellido = v.texto('apellido', { max: 100 });
  const correo = v.correo('correo');
  const contrasena = v.contrasena('contrasena');
  const telefono = v.telefono('telefono');
  v.verificar();

  if (await buscarCredencialesPorCorreo(correo)) throw conflicto('Ya existe una cuenta con ese correo');

  const idRol = await obtenerIdRol(ROLES.CLIENTE);
  const idUsuario = await crearUsuario({ idRol, nombre, apellido, correo, hash: await generarHash(contrasena), telefono });

  res.status(201).json({
    exito: true,
    mensaje: 'Cuenta creada correctamente. Ya puede iniciar sesion',
    datos: await buscarUsuarioPorId(idUsuario),
  });
}

// POST /api/auth/login  -> devuelve el token JWT
export async function iniciarSesion(req, res) {
  const v = new Validador(req.body);
  const correo = v.correo('correo');
  const contrasena = v.texto('contrasena', { max: 200 });
  v.verificar('Debe enviar correo y contrasena');

  if (estaBloqueado(correo)) {
    throw new ErrorApi(429, 'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo');
  }

  const fila = await buscarCredencialesPorCorreo(correo);
  // Mismo mensaje si el correo no existe o la contrasena es incorrecta
  if (!fila || !(await contrasenaCoincide(contrasena, fila.contrasena_hash))) {
    registrarFallo(correo);
    throw new ErrorApi(401, MENSAJE_CREDENCIALES);
  }
  if (!fila.activo) throw new ErrorApi(403, 'Su cuenta esta desactivada. Contacte al administrador');

  limpiarFallos(correo);
  // Migracion automatica: si la contrasena estaba sin cifrar, se cifra ahora
  if (!fila.contrasena_hash.startsWith('$2')) {
    await actualizarHash(fila.id_usuario, await generarHash(contrasena));
  }

  const usuario = aUsuarioPublico(fila);
  res.json({
    exito: true,
    mensaje: 'Autenticación satisfactoria',
    datos: { token: firmarToken(usuario), tipoToken: 'Bearer', expiraEn: JWT_EXPIRA, usuario },
  });
}

// GET /api/auth/perfil
export async function obtenerPerfil(req, res) {
  res.json({ exito: true, datos: req.usuario });
}

// PUT /api/auth/perfil  -> el usuario edita sus propios datos
export async function actualizarPerfil(req, res) {
  const v = new Validador(req.body);
  const nombre = v.texto('nombre', { requerido: false, max: 100 });
  const apellido = v.texto('apellido', { requerido: false, max: 100 });
  const telefono = v.telefono('telefono');
  v.verificar();

  await actualizarUsuario(req.usuario.id, { nombre, apellido, telefono });
  res.json({ exito: true, mensaje: 'Perfil actualizado', datos: await buscarUsuarioPorId(req.usuario.id) });
}

// PUT /api/auth/contrasena  -> cambio de contrasena con la contrasena actual
export async function cambiarContrasena(req, res) {
  const v = new Validador(req.body);
  const actual = v.texto('contrasenaActual', { max: 200 });
  const nueva = v.contrasena('contrasenaNueva');
  v.verificar();

  const guardada = await buscarHashPorId(req.usuario.id);
  if (!(await contrasenaCoincide(actual, guardada))) throw new ErrorApi(400, 'La contrasena actual no es correcta');

  await actualizarHash(req.usuario.id, await generarHash(nueva));
  res.json({ exito: true, mensaje: 'Contrasena actualizada' });
}

// POST /api/auth/recuperar  -> genera un codigo de 6 digitos valido por 15 minutos
export async function solicitarRecuperacion(req, res) {
  const v = new Validador(req.body);
  const correo = v.correo('correo');
  v.verificar();

  const respuesta = {
    exito: true,
    mensaje: 'Si el correo esta registrado, se genero un codigo de recuperacion valido por 15 minutos',
  };

  const fila = await buscarCredencialesPorCorreo(correo);
  if (fila && fila.activo) {
    const codigo = String(crypto.randomInt(100000, 1000000));
    await guardarTokenRecuperacion(fila.id_usuario, hashCodigo(codigo), sumarMinutos(ahoraTexto(), MINUTOS_VALIDEZ_CODIGO));
    // No hay servidor de correo: en desarrollo el codigo se entrega en la respuesta
    if (MODO_DESARROLLO) respuesta.datos = { codigo, nota: 'Solo en modo desarrollo; en produccion se enviaria por correo' };
  }
  // Misma respuesta exista o no el correo, para no revelar que cuentas existen
  res.json(respuesta);
}

// POST /api/auth/restablecer  -> nueva contrasena usando el codigo
export async function restablecer(req, res) {
  const v = new Validador(req.body);
  const correo = v.correo('correo');
  const codigo = v.texto('codigo', { min: 6, max: 6 });
  const nueva = v.contrasena('contrasenaNueva');
  v.verificar();

  const fila = await buscarCredencialesPorCorreo(correo);
  const codigoValido = fila
    && fila.token_recuperacion
    && fila.token_recuperacion === hashCodigo(codigo)
    && fila.expira_token
    && fila.expira_token > ahoraTexto();

  if (!codigoValido) throw new ErrorApi(400, 'El codigo no es valido o ya expiro');

  await restablecerContrasena(fila.id_usuario, await generarHash(nueva));
  limpiarFallos(correo);
  res.json({ exito: true, mensaje: 'Contrasena restablecida. Ya puede iniciar sesion' });
}
