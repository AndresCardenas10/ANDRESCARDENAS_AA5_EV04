/**
 * Modulo: utils/fechas.js
 * Proposito: utilidades de fecha y hora en hora LOCAL (Colombia en el equipo).
 * Las fechas se intercambian con MySQL como texto "AAAA-MM-DD HH:MM:SS".
 */
const dosDigitos = (n) => String(n).padStart(2, '0');

/** Convierte un Date a "AAAA-MM-DD HH:MM:SS" (hora local). */
export function aTextoMysql(fecha) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} `
    + `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}:${dosDigitos(fecha.getSeconds())}`;
}

/** Convierte "AAAA-MM-DD HH:MM[:SS]" o "AAAA-MM-DDTHH:MM" a Date (hora local). */
export function desdeTexto(texto) {
  return new Date(String(texto).replace(' ', 'T'));
}

export function ahoraTexto() {
  return aTextoMysql(new Date());
}

export function sumarMinutos(texto, minutos) {
  const fecha = desdeTexto(texto);
  fecha.setMinutes(fecha.getMinutes() + minutos);
  return aTextoMysql(fecha);
}

/** Dia de la semana como lo guarda horario_barbero: 1 = lunes ... 7 = domingo. */
export function diaSemana(textoFecha) {
  const dia = desdeTexto(textoFecha).getDay(); // 0 = domingo
  return dia === 0 ? 7 : dia;
}

/** "HH:MM:SS" o "HH:MM" -> minutos desde la medianoche. */
export function minutosDelDia(textoHora) {
  const [horas, minutos] = String(textoHora).split(':').map(Number);
  return horas * 60 + minutos;
}

/** Minutos desde la medianoche -> "HH:MM". */
export function horaDesdeMinutos(totalMinutos) {
  return `${dosDigitos(Math.floor(totalMinutos / 60))}:${dosDigitos(totalMinutos % 60)}`;
}
