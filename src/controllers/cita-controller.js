/**
 * Modulo: controllers/cita-controller.js
 * Proposito: agendamiento de citas (RF03, RF06, RF07, RF10) con sus reglas:
 *   - el barbero debe atender ese dia y a esa hora (horario_barbero, RF09);
 *   - ni el barbero ni el cliente pueden tener otra cita que se cruce;
 *   - una cita "pendiente" se cancela sola si no se confirma a tiempo (RF06);
 *   - cada rol solo ve y modifica lo que le corresponde.
 * Notificaciones: RF01 (al dueno al agendar), RF05 (al cancelar), RF08 (al cliente).
 */
import { enTransaccion } from '../config/database.js';
import { Validador, idDeRuta } from '../utils/validador.js';
import { ErrorApi, noEncontrado, prohibido, conflicto } from '../utils/error-api.js';
import { ROLES, ESTADOS_CITA, INTERVALO_AGENDA_MIN } from '../utils/constantes.js';
import { MINUTOS_CONFIRMACION_CITA } from '../config/entorno.js';
import {
  ahoraTexto, sumarMinutos, diaSemana, minutosDelDia, horaDesdeMinutos,
} from '../utils/fechas.js';
import { notificar, notificarAdministradores } from '../utils/notificar.js';
import { buscarUsuarioPorId } from '../models/usuario-model.js';
import { buscarServicioPorId } from '../models/servicio-model.js';
import { horariosDelDia } from '../models/horario-model.js';
import {
  listarCitas, buscarCitaPorId, bloquearAgendaBarbero, citasQueSeCruzan, citasActivasDelBarberoEnFecha,
  insertarCita, reprogramarCita, cambiarEstadoCita,
} from '../models/cita-model.js';

// Transiciones de estado permitidas
const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['cancelada', 'completada'],
  cancelada: [],
  completada: [],
};

const describirCita = (cita) => `${cita.nombreServicio} con ${cita.nombreBarbero} el ${cita.fecha} a las ${cita.hora}`;

/** Devuelve la cita si el usuario puede verla; si no, 404 (no se revela que existe). */
async function citaVisiblePara(usuario, idCita) {
  const cita = await buscarCitaPorId(idCita);
  const puedeVer = cita && (
    usuario.rol === ROLES.ADMIN
    || (usuario.rol === ROLES.CLIENTE && cita.idCliente === usuario.id)
    || (usuario.rol === ROLES.BARBERO && cita.idBarbero === usuario.id)
  );
  if (!puedeVer) throw noEncontrado('Cita');
  return cita;
}

async function exigirUsuarioConRol(idUsuario, rol, etiqueta) {
  const usuario = await buscarUsuarioPorId(idUsuario);
  if (!usuario || usuario.rol !== rol) throw new ErrorApi(404, `${etiqueta} no encontrado`);
  if (!usuario.activo) throw conflicto(`El ${etiqueta.toLowerCase()} esta inactivo`);
  return usuario;
}

async function exigirServicioActivo(idServicio) {
  const servicio = await buscarServicioPorId(idServicio);
  if (!servicio) throw noEncontrado('Servicio');
  if (!servicio.activo) throw conflicto('El servicio no esta disponible');
  return servicio;
}

/**
 * Reglas de agenda dentro de la transaccion: fecha futura, horario del barbero
 * y que no haya cruces con otras citas del barbero o del cliente.
 */
async function validarAgenda(conexion, { idBarbero, idCliente, servicio, inicio, excluirIdCita = 0 }) {
  if (inicio <= ahoraTexto()) throw new ErrorApi(400, 'La fecha y hora de la cita deben ser futuras');

  const fin = sumarMinutos(inicio, servicio.duracionMin);
  if (fin.slice(0, 10) !== inicio.slice(0, 10)) throw conflicto('La cita debe terminar el mismo dia');

  // ¿El barbero atiende ese dia y la cita cabe completa en una de sus franjas?
  const franjas = await horariosDelDia(idBarbero, diaSemana(inicio), conexion);
  const minutoInicio = minutosDelDia(inicio.slice(11, 16));
  const minutoFin = minutoInicio + servicio.duracionMin;
  const cabe = franjas.some((f) => minutoInicio >= minutosDelDia(f.horaInicio) && minutoFin <= minutosDelDia(f.horaFin));
  if (!cabe) throw conflicto('El barbero no atiende en ese horario. Consulte la disponibilidad');

  // Bloqueo de la agenda del barbero y revision de cruces
  await bloquearAgendaBarbero(conexion, idBarbero);
  const cruces = await citasQueSeCruzan(conexion, { idBarbero, idCliente, inicio, fin, excluirIdCita });
  if (cruces.some((c) => c.id_barbero === idBarbero)) throw conflicto('El barbero ya tiene una cita en ese horario');
  if (cruces.length > 0) throw conflicto('El cliente ya tiene otra cita en ese horario');
}

