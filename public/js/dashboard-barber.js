// SGB — dashboard-barber.js
// Panel del barbero conectado a la API:
//   agenda real (sus citas), confirmar / completar / cancelar,
//   disponibilidad semanal guardada en horario_barbero, calendario y clientes.

const sesion = exigirSesion('Barbero');
const ID_BARBERO = sesion.usuario.id;

let calDate = new Date();
let selectedDay = null;
let misCitas = [];
let filtroActual = 'todas';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOTS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

function rootUrl() { return '/index.html'; }

async function init() {
  const nombre = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim();
  document.getElementById('sidebarAvatar').textContent = iniciales(nombre);
  document.getElementById('sidebarName').textContent = nombre;
  document.getElementById('topbarSub').textContent = `Bienvenido, ${sesion.usuario.nombre}`;
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  iniciarNotificaciones();
  await refrescar();
  loadAvailability();
}

/** Vuelve a pedir las citas y repinta todas las vistas. */
async function refrescar() {
  try {
    const { datos } = await api('/citas');
    misCitas = datos;
  } catch (error) { mostrarError(error); return; }
  loadDashboard();
  loadAllAppts();
  renderCalendar();
  loadClients();
  if (selectedDay) pintarDia(selectedDay);
}

function loadDashboard() {
  const hoy = hoyLocal();
  const mes = hoy.slice(0, 7);
  const citasHoy = misCitas.filter((c) => c.fecha === hoy && c.estado !== 'cancelada');
  const pendientes = misCitas.filter((c) => c.estado === 'pendiente');
  const completadasMes = misCitas.filter((c) => c.estado === 'completada' && c.fecha.startsWith(mes));
  const generado = completadasMes.reduce((s, c) => s + c.precio, 0);
  document.getElementById('statHoy').textContent = citasHoy.length;
  document.getElementById('statPend').textContent = pendientes.length;
  document.getElementById('statComp').textContent = completadasMes.length;
  document.getElementById('statGen').textContent = formatoMiles(generado);

  const ordenar = (lista) => [...lista].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  document.getElementById('todayList').innerHTML = citasHoy.length
    ? ordenar(citasHoy).map(apptItemHtml).join('') : '<div class="empty-state">No hay citas hoy</div>';

  const proximas = ordenar(misCitas.filter((c) => c.fecha > hoy && (c.estado === 'pendiente' || c.estado === 'confirmada'))).slice(0, 4);
  document.getElementById('upcomingList').innerHTML = proximas.length
    ? proximas.map(apptItemHtml).join('') : '<div class="empty-state">Sin próximas citas</div>';
}

function apptItemHtml(c) {
  const hora = Number(c.hora.slice(0, 2));
  const acciones = [];
  if (c.estado === 'pendiente') acciones.push(`<button class="icon-btn confirm" title="Confirmar" onclick="changeApptStatus(${c.id},'confirmada')"><i class="fas fa-check"></i></button>`);
  if (c.estado === 'confirmada') acciones.push(`<button class="icon-btn complete" title="Completar" onclick="changeApptStatus(${c.id},'completada')"><i class="fas fa-flag-checkered"></i></button>`);
  if (c.estado === 'pendiente' || c.estado === 'confirmada') acciones.push(`<button class="icon-btn cancel" title="Cancelar" onclick="changeApptStatus(${c.id},'cancelada')"><i class="fas fa-times"></i></button>`);
  else acciones.push(badgeEstado(c.estado));

  return `<div class="appt-item">
    <div class="appt-time-block">
      <div class="appt-time-hour">${escaparHtml(c.hora)}</div>
      <div class="appt-time-period">${hora >= 12 ? 'PM' : 'AM'}</div>
    </div>
    <div class="appt-info">
      <div class="appt-service">${escaparHtml(c.nombreServicio)} ${c.estado === 'pendiente' ? badgeEstado('pendiente') : ''}</div>
      <div class="appt-client">${escaparHtml(c.nombreCliente)} · ${escaparHtml(c.fecha)}${c.notas ? ' · ' + escaparHtml(c.notas) : ''}</div>
    </div>
    <div class="appt-price">${formatoMiles(c.precio)}</div>
    <div class="appt-actions">${acciones.join('')}</div>
  </div>`;
}

