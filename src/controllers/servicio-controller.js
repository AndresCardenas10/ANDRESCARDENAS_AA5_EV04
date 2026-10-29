/**
 * Modulo: controllers/servicio-controller.js
 * Proposito: catalogo de servicios (RF03). Consultar es publico; crear,
 * editar y activar/desactivar es solo del administrador.
 * Los servicios no se borran: se desactivan, porque las citas antiguas los referencian.
 */
import { Validador, idDeRuta } from '../utils/validador.js';
import { ErrorApi, noEncontrado } from '../utils/error-api.js';
import { ROLES } from '../utils/constantes.js';
import {
  listarServicios, buscarServicioPorId, crearServicio, actualizarServicio, cambiarEstadoServicio,
} from '../models/servicio-model.js';

function leerDatosServicio(body) {
  const v = new Validador(body);
  const datos = {
    nombre: v.texto('nombre', { max: 100 }),
    descripcion: v.texto('descripcion', { requerido: false, max: 1000 }),
    precio: v.decimal('precio', { min: 0, max: 999999.99 }),
    duracionMin: v.entero('duracionMin', { min: 5, max: 480 }),
    categoria: v.texto('categoria', { requerido: false, max: 50 }),
  };
  v.verificar();
  return datos;
}

// GET /api/servicios   (publico; ?todos=true solo para el administrador)
export async function listar(req, res) {
  const quiereTodos = req.query.todos === 'true';
  if (quiereTodos && req.usuario?.rol !== ROLES.ADMIN) {
    throw new ErrorApi(403, 'Solo el administrador puede ver los servicios desactivados');
  }
  res.json({ exito: true, datos: await listarServicios({ soloActivos: !quiereTodos }) });
}

// GET /api/servicios/:id   (publico)
export async function obtener(req, res) {
  const servicio = await buscarServicioPorId(idDeRuta(req.params.id));
  if (!servicio || (!servicio.activo && req.usuario?.rol !== ROLES.ADMIN)) throw noEncontrado('Servicio');
  res.json({ exito: true, datos: servicio });
}

// POST /api/servicios   (Administrador)
export async function crear(req, res) {
  const id = await crearServicio(leerDatosServicio(req.body));
  res.status(201).json({ exito: true, mensaje: 'Servicio creado', datos: await buscarServicioPorId(id) });
}

// PUT /api/servicios/:id   (Administrador)
export async function actualizar(req, res) {
  const idServicio = idDeRuta(req.params.id);
  const datos = leerDatosServicio(req.body);
  if (!(await buscarServicioPorId(idServicio))) throw noEncontrado('Servicio');
  await actualizarServicio(idServicio, datos);
  res.json({ exito: true, mensaje: 'Servicio actualizado', datos: await buscarServicioPorId(idServicio) });
}

// PATCH /api/servicios/:id/estado   { "activo": true|false }   (Administrador)
export async function cambiarEstado(req, res) {
  const idServicio = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const activo = v.booleano('activo');
  v.verificar();
  if (!(await buscarServicioPorId(idServicio))) throw noEncontrado('Servicio');
  await cambiarEstadoServicio(idServicio, activo);
  res.json({
    exito: true,
    mensaje: activo ? 'Servicio activado' : 'Servicio desactivado',
    datos: await buscarServicioPorId(idServicio),
  });
}