// GET /api/citas?estado=&desde=&hasta=&idBarbero=&idCliente=
export async function listar(req, res) {
  const v = new Validador(req.query);
  const filtros = {
    estado: v.opcion('estado', ESTADOS_CITA, { requerido: false }),
    desde: v.fecha('desde', { requerido: false }),
    hasta: v.fecha('hasta', { requerido: false }),
    idBarbero: v.entero('idBarbero', { requerido: false, min: 1 }),
    idCliente: v.entero('idCliente', { requerido: false, min: 1 }),
  };
  v.verificar();

  // Cada rol ve solo lo suyo (los filtros de otra persona se ignoran)
  if (req.usuario.rol === ROLES.CLIENTE) filtros.idCliente = req.usuario.id;
  if (req.usuario.rol === ROLES.BARBERO) filtros.idBarbero = req.usuario.id;

  res.json({ exito: true, datos: await listarCitas(filtros) });
}

// GET /api/citas/disponibilidad?idBarbero=&fecha=AAAA-MM-DD&idServicio=
export async function disponibilidad(req, res) {
  const v = new Validador(req.query);
  const idBarbero = v.entero('idBarbero', { min: 1 });
  const fecha = v.fecha('fecha');
  const idServicio = v.entero('idServicio', { min: 1 });
  v.verificar();

  await exigirUsuarioConRol(idBarbero, ROLES.BARBERO, 'Barbero');
  const servicio = await exigirServicioActivo(idServicio);

  const franjas = await horariosDelDia(idBarbero, diaSemana(`${fecha} 00:00:00`));
  const ocupadas = (await citasActivasDelBarberoEnFecha(idBarbero, fecha)).map((c) => {
    const inicio = minutosDelDia(String(c.fecha_hora).slice(11, 16));
    return [inicio, inicio + c.duracion_min];
  });
  const ahora = ahoraTexto();

  const horas = [];
  for (const franja of franjas) {
    for (let m = minutosDelDia(franja.horaInicio); m + servicio.duracionMin <= minutosDelDia(franja.horaFin); m += INTERVALO_AGENDA_MIN) {
      const libre = ocupadas.every(([ini, fin]) => m + servicio.duracionMin <= ini || m >= fin);
      const futura = `${fecha} ${horaDesdeMinutos(m)}:00` > ahora;
      if (libre && futura) horas.push(horaDesdeMinutos(m));
    }
  }

  res.json({
    exito: true,
    datos: { idBarbero, fecha, idServicio, duracionMin: servicio.duracionMin, atiende: franjas.length > 0, horas },
  });
}

// GET /api/citas/:id
export async function obtener(req, res) {
  res.json({ exito: true, datos: await citaVisiblePara(req.usuario, idDeRuta(req.params.id)) });
}

// POST /api/citas   { idBarbero, idServicio, fechaHora, notas, idCliente (solo admin) }
export async function crear(req, res) {
  if (req.usuario.rol === ROLES.BARBERO) throw prohibido('Los barberos no agendan citas; las agenda el cliente o el administrador');

  const v = new Validador(req.body);
  const idBarbero = v.entero('idBarbero', { min: 1 });
  const idServicio = v.entero('idServicio', { min: 1 });
  const inicio = v.fechaHora('fechaHora');
  const notas = v.texto('notas', { requerido: false, max: 500 });
  const idClienteSolicitado = v.entero('idCliente', { requerido: req.usuario.rol === ROLES.ADMIN, min: 1 });
  v.verificar();

  // El cliente siempre agenda a su nombre; el administrador indica el cliente
  const idCliente = req.usuario.rol === ROLES.CLIENTE ? req.usuario.id : idClienteSolicitado;
  if (req.usuario.rol === ROLES.CLIENTE && idClienteSolicitado && idClienteSolicitado !== req.usuario.id) {
    throw prohibido('Solo puede agendar citas a su nombre');
  }

  await exigirUsuarioConRol(idCliente, ROLES.CLIENTE, 'Cliente');
  await exigirUsuarioConRol(idBarbero, ROLES.BARBERO, 'Barbero');
  const servicio = await exigirServicioActivo(idServicio);

  // Limite para confirmar: MINUTOS_CONFIRMACION_CITA o el inicio de la cita, lo que ocurra primero
  const limite = sumarMinutos(ahoraTexto(), MINUTOS_CONFIRMACION_CITA);
  const expiraEn = limite < inicio ? limite : inicio;

  const idCita = await enTransaccion(async (conexion) => {
    await validarAgenda(conexion, { idBarbero, idCliente, servicio, inicio });
    return insertarCita(conexion, { idCliente, idBarbero, idServicio, fechaHora: inicio, expiraEn, notas, precio: servicio.precio });
  });

  const cita = await buscarCitaPorId(idCita);
  await notificar([cita.idCliente], 'cita', `Tu cita quedo agendada: ${describirCita(cita)}. Pendiente de confirmacion.`);
  await notificar([cita.idBarbero], 'cita', `Nueva cita: ${cita.nombreCliente}, ${cita.nombreServicio} el ${cita.fecha} a las ${cita.hora}.`);
  await notificarAdministradores('cita', `Nueva cita agendada por ${cita.nombreCliente}: ${describirCita(cita)}.`);

  res.status(201).json({ exito: true, mensaje: 'Cita agendada. Queda pendiente de confirmacion', datos: cita });
}

