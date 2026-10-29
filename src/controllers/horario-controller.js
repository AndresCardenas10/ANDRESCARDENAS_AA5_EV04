/**
 * Modulo: controllers/horario-controller.js
 * Proposito: disponibilidad semanal de los barberos (RF09).
 * El barbero modifica su propio horario; el administrador, el de cualquiera.
 */
import { Validador, idDeRuta } from '../utils/validador.js';
import { ErrorApi, noEncontrado, prohibido } from '../utils/error-api.js';
import { ROLES } from '../utils/constantes.js';
import { minutosDelDia } from '../utils/fechas.js';
import { buscarUsuarioPorId } from '../models/usuario-model.js';
import { listarHorariosBarbero, reemplazarHorarios } from '../models/horario-model.js';

async function exigirBarbero(idBarbero) {
  const barbero = await buscarUsuarioPorId(idBarbero);
  if (!barbero || barbero.rol !== ROLES.BARBERO) throw noEncontrado('Barbero');
  return barbero;
}

// GET /api/horarios/barbero/:idBarbero   (cualquier usuario con sesion)
export async function obtenerHorario(req, res) {
  const idBarbero = idDeRuta(req.params.idBarbero, 'idBarbero');
  await exigirBarbero(idBarbero);
  res.json({ exito: true, datos: await listarHorariosBarbero(idBarbero) });
}

// PUT /api/horarios/barbero/:idBarbero   { "horarios": [{ diaSemana, horaInicio, horaFin }] }
export async function reemplazarHorario(req, res) {
  const idBarbero = idDeRuta(req.params.idBarbero, 'idBarbero');
  const esElMismo = req.usuario.rol === ROLES.BARBERO && req.usuario.id === idBarbero;
  if (req.usuario.rol !== ROLES.ADMIN && !esElMismo) throw prohibido('Solo puede modificar su propio horario');
  await exigirBarbero(idBarbero);

  const lista = req.body?.horarios;
  if (!Array.isArray(lista) || lista.length > 50) {
    throw new ErrorApi(400, 'Debe enviar "horarios" como una lista (puede estar vacia)');
  }

  // Validar cada franja: dia 1-7, inicio antes que fin
  const errores = [];
  const franjas = lista.map((franja, i) => {
    const v = new Validador(franja);
    const limpia = {
      diaSemana: v.entero('diaSemana', { min: 1, max: 7 }),
      horaInicio: v.hora('horaInicio'),
      horaFin: v.hora('horaFin'),
    };
    if (limpia.horaInicio && limpia.horaFin && minutosDelDia(limpia.horaInicio) >= minutosDelDia(limpia.horaFin)) {
      v.agregarError('horaFin', 'Debe ser posterior a la hora de inicio');
    }
    v.errores.forEach((e) => errores.push({ campo: `horarios[${i}].${e.campo}`, mensaje: e.mensaje }));
    return limpia;
  });

  // Validar que las franjas de un mismo dia no se crucen
  if (errores.length === 0) {
    const ordenadas = [...franjas].sort((a, b) => a.diaSemana - b.diaSemana || minutosDelDia(a.horaInicio) - minutosDelDia(b.horaInicio));
    for (let i = 1; i < ordenadas.length; i += 1) {
      const anterior = ordenadas[i - 1];
      const actual = ordenadas[i];
      if (anterior.diaSemana === actual.diaSemana && minutosDelDia(actual.horaInicio) < minutosDelDia(anterior.horaFin)) {
        errores.push({ campo: 'horarios', mensaje: `Hay franjas que se cruzan el dia ${actual.diaSemana}` });
      }
    }
  }
  if (errores.length > 0) throw new ErrorApi(400, 'Horario invalido', errores);

  await reemplazarHorarios(idBarbero, franjas);
  res.json({ exito: true, mensaje: 'Horario actualizado', datos: await listarHorariosBarbero(idBarbero) });
}
