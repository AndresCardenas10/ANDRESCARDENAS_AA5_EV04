// SGB — dashboard-client.js
// Panel del cliente conectado a la API:
//   servicios y barberos reales, horas libres según el horario del barbero,
//   reserva de citas, pago en efectivo o transferencia con comprobante,
//   cancelación, historial de pagos y edición del perfil.

const sesion = exigirSesion('Cliente');
let cancelTargetId = null;
let misCitas = [];

function rootUrl() { return '/index.html'; }

async function init() {
  pintarUsuario(sesion.usuario);
  document.getElementById('bookDate').min = hoyLocal();
  document.getElementById('bookPayment').addEventListener('change', function () {
    document.getElementById('uploadSection').style.display = this.value === 'transferencia' ? 'block' : 'none';
  });
  iniciarNotificaciones();

  await Promise.all([cargarOpcionesReserva(), cargarPerfil()]);
  await loadDashboard();
  loadPagos();
}

function pintarUsuario(u) {
  const nombre = `${u.nombre} ${u.apellido}`.trim();
  document.getElementById('sidebarAvatar').textContent = iniciales(nombre);
  document.getElementById('sidebarName').textContent = nombre;
  document.getElementById('profileAvatar').textContent = iniciales(nombre);
  document.getElementById('profileName').textContent = nombre;
  document.getElementById('topbarSub').textContent = `Bienvenido de nuevo, ${u.nombre}`;
}

// ---------- Datos ----------
async function cargarCitas() {
  const { datos } = await api('/citas');
  misCitas = datos;
  return datos;
}

async function cargarOpcionesReserva() {
  try {
    const [servicios, barberos] = await Promise.all([api('/servicios'), api('/usuarios/barberos')]);
    document.getElementById('bookService').innerHTML = '<option value="">Seleccionar servicio</option>'
      + servicios.datos.map((s) => `<option value="${s.id}" data-precio="${s.precio}">${escaparHtml(s.nombre)} — ${formatoPesos(s.precio)} (${s.duracionMin} min)</option>`).join('');
    document.getElementById('bookBarber').innerHTML = '<option value="">Seleccionar barbero</option>'
      + barberos.datos.map((b) => `<option value="${b.id}">${escaparHtml(b.nombreCompleto)}</option>`).join('');
  } catch (error) { mostrarError(error); }
}

// ---------- Dashboard ----------
async function loadDashboard() {
  let citas;
  try { citas = await cargarCitas(); } catch (error) { mostrarError(error); return; }

  const proximas = citas.filter((c) => c.estado === 'confirmada' || c.estado === 'pendiente');
  const completadas = citas.filter((c) => c.estado === 'completada');
  const gastado = completadas.reduce((s, c) => s + c.precio, 0);
  document.getElementById('statProximas').textContent = proximas.length;
  document.getElementById('statCompletadas').textContent = completadas.length;
  document.getElementById('statGastado').textContent = formatoMiles(gastado);
  document.getElementById('pVisitas').textContent = completadas.length;
  document.getElementById('pGastado').textContent = formatoPesos(gastado);

  const siguiente = [...proximas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))[0];
  if (siguiente) {
    document.getElementById('nextApptService').textContent = siguiente.nombreServicio;
    document.getElementById('nextApptDetails').textContent = `Con ${siguiente.nombreBarbero} · ${siguiente.metodoPago || 'sin pago registrado'}`;
    const d = new Date(siguiente.fecha + 'T12:00:00');
    document.getElementById('nextApptDate').textContent = d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }).toUpperCase();
    document.getElementById('nextApptTime').textContent = siguiente.hora;
    document.getElementById('nextApptBadge').innerHTML = badgeEstado(siguiente.estado);
  } else {
    document.getElementById('nextApptService').textContent = 'Sin citas próximas';
    document.getElementById('nextApptDetails').textContent = 'Reserva tu próxima visita';
    document.getElementById('nextApptDate').textContent = '—';
    document.getElementById('nextApptTime').textContent = '';
    document.getElementById('nextApptBadge').innerHTML = '';
  }

  document.getElementById('recentTable').innerHTML = citas.slice(0, 4).map((c) => `
    <tr>
      <td>${escaparHtml(c.nombreServicio)}</td>
      <td>${escaparHtml(c.nombreBarbero)}</td>
      <td>${escaparHtml(c.fecha)}</td>
      <td>${badgeEstado(c.estado)}</td>
      <td style="text-transform:capitalize">${escaparHtml(c.metodoPago || '—')}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Aún no tienes citas</td></tr>';
}

// ---------- Mis citas ----------
let filtroCitas = 'todas';
async function loadCitas(filter = filtroCitas) {
  filtroCitas = filter;
  try { await cargarCitas(); } catch (error) { mostrarError(error); return; }
  const lista = filter === 'todas' ? misCitas : misCitas.filter((c) => c.estado === filter);
  document.getElementById('citasTable').innerHTML = lista.map((c) => `
    <tr>
      <td><strong>${escaparHtml(c.nombreServicio)}</strong></td>
      <td>${escaparHtml(c.nombreBarbero)}</td>
      <td>${escaparHtml(c.fecha)}</td>
      <td>${escaparHtml(c.hora)}</td>
      <td style="text-transform:capitalize">${escaparHtml(c.metodoPago || '—')} ${c.estadoPago ? badgeEstado(c.estadoPago) : ''}</td>
      <td>${badgeEstado(c.estado)}</td>
      <td>
        <div class="action-btns">
          ${c.estado === 'pendiente' || c.estado === 'confirmada' ? `<button class="action-btn danger" onclick="openCancel(${c.id})">Cancelar</button>` : ''}
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="empty-state">No hay citas</td></tr>';
}

