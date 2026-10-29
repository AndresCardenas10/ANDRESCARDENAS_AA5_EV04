// SGB — dashboard-admin.js
// Panel administrativo conectado a la API:
//   indicadores y gráficas con datos reales, gestión de citas, usuarios,
//   barberos, clientes, servicios, inventario (entradas/salidas), reportes
//   mensuales (RF02) y verificación de pagos y comprobantes (RF04).

const sesion = exigirSesion('Administrador');
let revenueChart;
let statusChart;
let todasLasCitas = [];
let filtroCitas = 'todas';

function rootUrl() { return '/index.html'; }
const mesActual = () => hoyLocal().slice(0, 7);

function init() {
  const nombre = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim();
  document.getElementById('sidebarAvatar').textContent = iniciales(nombre);
  document.getElementById('sidebarName').textContent = nombre;
  iniciarNotificaciones();
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });
  document.getElementById('searchInput').addEventListener('input', filtrarTablaVisible);

  loadDashboard();
  loadCitas();
  loadUsuarios();
  loadServicios();
  loadInventario();
  loadComprobantes();
}

/** Buscador de la barra superior: filtra las filas de las tablas de la sección visible. */
function filtrarTablaVisible() {
  const texto = document.getElementById('searchInput').value.trim().toLowerCase();
  document.querySelectorAll('.section-panel.active tbody tr').forEach((fila) => {
    fila.style.display = !texto || fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
  });
}

// ---------- Dashboard ----------
async function loadDashboard() {
  try {
    const anio = Number(hoyLocal().slice(0, 4));
    const [resumen, indicadores, ingresosMes, citas] = await Promise.all([
      api('/reportes/resumen-mensual'), api('/reportes/indicadores'), api(`/reportes/ingresos-por-mes?anio=${anio}`), api('/citas'),
    ]);
    const r = resumen.datos;
    todasLasCitas = citas.datos;

    document.getElementById('kpiIngresos').textContent = formatoMiles(r.ingresos);
    document.getElementById('kpiIngresosSub').textContent = `${r.pagosVerificados} pagos verificados · ${r.pagosPendientes} por verificar`;
    document.getElementById('kpiCitas').textContent = r.totalCitas;
    document.getElementById('kpiCitasSub').textContent = `${indicadores.datos.citasHoy} para hoy · ${indicadores.datos.citasPendientes} pendientes`;
    document.getElementById('kpiTicket').textContent = formatoMiles(r.pagosVerificados ? r.ingresos / r.pagosVerificados : 0);
    document.getElementById('kpiAlerts').textContent = indicadores.datos.productosStockBajo;
    document.getElementById('anioGrafica').textContent = anio;

    // Gráficas (si la librería Chart.js no cargara, el resto del panel sigue funcionando)
    const porEstado = { pendiente: 0, confirmada: 0, completada: 0, cancelada: 0 };
    todasLasCitas.forEach((c) => { porEstado[c.estado] += 1; });
    if (window.Chart) dibujarGraficas(ingresosMes.datos.ingresos, porEstado);

    const recientes = [...todasLasCitas].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, 5);
    document.getElementById('recentAppts').innerHTML = recientes.map((c) => `<tr>
      <td>${escaparHtml(c.nombreCliente)}</td><td>${escaparHtml(c.nombreBarbero)}</td><td>${escaparHtml(c.nombreServicio)}</td>
      <td>${escaparHtml(c.fecha)} ${escaparHtml(c.hora)}</td><td>${formatoPesos(c.precio)}</td><td>${badgeEstado(c.estado)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Sin citas</td></tr>';
  } catch (error) { mostrarError(error); }
}


function dibujarGraficas(ingresosPorMes, e) {
  // Ingresos verificados por mes
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(document.getElementById('revenueChart').getContext('2d'), {
    type: 'bar',
    data: { labels: meses, datasets: [{ label: 'Ingresos', data: ingresosPorMes, backgroundColor: 'rgba(26,86,219,.7)', borderRadius: 3, borderSkipped: false }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: (v) => '$' + (v / 1000).toFixed(0) + 'K', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } },
  });

  // Gráfica de estado de todas las citas
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(document.getElementById('statusChart').getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada'], datasets: [{ data: [e.pendiente, e.confirmada, e.completada, e.cancelada], backgroundColor: ['#f59e0b', '#22c55e', '#1a56db', '#ef4444'], borderWidth: 0 }] },
    options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } } },
  });
}

// ---------- Citas ----------
async function loadCitas(filter = filtroCitas) {
  filtroCitas = filter;
  try {
    const consulta = filter === 'todas' ? '' : `?estado=${filter}`;
    const { datos } = await api('/citas' + consulta);
    document.getElementById('allCitasTable').innerHTML = datos.map((c) => {
      const acciones = [];
      if (c.estado === 'pendiente') acciones.push(`<button class="action-btn" onclick="cambiarEstadoCita(${c.id},'confirmada')">Confirmar</button>`);
      if (c.estado === 'confirmada') acciones.push(`<button class="action-btn" onclick="cambiarEstadoCita(${c.id},'completada')">Completar</button>`);
      if (c.estado === 'pendiente' || c.estado === 'confirmada') acciones.push(`<button class="action-btn danger" onclick="cambiarEstadoCita(${c.id},'cancelada')">Cancelar</button>`);
      return `<tr>
        <td>#${c.id}</td><td>${escaparHtml(c.nombreCliente)}</td><td>${escaparHtml(c.nombreBarbero)}</td><td>${escaparHtml(c.nombreServicio)}</td>
        <td>${escaparHtml(c.fecha)}</td><td>${escaparHtml(c.hora)}</td><td>${formatoPesos(c.precio)}</td>
        <td style="text-transform:capitalize">${escaparHtml(c.metodoPago || '—')}</td><td>${badgeEstado(c.estado)}</td>
        <td><div class="action-btns">${acciones.join('')}</div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="10" class="empty-state">Sin citas</td></tr>';
  } catch (error) { mostrarError(error); }
}

