/**
 * Modulo: controllers/reporte-controller.js
 * Proposito: resumen mensual de ingresos y egresos (RF02) e indicadores del
 * panel principal. Solo el administrador.
 */
import { Validador } from '../utils/validador.js';
import { ahoraTexto } from '../utils/fechas.js';
import { obtenerResumenMensual, obtenerIndicadores, obtenerIngresosPorMes } from '../models/reporte-model.js';

const dosDigitos = (n) => String(n).padStart(2, '0');

// GET /api/reportes/resumen-mensual?anio=2026&mes=10   (por defecto: mes actual)
export async function resumenMensual(req, res) {
  const hoy = ahoraTexto();
  const v = new Validador(req.query);
  const anio = v.entero('anio', { requerido: false, min: 2000, max: 2100 }) ?? Number(hoy.slice(0, 4));
  const mes = v.entero('mes', { requerido: false, min: 1, max: 12 }) ?? Number(hoy.slice(5, 7));
  v.verificar();

  const inicio = `${anio}-${dosDigitos(mes)}-01 00:00:00`;
  const fin = mes === 12 ? `${anio + 1}-01-01 00:00:00` : `${anio}-${dosDigitos(mes + 1)}-01 00:00:00`;
  const r = await obtenerResumenMensual(inicio, fin);

  const ingresos = Number(r.ingresos.total);
  const egresos = Number(r.egresos.total);
  const citasPorEstado = { pendiente: 0, confirmada: 0, cancelada: 0, completada: 0 };
  r.citasPorEstado.forEach((fila) => { citasPorEstado[fila.estado] = Number(fila.cantidad); });

  res.json({
    exito: true,
    datos: {
      periodo: `${anio}-${dosDigitos(mes)}`,
      ingresos,
      egresos,
      balance: Math.round((ingresos - egresos) * 100) / 100,
      pagosVerificados: Number(r.ingresos.cantidad),
      comprasInventario: Number(r.egresos.cantidad),
      pagosPendientes: r.pagosPendientes,
      ingresosPorMetodo: Object.fromEntries(r.ingresosPorMetodo.map((f) => [f.metodo_pago, Number(f.total)])),
      citasPorEstado,
      totalCitas: Object.values(citasPorEstado).reduce((a, b) => a + b, 0),
      serviciosMasSolicitados: r.serviciosTop.map((f) => ({ idServicio: f.id_servicio, nombre: f.nombre, cantidad: Number(f.cantidad) })),
    },
  });
}

// GET /api/reportes/indicadores
export async function indicadores(req, res) {
  res.json({ exito: true, datos: await obtenerIndicadores(ahoraTexto().slice(0, 10)) });
}

// GET /api/reportes/ingresos-por-mes?anio=2026   (por defecto: anio actual)
export async function ingresosPorMes(req, res) {
  const v = new Validador(req.query);
  const anio = v.entero('anio', { requerido: false, min: 2000, max: 2100 }) ?? Number(ahoraTexto().slice(0, 4));
  v.verificar();
  const ingresos = await obtenerIngresosPorMes(anio);
  res.json({ exito: true, datos: { anio, ingresos, total: ingresos.reduce((a, b) => a + b, 0) } });
}