// PUT /api/citas/:id   { fechaHora, idBarbero?, idServicio? }  -> reprogramar (RF10)
export async function reprogramar(req, res) {
  if (req.usuario.rol === ROLES.BARBERO) throw prohibido('Los barberos no reprograman citas');
  const idCita = idDeRuta(req.params.id);
  const actual = await citaVisiblePara(req.usuario, idCita);
  if (!['pendiente', 'confirmada'].includes(actual.estado)) {
    throw conflicto(`No se puede reprogramar una cita ${actual.estado}`);
  }

  const v = new Validador(req.body);
  const inicio = v.fechaHora('fechaHora');
  const idBarbero = v.entero('idBarbero', { requerido: false, min: 1 }) ?? actual.idBarbero;
  const idServicio = v.entero('idServicio', { requerido: false, min: 1 }) ?? actual.idServicio;
  v.verificar();

  if (idBarbero !== actual.idBarbero) await exigirUsuarioConRol(idBarbero, ROLES.BARBERO, 'Barbero');
  const servicio = await exigirServicioActivo(idServicio);
  const cambioServicio = idServicio !== actual.idServicio;

  await enTransaccion(async (conexion) => {
    await validarAgenda(conexion, { idBarbero, idCliente: actual.idCliente, servicio, inicio, excluirIdCita: idCita });
    await reprogramarCita(conexion, idCita, { idBarbero, idServicio, fechaHora: inicio, precio: servicio.precio, cambioServicio });
  });

  const cita = await buscarCitaPorId(idCita);
  await notificar([cita.idCliente, cita.idBarbero, actual.idBarbero], 'cita', `Cita reprogramada: ${describirCita(cita)}.`);
  res.json({ exito: true, mensaje: 'Cita reprogramada', datos: cita });
}

// PATCH /api/citas/:id/estado   { "estado": "confirmada" | "cancelada" | "completada" }
export async function cambiarEstado(req, res) {
  const idCita = idDeRuta(req.params.id);
  const v = new Validador(req.body);
  const nuevoEstado = v.opcion('estado', ['confirmada', 'cancelada', 'completada']);
  v.verificar();

  const cita = await citaVisiblePara(req.usuario, idCita);
  const { rol } = req.usuario;

  // Permisos por rol: el cliente solo puede cancelar; confirmar y completar es del barbero o del admin
  if (rol === ROLES.CLIENTE && nuevoEstado !== 'cancelada') throw prohibido('El cliente solo puede cancelar sus citas');

  if (!TRANSICIONES[cita.estado].includes(nuevoEstado)) {
    throw conflicto(`No se puede pasar una cita de "${cita.estado}" a "${nuevoEstado}"`);
  }

  await cambiarEstadoCita(idCita, nuevoEstado);
  const actualizada = await buscarCitaPorId(idCita);

  if (nuevoEstado === 'confirmada') {
    await notificar([cita.idCliente], 'cita', `Tu cita fue confirmada: ${describirCita(cita)}.`);
  } else if (nuevoEstado === 'completada') {
    await notificar([cita.idCliente], 'cita', `Gracias por tu visita. Cita completada: ${describirCita(cita)}.`);
  } else {
    // Cancelacion: avisar a la otra parte y al dueno (RF05)
    const quien = rol === ROLES.CLIENTE ? 'el cliente' : rol === ROLES.BARBERO ? 'el barbero' : 'el administrador';
    await notificar([cita.idCliente, cita.idBarbero].filter((id) => id !== req.usuario.id), 'cita', `Cita cancelada por ${quien}: ${describirCita(cita)}.`);
    await notificarAdministradores('cita', `Cita cancelada por ${quien} (${cita.nombreCliente}): ${describirCita(cita)}.`);
  }

  res.json({ exito: true, mensaje: `Cita ${nuevoEstado}`, datos: actualizada });
}
