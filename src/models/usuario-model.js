/**
 * Modulo: models/usuario-model.js
 * Proposito: consultas SQL de las tablas usuario y rol.
 * Las funciones publicas nunca devuelven el hash de la contrasena, salvo
 * buscarCredencialesPorCorreo, que solo usa el inicio de sesion.
 */
import pool from '../config/database.js';
import { ROLES } from '../utils/constantes.js';

const CAMPOS_PUBLICOS = `
  u.id_usuario, u.id_rol, r.nombre_rol, u.nombre, u.apellido, u.correo,
  u.telefono, u.activo, u.creado_en`;

/** Convierte una fila de la base de datos al formato JSON de la API. */
export function aUsuarioPublico(fila) {
  if (!fila) return null;
  const usuario = {
    id: fila.id_usuario,
    idRol: fila.id_rol,
    rol: fila.nombre_rol,
    nombre: fila.nombre,
    apellido: fila.apellido,
    nombreCompleto: `${fila.nombre} ${fila.apellido}`.trim(),
    correo: fila.correo,
    telefono: fila.telefono,
    activo: Boolean(fila.activo),
    creadoEn: fila.creado_en,
  };
  // Estadisticas opcionales (listado de clientes del administrador)
  if (fila.total_citas !== undefined) usuario.totalCitas = Number(fila.total_citas);
  if (fila.total_gastado !== undefined) usuario.totalGastado = Number(fila.total_gastado);
  return usuario;
}

export async function buscarUsuarioPorId(idUsuario) {
  const [filas] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`,
    [idUsuario]
  );
  return aUsuarioPublico(filas[0]);
}

/** Solo para el login y la recuperacion: incluye hash y token. */
export async function buscarCredencialesPorCorreo(correo) {
  const [filas] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS}, u.contrasena_hash, u.token_recuperacion, u.expira_token
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.correo = ?`,
    [correo]
  );
  return filas[0] || null;
}

export async function buscarHashPorId(idUsuario) {
  const [filas] = await pool.execute('SELECT contrasena_hash FROM usuario WHERE id_usuario = ?', [idUsuario]);
  return filas[0]?.contrasena_hash || null;
}

/** Lista usuarios con filtros opcionales. Para clientes agrega citas y total gastado. */
export async function listarUsuarios({ rol = null, activo = null, buscar = null } = {}) {
  const condiciones = [];
  const valores = [];
  if (rol) { condiciones.push('r.nombre_rol = ?'); valores.push(rol); }
  if (activo !== null) { condiciones.push('u.activo = ?'); valores.push(activo ? 1 : 0); }
  if (buscar) {
    condiciones.push("(CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR u.correo LIKE ?)");
    valores.push(`%${buscar}%`, `%${buscar}%`);
  }
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.execute(
    `SELECT ${CAMPOS_PUBLICOS},
            (SELECT COUNT(*) FROM cita c WHERE c.id_cliente = u.id_usuario AND c.estado = 'completada') AS total_citas,
            (SELECT COALESCE(SUM(p.monto), 0) FROM pago p JOIN cita c ON c.id_cita = p.id_cita
              WHERE c.id_cliente = u.id_usuario AND p.estado_pago = 'verificado') AS total_gastado
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       ${donde}
      ORDER BY u.nombre, u.apellido`,
    valores
  );
  return filas.map(aUsuarioPublico);
}

export async function obtenerIdRol(nombreRol) {
  const [filas] = await pool.execute('SELECT id_rol FROM rol WHERE nombre_rol = ?', [nombreRol]);
  return filas[0]?.id_rol || null;
}

export async function crearUsuario({ idRol, nombre, apellido, correo, hash, telefono }) {
  const [resultado] = await pool.execute(
    `INSERT INTO usuario (id_rol, nombre, apellido, correo, contrasena_hash, telefono, activo)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [idRol, nombre, apellido, correo, hash, telefono]
  );
  return resultado.insertId;
}

/** Actualiza solo los campos recibidos (nombre, apellido, telefono, idRol). */
export async function actualizarUsuario(idUsuario, campos) {
  const columnas = { nombre: 'nombre', apellido: 'apellido', telefono: 'telefono', idRol: 'id_rol' };
  const asignaciones = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(columnas)) {
    if (campos[clave] !== undefined && campos[clave] !== null) {
      asignaciones.push(`${columna} = ?`);
      valores.push(campos[clave]);
    }
  }
  if (asignaciones.length === 0) return;
  valores.push(idUsuario);
  await pool.execute(`UPDATE usuario SET ${asignaciones.join(', ')} WHERE id_usuario = ?`, valores);
}

export async function cambiarEstadoUsuario(idUsuario, activo) {
  await pool.execute('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [activo ? 1 : 0, idUsuario]);
}

export async function actualizarHash(idUsuario, hash) {
  await pool.execute('UPDATE usuario SET contrasena_hash = ? WHERE id_usuario = ?', [hash, idUsuario]);
}

export async function guardarTokenRecuperacion(idUsuario, tokenHash, expira) {
  await pool.execute(
    'UPDATE usuario SET token_recuperacion = ?, expira_token = ? WHERE id_usuario = ?',
    [tokenHash, expira, idUsuario]
  );
}

/** Cambia la contrasena y borra el token de recuperacion usado. */
export async function restablecerContrasena(idUsuario, hash) {
  await pool.execute(
    'UPDATE usuario SET contrasena_hash = ?, token_recuperacion = NULL, expira_token = NULL WHERE id_usuario = ?',
    [hash, idUsuario]
  );
}

/** Ids de los administradores activos (para enviarles notificaciones). */
export async function idsAdministradores() {
  const [filas] = await pool.execute(
    `SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre_rol = ? AND u.activo = 1`,
    [ROLES.ADMIN]
  );
  return filas.map((fila) => fila.id_usuario);
}
