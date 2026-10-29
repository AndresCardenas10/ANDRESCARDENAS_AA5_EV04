/**
 * Modulo: utils/validador.js
 * Proposito: validar los datos que llegan en las peticiones (body o query).
 *
 * Uso:
 *   const v = new Validador(req.body);
 *   const nombre = v.texto('nombre', { max: 100 });
 *   const precio = v.decimal('precio', { min: 0 });
 *   v.verificar(); // si hubo errores lanza ErrorApi 400 con la lista de campos
 *
 * Cada metodo devuelve el valor ya limpio (o null si el campo es opcional y no vino).
 */
import { ErrorApi } from './error-api.js';

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_FECHA_HORA = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

const estaVacio = (valor) => valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');

export class Validador {
  constructor(datos) {
    this.datos = datos ?? {};
    this.errores = [];
  }

  agregarError(campo, mensaje) {
    this.errores.push({ campo, mensaje });
    return null;
  }

  /** Revisa si el campo falta. Devuelve true si se debe seguir validando. */
  presente(campo, requerido) {
    if (estaVacio(this.datos[campo])) {
      if (requerido) this.agregarError(campo, 'Es obligatorio');
      return false;
    }
    return true;
  }

  texto(campo, { requerido = true, min = 1, max = 255 } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = this.datos[campo];
    if (typeof valor !== 'string') return this.agregarError(campo, 'Debe ser texto');
    const limpio = valor.trim();
    if (limpio.length < min) return this.agregarError(campo, `Debe tener al menos ${min} caracteres`);
    if (limpio.length > max) return this.agregarError(campo, `No puede superar ${max} caracteres`);
    return limpio;
  }

  correo(campo, { requerido = true } = {}) {
    const valor = this.texto(campo, { requerido, max: 150 });
    if (valor === null) return null;
    if (!PATRON_CORREO.test(valor)) return this.agregarError(campo, 'No es un correo valido');
    return valor.toLowerCase();
  }

  /** Contrasena: 8 a 72 caracteres, con al menos una letra y un numero. */
  contrasena(campo, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = this.datos[campo];
    if (typeof valor !== 'string') return this.agregarError(campo, 'Debe ser texto');
    if (valor.length < 8) return this.agregarError(campo, 'Debe tener al menos 8 caracteres');
    if (Buffer.byteLength(valor, 'utf8') > 72) return this.agregarError(campo, 'Es demasiado larga');
    if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
      return this.agregarError(campo, 'Debe incluir al menos una letra y un numero');
    }
    return valor;
  }

  telefono(campo, { requerido = false } = {}) {
    const valor = this.texto(campo, { requerido, max: 20 });
    if (valor === null) return null;
    if (!/^[+\d\s()-]{7,20}$/.test(valor)) return this.agregarError(campo, 'No es un telefono valido');
    return valor;
  }

  entero(campo, { requerido = true, min, max } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = Number(this.datos[campo]);
    if (!Number.isInteger(valor)) return this.agregarError(campo, 'Debe ser un numero entero');
    if (min !== undefined && valor < min) return this.agregarError(campo, `Debe ser mayor o igual a ${min}`);
    if (max !== undefined && valor > max) return this.agregarError(campo, `Debe ser menor o igual a ${max}`);
    return valor;
  }

  decimal(campo, { requerido = true, min, max } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = Number(this.datos[campo]);
    if (!Number.isFinite(valor)) return this.agregarError(campo, 'Debe ser un numero');
    if (min !== undefined && valor < min) return this.agregarError(campo, `Debe ser mayor o igual a ${min}`);
    if (max !== undefined && valor > max) return this.agregarError(campo, `Debe ser menor o igual a ${max}`);
    return Math.round(valor * 100) / 100;
  }

  booleano(campo, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = this.datos[campo];
    if (valor === true || valor === 'true' || valor === 1 || valor === '1') return true;
    if (valor === false || valor === 'false' || valor === 0 || valor === '0') return false;
    return this.agregarError(campo, 'Debe ser true o false');
  }

  opcion(campo, opciones, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = String(this.datos[campo]).trim().toLowerCase();
    if (!opciones.includes(valor)) return this.agregarError(campo, `Debe ser uno de: ${opciones.join(', ')}`);
    return valor;
  }

  /** Fecha "AAAA-MM-DD" valida en el calendario. */
  fecha(campo, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = String(this.datos[campo]).trim();
    if (!PATRON_FECHA.test(valor) || !esFechaReal(valor)) return this.agregarError(campo, 'Fecha invalida (formato AAAA-MM-DD)');
    return valor;
  }

  /** Fecha y hora "AAAA-MM-DDTHH:MM" -> "AAAA-MM-DD HH:MM:00" (formato MySQL). */
  fechaHora(campo, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const coincidencia = PATRON_FECHA_HORA.exec(String(this.datos[campo]).trim());
    if (!coincidencia || !esFechaReal(coincidencia[1]) || Number(coincidencia[2]) > 23 || Number(coincidencia[3]) > 59) {
      return this.agregarError(campo, 'Fecha y hora invalidas (formato AAAA-MM-DDTHH:MM)');
    }
    return `${coincidencia[1]} ${coincidencia[2]}:${coincidencia[3]}:00`;
  }

  /** Hora "HH:MM" -> "HH:MM:00". */
  hora(campo, { requerido = true } = {}) {
    if (!this.presente(campo, requerido)) return null;
    const valor = String(this.datos[campo]).trim();
    if (!PATRON_HORA.test(valor)) return this.agregarError(campo, 'Hora invalida (formato HH:MM)');
    return `${valor.slice(0, 5)}:00`;
  }

  /** Lanza ErrorApi 400 si se acumulo algun error. */
  verificar(mensaje = 'Datos invalidos') {
    if (this.errores.length > 0) throw new ErrorApi(400, mensaje, this.errores);
  }
}

function esFechaReal(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/** Valida un id numerico de la URL (req.params). */
export function idDeRuta(valor, nombre = 'id') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id < 1) throw new ErrorApi(400, `El ${nombre} de la URL no es valido`);
  return id;
}