async function changeApptStatus(id, estado) {
  try {
    await api(`/citas/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });
    const textos = { confirmada: ['Cita confirmada', 'success'], completada: ['Cita completada', 'info'], cancelada: ['Cita cancelada', 'error'] };
    showToast(...textos[estado]);
  } catch (error) { mostrarError(error); }
  refrescar();
}

function loadAllAppts(filter = filtroActual) {
  filtroActual = filter;
  const lista = filter === 'todas' ? misCitas : misCitas.filter((c) => c.estado === filter);
  document.getElementById('allApptsList').innerHTML = lista.length
    ? lista.map(apptItemHtml).join('') : '<div class="empty-state">Sin citas</div>';
}

function filterBarberAppts(btn, filter) {
  document.querySelectorAll('#panel-citas .filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  loadAllAppts(filter);
}

// ---------- Disponibilidad (horario_barbero) ----------
// Cada bloque de la cuadrícula es una hora. Al guardar, los bloques seguidos
// se unen en franjas: 9:00 + 10:00 + 11:00 -> de 09:00 a 12:00.
const aMinutos = (texto) => { const [h, m] = texto.split(':').map(Number); return h * 60 + (m || 0); };
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

async function loadAvailability() {
  let franjas = [];
  try { franjas = (await api(`/horarios/barbero/${ID_BARBERO}`)).datos; } catch (error) { mostrarError(error); }

  document.getElementById('availGrid').innerHTML = DAYS.map((day, indice) => {
    const delDia = franjas.filter((f) => f.diaSemana === indice + 1);
    const encendido = (slot) => delDia.some((f) => aMinutos(slot) >= aMinutos(f.horaInicio) && aMinutos(slot) + 60 <= aMinutos(f.horaFin));
    return `<div class="avail-day" data-dia="${indice + 1}">
      <span class="avail-day-name">${day}</span>
      <div class="avail-slots">
        ${SLOTS.map((s) => `<div class="avail-slot ${encendido(s) ? 'on' : ''}" data-slot="${s}" onclick="toggleSlot(this)">${s}</div>`).join('')}
      </div>
      <label class="toggle-day">
        <input type="checkbox" ${delDia.length ? 'checked' : ''} onchange="toggleDay('${day}',this.checked)">
        <div class="toggle-slider"></div>
      </label>
    </div>`;
  }).join('');
}

function toggleSlot(el) { el.classList.toggle('on'); }

function toggleDay(day, active) {
  showToast(active ? `${day} activado (recuerda guardar)` : `${day} desactivado (recuerda guardar)`, 'info');
}

async function saveAvailability() {
  const horarios = [];
  document.querySelectorAll('.avail-day').forEach((fila) => {
    if (!fila.querySelector('input[type=checkbox]').checked) return;
    const inicios = [...fila.querySelectorAll('.avail-slot.on')].map((s) => aMinutos(s.dataset.slot)).sort((a, b) => a - b);
    let inicioFranja = null;
    let finFranja = null;
    inicios.forEach((m) => {
      if (inicioFranja === null) { inicioFranja = m; finFranja = m + 60; return; }
      if (m === finFranja) { finFranja += 60; return; }
      horarios.push({ diaSemana: Number(fila.dataset.dia), horaInicio: aHora(inicioFranja), horaFin: aHora(finFranja) });
      inicioFranja = m; finFranja = m + 60;
    });
    if (inicioFranja !== null) horarios.push({ diaSemana: Number(fila.dataset.dia), horaInicio: aHora(inicioFranja), horaFin: aHora(finFranja) });
  });

  try {
    await api(`/horarios/barbero/${ID_BARBERO}`, { metodo: 'PUT', cuerpo: { horarios } });
    showToast('Horario guardado', 'success');
    loadAvailability();
  } catch (error) { mostrarError(error); }
}

// ---------- Calendario ----------
function renderCalendar() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById('calMonthLabel').textContent = calDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const conCitas = new Set(misCitas.filter((c) => c.estado !== 'cancelada').map((c) => c.fecha));
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // lunes = 0
  const today = hoyLocal();
  let html = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((h) => `<div class="cal-day-header">${h}</div>`).join('');
  for (let i = 0; i < startDow; i++) {
    html += `<div class="cal-day other-month">${new Date(year, month, -startDow + i + 1).getDate()}</div>`;
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const clases = [dateStr === today ? 'today' : '', conCitas.has(dateStr) ? 'has-events' : '', dateStr === selectedDay ? 'selected' : ''].join(' ');
    html += `<div class="cal-day ${clases}" onclick="selectCalDay('${dateStr}')">${d}</div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function pintarDia(dateStr) {
  document.getElementById('selectedDateLabel').textContent = new Date(dateStr + 'T12:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const delDia = misCitas.filter((c) => c.fecha === dateStr);
  document.getElementById('dayEvents').innerHTML = delDia.length ? delDia.map(apptItemHtml).join('') : '<div class="empty-state">Sin citas este día</div>';
}

function selectCalDay(dateStr) {
  selectedDay = dateStr;
  pintarDia(dateStr);
  renderCalendar();
}

function changeMonth(delta) {
  calDate.setMonth(calDate.getMonth() + delta);
  renderCalendar();
}

// ---------- Clientes atendidos ----------
function loadClients() {
  const clientes = {};
  misCitas.filter((c) => c.estado === 'completada').forEach((c) => {
    const k = c.idCliente;
    if (!clientes[k]) clientes[k] = { nombre: c.nombreCliente, visitas: 0, total: 0, ultima: '', ultimoServicio: '' };
    clientes[k].visitas++;
    clientes[k].total += c.precio;
    if (c.fecha > clientes[k].ultima) { clientes[k].ultima = c.fecha; clientes[k].ultimoServicio = c.nombreServicio; }
  });
  document.getElementById('clientsTable').innerHTML = Object.values(clientes).map((d) => `<tr>
      <td><span class="client-avatar-sm">${escaparHtml(iniciales(d.nombre))}</span>${escaparHtml(d.nombre)}</td>
      <td>${escaparHtml(d.ultima || '-')}</td>
      <td>${escaparHtml(d.ultimoServicio || '-')}</td>
      <td><strong>${d.visitas}</strong></td>
      <td>${formatoPesos(d.total)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Aún no hay clientes atendidos</td></tr>';
}

function showSection(id) {
  document.querySelectorAll('.section-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const titles = { dashboard: ['Mi Dashboard', `Bienvenido, ${sesion.usuario.nombre}`], citas: ['Mis citas', 'Gestiona tu agenda'], disponibilidad: ['Disponibilidad', 'Configura tus horarios'], calendario: ['Calendario', 'Vista mensual de citas'], clientes: ['Clientes', 'Tus clientes atendidos'] };
  const [t, s] = titles[id] || ['Dashboard', ''];
  document.getElementById('topbarTitle').textContent = t;
  document.getElementById('topbarSub').textContent = s;
  const navIdx = { dashboard: 0, citas: 1, disponibilidad: 2, calendario: 3, clientes: 4 };
  const navItems = document.querySelectorAll('.nav-item:not([onclick="logout()"])');
  if (navIdx[id] !== undefined) navItems[navIdx[id]]?.classList.add('active');
  if (id !== 'disponibilidad') refrescar();
}

function logout() { cerrarSesion(); }

init();
