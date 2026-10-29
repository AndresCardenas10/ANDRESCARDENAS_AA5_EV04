/**
 * Modulo: controllers/producto-controller.js
 * Proposito: inventario de productos y sus movimientos de entrada/salida (RF11).
 * Todas las operaciones son del administrador.
 */
import { Validador, idDeRuta } from '../utils/validador.js';
import { noEncontrado } from '../utils/error-api.js';
import { TIPOS_MOVIMIENTO } from '../utils/constantes.js';
import { notificarAdministradores } from '../utils/notificar.js';
import {
  listarProductos, buscarProductoPorId, crearProducto, actualizarProducto, cambiarEstadoProducto,
  registrarMovimiento, listarMovimientos,
} from '../models/producto-model.js';

function leerDatosProducto(body, { esNuevo }) {
  const v = new Validador(body);
  const datos = {
    nombre: v.texto('nombre', { max: 100 }),
    descripcion: v.texto('descripcion', { requerido: false, max: 1000 }),
    categoria: v.texto('categoria', { requerido: false, max: 50 }),
    unidad: v.texto('unidad', { requerido: false, max: 20 }) ?? 'unidad',
    precio: v.decimal('precio', { min: 0, max: 999999.99 }),
    stockMinimo: v.entero('stockMinimo', { requerido: false, min: 0, max: 100000 }) ?? 5,
  };
  if (esNuevo) {
    datos.stock = v.entero('stock', { requerido: false, min: 0, max: 100000 }) ?? 0;
    datos.costoUnitario = v.decimal('costoUnitario', { requerido: false, min: 0, max: 999999.99 });
  }
  v.verificar();
  return datos;
}

// GET /api/productos?activos=true&stockBajo=true
export async function listar(req, res) {
  const v = new Validador(req.query);
  const soloActivos = v.booleano('activos', { requerido: false }) ?? false;
  const soloStockBajo = v.booleano('stockBajo', { requerido: false }) ?? false;
  v.verificar();
  res.json({ exito: true, datos: await listarProductos({ soloActivos, soloStockBajo }) });
}

// GET /api/productos/movimientos?idProducto=&desde=&hasta=
export async function listarTodosLosMovimientos(req, res) {
  const v = new Validador(req.query);
  const filtros = {
    idProducto: v.entero('idProducto', { requerido: false, min: 1 }),
    desde: v.fecha('desde', { requerido: false }),
    hasta: v.fecha('hasta', { requerido: false }),
  };
  v.verificar();
  res.json({ exito: true, datos: await listarMovimientos(filtros) });
}

// GET /api/productos/:id
export async function obtener(req, res) {
  const producto = await buscarProductoPorId(idDeRuta(req.params.id));
  if (!producto) throw noEncontrado('Producto');
  res.json({ exito: true, datos: producto });
}

// POST /api/productos
export async function crear(req, res) {
  const id = await crearProducto(leerDatosProducto(req.body, { esNuevo: true }), req.usuario.id);
  res.status(201).json({ exito: true, mensaje: 'Producto creado', datos: await buscarProductoPorId(id) });
}

// PUT /api/productos/:id   (no cambia el stock; para eso estan los movimientos)
export async function actualizar(req, res) {
  const idProducto = idDeRuta(req.params.id);
  const datos = leerDatosProducto(req.body, { esNuevo: false });
  if (!(await buscarProductoPorId(idProducto))) throw noEncontrado('Producto');
  await actualizarProducto(idProducto, datos);
  res.json({ exito: true, mensaje: 'Producto actualizado', datos: await buscarProductoPorId(idProducto) });
}

// PATCH /api/productos/:id/estado   { "activo": true|false }
export async function cambiarEstado(req, res) {
  const idProducto = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const activo = v.booleano('activo');
  v.verificar();
  if (!(await buscarProductoPorId(idProducto))) throw noEncontrado('Producto');
  await cambiarEstadoProducto(idProducto, activo);
  res.json({
    exito: true,
    mensaje: activo ? 'Producto activado' : 'Producto desactivado',
    datos: await buscarProductoPorId(idProducto),
  });
}

// GET /api/productos/:id/movimientos
export async function listarMovimientosProducto(req, res) {
  const idProducto = idDeRuta(req.params.id);
  if (!(await buscarProductoPorId(idProducto))) throw noEncontrado('Producto');
  res.json({ exito: true, datos: await listarMovimientos({ idProducto }) });
}

// POST /api/productos/:id/movimientos   { tipo, cantidad, costoUnitario?, motivo? }
export async function registrarMovimientoProducto(req, res) {
  const idProducto = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const datos = {
    tipo: v.opcion('tipo', TIPOS_MOVIMIENTO),
    cantidad: v.entero('cantidad', { min: 1, max: 100000 }),
    costoUnitario: v.decimal('costoUnitario', { requerido: false, min: 0, max: 999999.99 }),
    motivo: v.texto('motivo', { requerido: false, max: 255 }),
  };
  v.verificar();

  const resultado = await registrarMovimiento(idProducto, datos, req.usuario.id);
  const producto = await buscarProductoPorId(idProducto);

  // Si la salida dejo el producto bajo el minimo, se avisa al administrador
  if (datos.tipo === 'salida' && producto.stockBajo) {
    await notificarAdministradores('sistema', `Stock bajo: ${producto.nombre} quedo con ${producto.stock} (minimo ${producto.stockMinimo}).`);
  }

  res.status(201).json({
    exito: true,
    mensaje: `${datos.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada. Stock: ${resultado.stockAnterior} -> ${resultado.stockNuevo}`,
    datos: { ...resultado, producto },
  });
}