function filterAppts(btn, filter) {
  document.querySelectorAll('.table-filters .filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  loadCitas(filter);
}

// ---------- Pagos ----------
async function loadPagos() {
  try {
    const { datos } = await api('/pagos');
    document.getElementById('pagosTable').innerHTML = datos.map((p) => `<tr>
      <td>${escaparHtml(p.nombreServicio)} (#${p.idCita})</td>
      <td>${formatoPesos(p.monto)}</td>
      <td style="text-transform:capitalize">${escaparHtml(p.metodoPago)}</td>
      <td>${escaparHtml(String(p.registradoEn).slice(0, 10))}</td>
      <td>${badgeEstado(p.estadoPago)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Sin pagos registrados</td></tr>';
  } catch (error) { mostrarError(error); }
}

// ---------- Navegación ----------
function showSection(id) {
  document.querySelectorAll('.section-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const titles = { dashboard: ['Mi Dashboard', 'Resumen de tu actividad'], reservar: ['Reservar cita', 'Agenda tu próxima visita'], citas: ['Mis citas', 'Gestiona tu historial'], pagos: ['Pagos', 'Historial de transacciones'], perfil: ['Mi perfil', 'Información personal'] };
  const [t, s] = titles[id] || ['Dashboard', ''];
  document.getElementById('topbarTitle').textContent = t;
  document.getElementById('topbarSub').textContent = s;
  if (id === 'citas') loadCitas();
  if (id === 'pagos') loadPagos();
  if (id === 'dashboard') loadDashboard();
  const navIdx = { dashboard: 0, reservar: 1, citas: 2, pagos: 3, perfil: 4 };
  const navItems = document.querySelectorAll('.nav-item:not([onclick="logout()"])');
  if (navIdx[id] !== undefined) navItems[navIdx[id]]?.classList.add('active');
}

// ---------- Reservar ----------
function selectTime(el) {
  document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
  el.classList.add('selected');
}

function updatePrice() {
  const opcion = document.getElementById('bookService').selectedOptions[0];
  document.getElementById('priceDisplay').textContent = formatoPesos(opcion?.dataset.precio || 0);
  cargarHorasDisponibles();
}

/** Pide a la API las horas libres del barbero ese día para la duración del servicio. */
async function cargarHorasDisponibles() {
  const idServicio = document.getElementById('bookService').value;
  const idBarbero = document.getElementById('bookBarber').value;
  const fecha = document.getElementById('bookDate').value;
  const contenedor = document.getElementById('timeSlots');
  if (!idServicio || !idBarbero || !fecha) {
    contenedor.innerHTML = '<span style="font-size:.85rem;color:var(--gray-text)">Elige servicio, barbero y fecha para ver las horas libres</span>';
    return;
  }
  contenedor.innerHTML = '<span style="font-size:.85rem;color:var(--gray-text)">Consultando disponibilidad...</span>';
  try {
    const { datos } = await api(`/citas/disponibilidad?idBarbero=${idBarbero}&fecha=${fecha}&idServicio=${idServicio}`);
    contenedor.innerHTML = datos.horas.length
      ? datos.horas.map((h) => `<div class="time-slot" onclick="selectTime(this)">${h}</div>`).join('')
      : `<span style="font-size:.85rem;color:var(--gray-text)">${datos.atiende ? 'No quedan horas libres ese día' : 'El barbero no atiende ese día'}</span>`;
  } catch (error) {
    contenedor.innerHTML = '';
    mostrarError(error);
  }
}

function previewFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('La imagen supera 5 MB', 'error'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('uploadPreview');
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    document.getElementById('fileInput').files = e.dataTransfer.files;
    previewFile(document.getElementById('fileInput'));
  }
}

let reservando = false;
async function submitBooking() {
  const idServicio = Number(document.getElementById('bookService').value);
  const idBarbero = Number(document.getElementById('bookBarber').value);
  const fecha = document.getElementById('bookDate').value;
  const hora = document.querySelector('.time-slot.selected')?.textContent;
  const metodoPago = document.getElementById('bookPayment').value;
  const notas = document.getElementById('bookNotas').value.trim();
  const archivo = document.getElementById('fileInput').files[0];

  if (!idServicio || !idBarbero || !fecha || !hora) { showToast('Completa todos los campos y elige una hora', 'error'); return; }
  if (metodoPago === 'transferencia' && !archivo) { showToast('Adjunta el comprobante de la transferencia', 'error'); return; }
  if (reservando) return;
  reservando = true;

  try {
    // 1. Agendar la cita
    const { datos: cita } = await api('/citas', {
      metodo: 'POST',
      cuerpo: { idServicio, idBarbero, fechaHora: `${fecha}T${hora}`, notas: notas || undefined },
    });

    // 2. Registrar el pago (efectivo: pago presencial; transferencia: con comprobante)
    try {
      if (metodoPago === 'transferencia') {
        const formulario = new FormData();
        formulario.append('idCita', cita.id);
        formulario.append('metodoPago', 'transferencia');
        formulario.append('comprobante', archivo);
        await api('/pagos', { metodo: 'POST', formulario });
      } else {
        await api('/pagos', { metodo: 'POST', cuerpo: { idCita: cita.id, metodoPago: 'efectivo' } });
      }
      showToast('¡Cita reservada! Queda pendiente de confirmación del barbero', 'success');
    } catch (errorPago) {
      showToast(`La cita se reservó, pero el pago no se registró: ${errorPago.message}`, 'error');
    }

    resetForm();
    setTimeout(() => showSection('citas'), 1200);
  } catch (error) {
    mostrarError(error);
    if (error.estado === 409) cargarHorasDisponibles(); // la hora pudo ocuparse: refrescar
  } finally {
    reservando = false;
  }
}

function resetForm() {
  document.getElementById('bookService').value = '';
  document.getElementById('bookBarber').value = '';
  document.getElementById('bookDate').value = '';
  document.getElementById('bookPayment').value = 'efectivo';
  document.getElementById('bookNotas').value = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('priceDisplay').textContent = '$0';
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('uploadPreview').style.display = 'none';
  cargarHorasDisponibles();
}

// ---------- Cancelar ----------
function openCancel(id) {
  cancelTargetId = id;
  document.getElementById('cancelModal').classList.add('open');
}

async function confirmCancel() {
  try {
    await api(`/citas/${cancelTargetId}/estado`, { metodo: 'PATCH', cuerpo: { estado: 'cancelada' } });
    showToast('Cita cancelada', 'error');
  } catch (error) {
    mostrarError(error);
  }
  document.getElementById('cancelModal').classList.remove('open');
  loadCitas();
}

// ---------- Perfil ----------
async function cargarPerfil() {
  try {
    const { datos } = await api('/auth/perfil');
    actualizarUsuarioSesion(datos);
    pintarUsuario(datos);
    document.getElementById('pNombre').value = datos.nombre;
    document.getElementById('pApellido').value = datos.apellido;
    document.getElementById('pTelefono').value = datos.telefono || '';
    document.getElementById('pCorreo').value = datos.correo;
    document.getElementById('pMiembro').textContent = String(datos.creadoEn).slice(0, 4);
  } catch (error) { mostrarError(error); }
}

async function saveProfile() {
  try {
    const { datos } = await api('/auth/perfil', {
      metodo: 'PUT',
      cuerpo: {
        nombre: document.getElementById('pNombre').value,
        apellido: document.getElementById('pApellido').value,
        telefono: document.getElementById('pTelefono').value || undefined,
      },
    });
    actualizarUsuarioSesion(datos);
    pintarUsuario(datos);
    showToast('Perfil actualizado correctamente', 'success');
  } catch (error) { mostrarError(error); }
}

function logout() { cerrarSesion(); }

document.getElementById('cancelModal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('open');
});

init();
