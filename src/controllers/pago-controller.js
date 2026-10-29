/**
 * Modulo: controllers/pago-controller.js
 * Proposito: pagos de las citas (RF04).
 *   - Efectivo: se registra como "pendiente" y el administrador lo verifica al recibirlo.
 *   - Transferencia: exige la imagen del comprobante; el administrador la revisa
 *     y marca el pago como "verificado" o "rechazado".
 * Peticion de registro: multipart/form-data (campos idCita, metodoPago y archivo "comprobante").
 */
import path from 'node:path';
import { Validador, idDeRuta } from '../utils/validador.js';
import { ErrorApi, noEncontrado, prohibido, conflicto } from '../utils/error-api.js';
import { ROLES, METODOS_PAGO, ESTADOS_PAGO } from '../utils/constantes.js';
import { notificar, notificarAdministradores } from '../utils/notificar.js';
import { CARPETA_COMPROBANTES, borrarArchivoSubido } from '../middlewares/subida-comprobante.js';
import { buscarCitaPorId } from '../models/cita-model.js';
import {
  listarPagos, buscarPagoPorId, buscarPagoVigenteDeCita, crearPago, cambiarEstadoPago, aPago,
} from '../models/pago-model.js';

const formatoPesos = (valor) => `$${Number(valor).toLocaleString('es-CO')}`;

/** El cliente solo ve sus pagos; el barbero, los de sus citas; el administrador, todos. */
function puedeVerPago(usuario, filaPago) {
  return usuario.rol === ROLES.ADMIN
    || (usuario.rol === ROLES.CLIENTE && filaPago.id_cliente === usuario.id)
    || (usuario.rol === ROLES.BARBERO && filaPago.id_barbero === usuario.id);
}

// GET /api/pagos?estado=
export async function listar(req, res) {
  const v = new Validador(req.query);
  const estado = v.opcion('estado', ESTADOS_PAGO, { requerido: false });
  v.verificar();

  const filtros = { estado };
  if (req.usuario.rol === ROLES.CLIENTE) filtros.idCliente = req.usuario.id;
  if (req.usuario.rol === ROLES.BARBERO) filtros.idBarbero = req.usuario.id;
  res.json({ exito: true, datos: await listarPagos(filtros) });
}

// GET /api/pagos/:id
export async function obtener(req, res) {
  const fila = await buscarPagoPorId(idDeRuta(req.params.id));
  if (!fila || !puedeVerPago(req.usuario, fila)) throw noEncontrado('Pago');
  res.json({ exito: true, datos: aPago(fila) });
}

// GET /api/pagos/:id/comprobante  -> descarga protegida de la imagen
export async function descargarComprobante(req, res) {
  const fila = await buscarPagoPorId(idDeRuta(req.params.id));
  if (!fila || !puedeVerPago(req.usuario, fila) || !fila.url_comprobante) throw noEncontrado('Comprobante');
  // Solo se usa el nombre del archivo, nunca una ruta enviada por el usuario
  res.sendFile(path.join(CARPETA_COMPROBANTES, path.basename(fila.url_comprobante)));
}

// POST /api/pagos   (Cliente para sus citas; Administrador para cualquiera)
export async function registrar(req, res) {
  try {
    if (req.usuario.rol === ROLES.BARBERO) throw prohibido('Los barberos no registran pagos');

    const v = new Validador(req.body);
    const idCita = v.entero('idCita', { min: 1 });
    const metodoPago = v.opcion('metodoPago', METODOS_PAGO);
    v.verificar();

    const cita = await buscarCitaPorId(idCita);
    const esSuya = cita && (req.usuario.rol === ROLES.ADMIN || cita.idCliente === req.usuario.id);
    if (!esSuya) throw noEncontrado('Cita');
    if (cita.estado === 'cancelada') throw conflicto('No se puede pagar una cita cancelada');
    if (await buscarPagoVigenteDeCita(idCita)) throw conflicto('Esta cita ya tiene un pago registrado');

    if (metodoPago === 'transferencia' && !req.file) {
      throw new ErrorApi(400, 'Para transferencia debe adjuntar la imagen del comprobante (campo "comprobante")');
    }
    if (metodoPago === 'efectivo' && req.file) {
      throw new ErrorApi(400, 'El pago en efectivo no lleva comprobante');
    }

    const idPago = await crearPago({
      idCita,
      monto: cita.precio,
      metodoPago,
      archivoComprobante: req.file ? req.file.filename : null,
    });
    const pago = aPago(await buscarPagoPorId(idPago));

    await notificarAdministradores('pago', `Pago registrado (${metodoPago}) por ${formatoPesos(pago.monto)} para la cita #${idCita} de ${cita.nombreCliente}. Pendiente de verificacion.`);
    const mensaje = metodoPago === 'efectivo'
      ? 'Pago en efectivo registrado. Se paga presencialmente en la barberia'
      : 'Comprobante recibido. El administrador lo verificara';
    res.status(201).json({ exito: true, mensaje, datos: pago });
  } catch (error) {
    borrarArchivoSubido(req.file); // si algo fallo, no se guarda la imagen
    throw error;
  }
}

// PATCH /api/pagos/:id/estado   { "estadoPago": "verificado" | "rechazado" }   (Administrador)
export async function cambiarEstado(req, res) {
  const idPago = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const estadoPago = v.opcion('estadoPago', ['verificado', 'rechazado']);
  v.verificar();

  const fila = await buscarPagoPorId(idPago);
  if (!fila) throw noEncontrado('Pago');
  if (fila.estado_pago !== 'pendiente') throw conflicto(`El pago ya fue ${fila.estado_pago}`);

  await cambiarEstadoPago(idPago, estadoPago);
  const texto = estadoPago === 'verificado'
    ? `Tu pago de ${formatoPesos(fila.monto)} para la cita #${fila.id_cita} fue verificado. ¡Gracias!`
    : `Tu pago de ${formatoPesos(fila.monto)} para la cita #${fila.id_cita} fue rechazado. Registra de nuevo el pago o comunicate con la barberia.`;
  await notificar([fila.id_cliente], 'pago', texto);

  res.json({ exito: true, mensaje: `Pago ${estadoPago}`, datos: aPago(await buscarPagoPorId(idPago)) });
}
