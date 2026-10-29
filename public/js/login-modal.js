// SGB — login-modal.js
// Inicio de sesión contra la API (POST /api/auth/login). Ya no hay usuarios
// escritos en el código: las cuentas viven en la base de datos "sgb" y la
// contraseña se valida en el servidor con bcrypt.

function openModal() {
  document.getElementById('loginModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('loginModal').classList.remove('open');
  document.body.style.overflow = '';
}

function fillDemo(email, pass) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pass;
}

let enviandoLogin = false;

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !pass) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }
  if (enviandoLogin) return;
  enviandoLogin = true;

  try {
    const { mensaje, datos } = await api('/auth/login', { metodo: 'POST', cuerpo: { correo: email, contrasena: pass } });
    guardarSesion(datos.token, datos.usuario);
    showToast(`${mensaje}. ¡Bienvenido, ${datos.usuario.nombre}!`, 'success');
    setTimeout(() => { window.location.href = PANEL_POR_ROL[datos.usuario.rol] || '/index.html'; }, 900);
  } catch (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
  } finally {
    enviandoLogin = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && modal?.classList.contains('open')) handleLogin();
  });

  // Abre el modal automáticamente si venimos de un registro exitoso o de "recuperar contraseña"
  if (new URLSearchParams(window.location.search).get('login') === '1') {
    openModal();
  }
});