async function cambiarEstadoCita(id, estado) {
  try {
    const { mensaje } = await api(`/citas/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });
    showToast(mensaje, estado === 'cancelada' ? 'error' : 'success');
  } catch (error) { mostrarError(error); }
  loadCitas();
  loadDashboard();
}

function filterAdminAppts(btn, filter) {
  document.querySelectorAll('#panel-citas .filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  loadCitas(filter);
}

// ---------- Usuarios, barberos y clientes ----------
async function loadUsuarios() {
  try {
    const [{ datos: usuarios }, { datos: citas }] = await Promise.all([api('/usuarios'), api('/citas')]);
    const filaAcciones = (u) => u.id === sesion.usuario.id ? '<span style="font-size:.75rem;color:var(--gray-text)">(tu cuenta)</span>'
      : `<button class="action-btn ${u.activo ? 'danger' : ''}" onclick="toggleUser(${u.id}, ${!u.activo})">${u.activo ? 'Desactivar' : 'Activar'}</button>`;

    document.getElementById('usuariosTable').innerHTML = usuarios.map((u) => `<tr>
      <td><strong>${escaparHtml(u.nombreCompleto)}</strong></td><td>${escaparHtml(u.correo)}</td><td>${badgeEstado(u.rol)}</td>
      <td>${badgeEstado(u.activo ? 'activo' : 'inactivo')}</td>
      <td><div class="action-btns">${filaAcciones(u)}</div></td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Sin usuarios</td></tr>';

    const barberos = usuarios.filter((u) => u.rol === 'Barbero');
    document.getElementById('barberosTable').innerHTML = barberos.map((u) => {
      const suyas = citas.filter((c) => c.idBarbero === u.id && c.estado !== 'cancelada').length;
      return `<tr>
        <td><strong>${escaparHtml(u.nombreCompleto)}</strong></td><td>${escaparHtml(u.correo)}</td>
        <td>—</td><td>${suyas}</td>
        <td>${badgeEstado(u.activo ? 'activo' : 'inactivo')}</td>
        <td><div class="action-btns">${filaAcciones(u)}</div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Sin barberos</td></tr>';

    const clientes = usuarios.filter((u) => u.rol === 'Cliente');
    document.getElementById('clientesTable').innerHTML = clientes.map((u) => `<tr>
      <td><strong>${escaparHtml(u.nombreCompleto)}</strong></td><td>${escaparHtml(u.correo)}</td>
      <td>${u.totalCitas}</td><td>${formatoPesos(u.totalGastado)}</td>
      <td>${badgeEstado(u.activo ? 'activo' : 'inactivo')}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Sin clientes</td></tr>';
  } catch (error) { mostrarError(error); }
}

async function toggleUser(id, activo) {
  try {
    const { mensaje } = await api(`/usuarios/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
    showToast(mensaje, 'success');
  } catch (error) { mostrarError(error); }
  loadUsuarios();
}

/** "Nombre y apellido" del formulario -> { nombre, apellido } */
function separarNombre(completo) {
  const partes = completo.trim().replace(/\s+/g, ' ').split(' ');
  const nombre = partes.shift() || '';
  return { nombre, apellido: partes.join(' ') };
}

async function crearCuenta({ completo, correo, contrasena, telefono, rol }, idModal) {
  const { nombre, apellido } = separarNombre(completo);
  if (!nombre || !apellido) { showToast('Escribe nombre y apellido', 'error'); return; }
  try {
    await api('/usuarios', { metodo: 'POST', cuerpo: { nombre, apellido, correo, contrasena, telefono: telefono || undefined, rol } });
    closeModal(idModal);
    document.querySelectorAll(`#${idModal} input`).forEach((i) => { i.value = ''; });
    showToast(`${rol} creado correctamente`, 'success');
    loadUsuarios();
  } catch (error) { mostrarError(error); }
}

function saveUser() {
  crearCuenta({
    completo: document.getElementById('uNombre').value,
    correo: document.getElementById('uEmail').value.trim(),
    contrasena: document.getElementById('uPass').value,
    rol: document.getElementById('uRol').value,
  }, 'modalUsuario');
}

function saveBarber() {
  crearCuenta({
    completo: document.getElementById('bNombre').value,
    correo: document.getElementById('bEmail').value.trim(),
    contrasena: document.getElementById('bPass').value,
    telefono: document.getElementById('bTel').value.trim(),
    rol: 'Barbero',
  }, 'modalBarbero');
}

// ---------- Servicios ----------
async function loadServicios() {
  try {
    const { datos } = await api('/servicios?todos=true');
    document.getElementById('serviciosTable').innerHTML = datos.map((s) => `<tr>
      <td><strong>${escaparHtml(s.nombre)}</strong></td><td>${escaparHtml(s.categoria || '—')}</td>
      <td>${formatoPesos(s.precio)}</td><td>${s.duracionMin} min</td>
      <td>${badgeEstado(s.activo ? 'activo' : 'inactivo')}</td>
      <td><div class="action-btns">
        <button class="action-btn ${s.activo ? 'danger' : ''}" onclick="toggleService(${s.id}, ${!s.activo})">${s.activo ? 'Desactivar' : 'Activar'}</button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Sin servicios</td></tr>';
  } catch (error) { mostrarError(error); }
}

async function saveService() {
  try {
    await api('/servicios', {
      metodo: 'POST',
      cuerpo: {
        nombre: document.getElementById('sNombre').value,
        categoria: document.getElementById('sCat').value,
        precio: Number(document.getElementById('sPrecio').value),
        duracionMin: Number(document.getElementById('sDur').value),
      },
    });
    closeModal('modalServicio');
    showToast('Servicio creado', 'success');
    loadServicios();
  } catch (error) { mostrarError(error); }
}

async function toggleService(id, activo) {
  try {
    const { mensaje } = await api(`/servicios/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } });
    showToast(mensaje, 'success');
  } catch (error) { mostrarError(error); }
  loadServicios();
}

// ---------- Inventario ----------
async function loadInventario() {
  try {
    const { datos: inv } = await api('/productos?activos=true');
    const bajos = inv.filter((p) => p.stockBajo);
    document.getElementById('invTotal').textContent = inv.length;
    document.getElementById('invLow').textContent = bajos.length;
    document.getElementById('invVal').textContent = formatoMiles(inv.reduce((s, p) => s + p.stock * p.precio, 0));
    document.getElementById('invAlertMsg').textContent = bajos.length
      ? `${bajos.length} producto(s) con stock bajo: ${bajos.map((p) => p.nombre).join(', ')}`
      : 'Sin alertas de inventario';

    document.getElementById('inventarioTable').innerHTML = inv.map((p) => {
      const pct = p.stockMinimo ? Math.min(100, Math.round((p.stock / (p.stockMinimo * 2)) * 100)) : 100;
      const cls = p.stockBajo ? 'low' : p.stock < p.stockMinimo * 1.5 ? 'mid' : '';
      return `<tr>
        <td><strong>${escaparHtml(p.nombre)}</strong></td><td>${escaparHtml(p.categoria || '—')}</td>
        <td><div class="stock-bar-wrap">
          <div class="stock-bar"><div class="stock-bar-fill ${cls}" style="width:${pct}%"></div></div>
          <span class="stock-num ${p.stockBajo ? 'badge-red' : ''}">${p.stock} ${escaparHtml(p.unidad)}</span>
        </div></td>
        <td>${p.stockMinimo}</td>
        <td>${formatoPesos(p.precio)}</td>
        <td>${p.stockBajo ? '<span class="badge badge-red">Stock bajo</span>' : '<span class="badge badge-green">OK</span>'}</td>
        <td><div class="action-btns">
          <button class="action-btn" title="Entrada de 10" onclick="adjustStock(${p.id},10)">+10</button>
          <button class="action-btn danger" title="Salida de 1" onclick="adjustStock(${p.id},-1)">-1</button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Sin productos</td></tr>';
  } catch (error) { mostrarError(error); }
}

async function saveInventory() {
  try {
    await api('/productos', {
      metodo: 'POST',
      cuerpo: {
        nombre: document.getElementById('iNombre').value,
        categoria: document.getElementById('iCat').value,
        stock: Number(document.getElementById('iStock').value || 0),
        stockMinimo: Number(document.getElementById('iMin').value || 5),
        precio: Number(document.getElementById('iPrecio').value || 0),
        unidad: document.getElementById('iUnidad').value || undefined,
      },
    });
    closeModal('modalInventario');
    showToast('Producto agregado', 'success');
    loadInventario();
  } catch (error) { mostrarError(error); }
}

/** +10 = entrada de inventario, -1 = salida. Cada ajuste queda en el historial (RF11). */
async function adjustStock(id, delta) {
  try {
    const { mensaje } = await api(`/productos/${id}/movimientos`, {
      metodo: 'POST',
      cuerpo: { tipo: delta > 0 ? 'entrada' : 'salida', cantidad: Math.abs(delta), motivo: 'Ajuste rápido desde el panel' },
    });
    showToast(mensaje, delta > 0 ? 'success' : 'warn');
  } catch (error) { mostrarError(error); }
  loadInventario();
}

// ---------- Reportes (RF02) ----------
async function loadReportes() {
  try {
    const anio = Number(hoyLocal().slice(0, 4));
    const [{ datos: r }, { datos: anual }, { datos: completadas }] = await Promise.all([
      api('/reportes/resumen-mensual'), api(`/reportes/ingresos-por-mes?anio=${anio}`), api('/citas?estado=completada'),
    ]);
    document.getElementById('rIngresos').textContent = formatoMiles(anual.total);
    document.getElementById('rMes').textContent = formatoMiles(r.ingresos);
    document.getElementById('rPendiente').textContent = formatoMiles(r.egresos);
    document.getElementById('rTicket').textContent = (r.balance < 0 ? '-' : '') + formatoMiles(Math.abs(r.balance));
    document.getElementById('periodoReporte').textContent = `Periodo ${r.periodo}`;

    const porServicio = {};
    completadas.filter((c) => c.fecha.startsWith(r.periodo)).forEach((c) => {
      porServicio[c.nombreServicio] = porServicio[c.nombreServicio] || { cantidad: 0, total: 0 };
      porServicio[c.nombreServicio].cantidad++;
      porServicio[c.nombreServicio].total += c.precio;
    });
    document.getElementById('reportTable').innerHTML = Object.entries(porServicio).map(([nombre, d]) =>
      `<tr><td>${escaparHtml(nombre)}</td><td>${d.cantidad}</td><td>${formatoPesos(d.total)}</td><td>${formatoPesos(Math.round(d.total / d.cantidad))}</td></tr>`,
    ).join('') || '<tr><td colspan="4" class="empty-state">Sin citas completadas este mes</td></tr>';
  } catch (error) { mostrarError(error); }
}

// ---------- Pagos y comprobantes (RF04) ----------
async function loadComprobantes() {
  try {
    const { datos } = await api('/pagos');
    document.getElementById('comprobantesTable').innerHTML = datos.map((p) => `<tr>
      <td>#${p.idCita}</td><td>${escaparHtml(p.nombreCliente)}</td><td>${escaparHtml(p.nombreServicio)}</td>
      <td>${formatoPesos(p.monto)}</td><td style="text-transform:capitalize">${escaparHtml(p.metodoPago)}</td>
      <td>${escaparHtml(String(p.registradoEn).slice(0, 10))}</td>
      <td>${p.tieneComprobante
        ? `<button class="action-btn" onclick="verComprobante(${p.id})">Ver imagen</button>`
        : '<span style="font-size:.75rem;color:var(--gray-text);font-style:italic">No aplica</span>'}</td>
      <td>${badgeEstado(p.estadoPago)}</td>
      <td><div class="action-btns">${p.estadoPago === 'pendiente'
        ? `<button class="action-btn" onclick="cambiarEstadoPago(${p.id},'verificado')">Verificar</button>
           <button class="action-btn danger" onclick="cambiarEstadoPago(${p.id},'rechazado')">Rechazar</button>`
        : ''}</div></td>
    </tr>`).join('') || '<tr><td colspan="9" class="empty-state">Sin pagos registrados</td></tr>';
  } catch (error) { mostrarError(error); }
}

/** El comprobante está protegido: se descarga con el token y se abre en una pestaña nueva. */
async function verComprobante(idPago) {
  try {
    const respuesta = await fetch(`${API_BASE}/pagos/${idPago}/comprobante`, { headers: { Authorization: `Bearer ${obtenerSesion().token}` } });
    if (!respuesta.ok) throw new Error('No se pudo abrir el comprobante');
    const url = URL.createObjectURL(await respuesta.blob());
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { showToast(error.message, 'error'); }
}

async function cambiarEstadoPago(idPago, estadoPago) {
  try {
    const { mensaje } = await api(`/pagos/${idPago}/estado`, { metodo: 'PATCH', cuerpo: { estadoPago } });
    showToast(mensaje, estadoPago === 'verificado' ? 'success' : 'error');
  } catch (error) { mostrarError(error); }
  loadComprobantes();
  loadDashboard();
}

// ---------- Navegación ----------
function showSection(id) {
  document.querySelectorAll('.section-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const titles = {
    dashboard: ['Dashboard Administrativo', 'Visión general del negocio'],
    citas: ['Citas', 'Todas las citas del sistema'],
    usuarios: ['Usuarios', 'Gestión de cuentas'],
    barberos: ['Barberos', 'Equipo de trabajo'],
    clientes: ['Clientes', 'Base de clientes'],
    servicios: ['Servicios', 'Catálogo de servicios'],
    inventario: ['Inventario', 'Control de productos'],
    reportes: ['Reportes', 'Resumen mensual de ingresos y egresos'],
    comprobantes: ['Comprobantes', 'Verificación de pagos'],
  };
  const [t, s] = titles[id] || ['Admin', ''];
  document.getElementById('topbarTitle').textContent = t;
  document.getElementById('topbarSub').textContent = s;
  document.getElementById('searchInput').value = '';
  const navItems = document.querySelectorAll('.nav-item:not([onclick="logout()"])');
  const navIdx = { dashboard: 0, citas: 1, usuarios: 2, barberos: 3, clientes: 4, servicios: 5, inventario: 6, reportes: 7, comprobantes: 8 };
  if (navIdx[id] !== undefined) navItems[navIdx[id]]?.classList.add('active');

  const recargar = { dashboard: loadDashboard, citas: loadCitas, usuarios: loadUsuarios, barberos: loadUsuarios, clientes: loadUsuarios, servicios: loadServicios, inventario: loadInventario, reportes: loadReportes, comprobantes: loadComprobantes };
  recargar[id]?.();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function logout() { cerrarSesion(); }

init();
