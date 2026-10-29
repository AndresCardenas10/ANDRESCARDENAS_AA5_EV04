/**
 * Modulo: models/horario-model.js
 * Proposito: consultas SQL de la tabla horario_barbero (disponibilidad semanal, RF09).
 */
import pool, { enTransaccion } from '../config/database.js';

const NOMBRES_DIAS = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

export function aHorario(fila) {
  return {
    id: fila.id_horario,
    idBarbero: fila.id_barbero,
    diaSemana: fila.dia_semana,
    nombreDia: NOMBRES_DIAS[fila.dia_semana],
    horaInicio: String(fila.hora_inicio).slice(0, 5),
    horaFin: String(fila.hora_fin).slice(0, 5),
  };
}

export async function listarHorariosBarbero(idBarbero) {
  const [filas] = await pool.execute(
    'SELECT * FROM horario_barbero WHERE id_barbero = ? ORDER BY dia_semana, hora_inicio',
    [idBarbero]
  );
  return filas.map(aHorario);
}

export async function horariosDelDia(idBarbero, diaSemana, conexion = pool) {
  const [filas] = await conexion.execute(
    'SELECT * FROM horario_barbero WHERE id_barbero = ? AND dia_semana = ? ORDER BY hora_inicio',
    [idBarbero, diaSemana]
  );
  return filas.map(aHorario);
}

/** Reemplaza todo el horario semanal del barbero (en una transaccion). */
export async function reemplazarHorarios(idBarbero, horarios) {
  await enTransaccion(async (conexion) => {
    await conexion.execute('DELETE FROM horario_barbero WHERE id_barbero = ?', [idBarbero]);
    for (const franja of horarios) {
      await conexion.execute(
        'INSERT INTO horario_barbero (id_barbero, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
        [idBarbero, franja.diaSemana, franja.horaInicio, franja.horaFin]
      );
    }
  });
}
