// SGB — api.js
// Cliente de la API REST del SGB, compartido por todas las páginas.
// - Guarda la sesión (token JWT + datos del usuario) en sessionStorage:
//   se borra al cerrar el navegador y no queda en el equipo.
// - Envía el token en cada petición y convierte los errores de la API en mensajes.
// - escaparHtml(): evita que datos escritos por usuarios se ejecuten como código
//   al pintarlos con innerHTML.

const API_BASE = '/api';
const CLAVE_SESION = 'sgbSesion';

// Página principal de cada rol (rutas desde la raíz del sitio)
const PANEL_POR_ROL = {
  Administrador: '/pages/admin/dashboard.html',
  Barbero: '/pages/barber/dashboard.html',
  Cliente: '/pages/client/dashboard.html',
};

// ---------- Sesión ----------
function obtenerSesion() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)) || null; } catch { return null; }
}

function guardarSesion(token, usuario) {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ token, usuario }));
}

function actualizarUsuarioSesion(usuario) {
  const sesion = obtenerSesion();
  if (sesion) guardarSesion(sesion.token, usuario);
}

function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
  window.location.href = '/index.html';
}

/** En los paneles: exige sesión y el rol correcto; si no, vuelve al inicio. */
function exigirSesion(rolRequerido) {
  const sesion = obtenerSesion();
  if (!sesion || !sesion.token) { window.location.href = '/index.html?login=1'; throw new Error('Sin sesión'); }
  if (rolRequerido && sesion.usuario.rol !== rolRequerido) {
    window.location.href = PANEL_POR_ROL[sesion.usuario.rol] || '/index.html';
    throw new Error('Rol incorrecto');
  }
  return sesion;
}

// ---------- Peticiones ----------
class ErrorDeApi extends Error {
  constructor(estado, mensaje, errores) {
    super(mensaje);
    this.estado = estado;
    this.errores = errores || [];
  }
}

/**
 * Llama a la API.
 *   api('/citas')                                   -> GET
 *   api('/citas', { metodo: 'POST', cuerpo: {...} }) -> JSON
 *   api('/pagos', { metodo: 'POST', formulario })   -> multipart (archivos)
 * Devuelve el JSON de la respuesta o lanza ErrorDeApi con el mensaje del servidor.
 */
async function api(ruta, { metodo = 'GET', cuerpo, formulario } = {}) {
  const encabezados = {};
  const sesion = obtenerSesion();
  if (sesion?.token) encabezados.Authorization = `Bearer ${sesion.token}`;

  let body;
  if (formulario) body = formulario;
  else if (cuerpo !== undefined) { encabezados['Content-Type'] = 'application/json'; body = JSON.stringify(cuerpo); }

  let respuesta;
  try {
    respuesta = await fetch(API_BASE + ruta, { method: metodo, headers: encabezados, body });
  } catch {
    throw new ErrorDeApi(0, 'No hay conexión con el servidor. ¿Está encendido (npm start)?');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Sesión vencida o usuario desactivado en un panel: volver a iniciar sesión
    if (respuesta.status === 401 && sesion?.token) {
      sessionStorage.removeItem(CLAVE_SESION);
      window.location.href = '/index.html?login=1';
    }
    throw new ErrorDeApi(respuesta.status, datos.mensaje || 'Ocurrió un error', datos.errores);
  }
  return datos;
}

/** Muestra el error de la API en un toast (con el detalle del primer campo, si lo hay). */
function mostrarError(error) {
  const detalle = error.errores?.length ? ` (${error.errores[0].campo}: ${error.errores[0].mensaje})` : '';
  showToast((error.message || 'Error') + detalle, 'error');
}

// ---------- Utilidades de presentación ----------
function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatoPesos(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-CO');
}

function formatoMiles(valor) {
  const n = Number(valor || 0);
  return n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + n;
}

function iniciales(nombre) {
  return String(nombre || 'U').split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

/** Fecha de hoy en hora local "AAAA-MM-DD". */
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function badgeEstado(estado) {
  const clases = {
    confirmada: 'badge-green', pendiente: 'badge-yellow', completada: 'badge-blue', cancelada: 'badge-red',
    verificado: 'badge-green', rechazado: 'badge-red', activo: 'badge-green', inactivo: 'badge-gray',
    Cliente: 'badge-blue', Barbero: 'badge-green', Administrador: 'badge-orange',
  };
  return `<span class="badge ${clases[estado] || 'badge-gray'}">${escaparHtml(estado || 'sin pago')}</span>`;
}

// ---------- Notificaciones (campana en la barra superior) ----------
function iniciarNotificaciones() {
  const contenedor = document.querySelector('.topbar-right');
  if (!contenedor) return;

  let boton = contenedor.querySelector('.notif-btn');
  if (!boton) {
    boton = document.createElement('button');
    boton.className = 'notif-btn';
    boton.innerHTML = '<i class="fas fa-bell"></i><div class="notif-dot"></div>';
    contenedor.prepend(boton);
  }
  boton.title = 'Notificaciones';
  const punto = boton.querySelector('.notif-dot');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <div class="modal-header">
        <h3>Notificaciones</h3>
        <button class="modal-close-btn" data-cerrar><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body-inner" style="padding-top:0;max-height:60vh;overflow:auto" id="listaNotificaciones"></div>
      <div style="padding:0 2.2rem 1.6rem"><button class="btn btn-ghost" data-todas>Marcar todas como leídas</button></div>
    </div>`;
  document.body.appendChild(modal);
  const cerrar = () => modal.classList.remove('open');
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-cerrar]')) cerrar(); });

  async function cargar() {
    try {
      const { datos } = await api('/notificaciones');
      punto.style.display = datos.noLeidas > 0 ? 'block' : 'none';
      document.getElementById('listaNotificaciones').innerHTML = datos.notificaciones.length
        ? datos.notificaciones.map((n) => `
            <div style="padding:.8rem 0;border-bottom:1px solid rgba(0,0,0,.06);${n.leida ? 'opacity:.6' : ''}">
              <div style="font-size:.75rem;color:var(--gray-text)">${escaparHtml(n.creadoEn)} · ${escaparHtml(n.tipo)}</div>
              <div style="font-size:.9rem">${n.leida ? '' : '<strong>•</strong> '}${escaparHtml(n.mensaje)}</div>
            </div>`).join('')
        : '<div class="empty-state">No tienes notificaciones</div>';
    } catch { /* si falla, la campana simplemente queda sin punto */ }
  }

  boton.addEventListener('click', async () => { await cargar(); modal.classList.add('open'); });
  modal.querySelector('[data-todas]').addEventListener('click', async () => {
    try { await api('/notificaciones/leidas', { metodo: 'PATCH' }); await cargar(); } catch (e) { mostrarError(e); }
  });

  cargar();
  setInterval(cargar, 60000); // revisa nuevas notificaciones cada minuto
}
