// SGB — register.js
// Registro de nuevos clientes contra la API (POST /api/auth/registro).
// La cuenta queda guardada en la base de datos con rol Cliente y la contraseña
// cifrada; después se puede iniciar sesión con ella.

function checkPasswordStrength(pass) {
  const bar = document.getElementById('pwStrength');
  if (!pass) { bar.className = 'password-strength'; return; }
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
  bar.className = 'password-strength ' + (score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong');
}

function showFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId).closest('.field');
  field.classList.add('has-error');
  field.querySelector('.field-error').textContent = msg;
}
function clearFieldErrors() {
  document.querySelectorAll('.field.has-error').forEach(f => f.classList.remove('has-error'));
}

// Relación entre los campos de la API y los del formulario (para mostrar errores del servidor)
const CAMPOS_FORMULARIO = { nombre: 'regName', apellido: 'regName', correo: 'regEmail', telefono: 'regPhone', contrasena: 'regPassword' };

async function handleRegister() {
  clearFieldErrors();

  const name = document.getElementById('regName').value.trim().replace(/\s+/g, ' ');
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPassword').value;
  const pass2 = document.getElementById('regPassword2').value;
  const terms = document.getElementById('regTerms').checked;

  // El formulario pide "nombre completo"; la base de datos guarda nombre y apellido por separado
  const partes = name.split(' ');
  const nombre = partes.shift() || '';
  const apellido = partes.join(' ');

  let valid = true;
  if (!nombre || !apellido) { showFieldError('regName', 'Ingresa tu nombre y tu apellido.'); valid = false; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showFieldError('regEmail', 'Ingresa un correo válido.'); valid = false; }
  if (!phone) { showFieldError('regPhone', 'Ingresa tu teléfono.'); valid = false; }
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    showFieldError('regPassword', 'Mínimo 8 caracteres, con letras y números.'); valid = false;
  }
  if (pass !== pass2) { showFieldError('regPassword2', 'Las contraseñas no coinciden.'); valid = false; }

  if (!valid) { showToast('Revisa los campos marcados', 'error'); return; }
  if (!terms) { showToast('Debes aceptar los términos y condiciones', 'error'); return; }

  try {
    await api('/auth/registro', {
      metodo: 'POST',
      cuerpo: { nombre, apellido, correo: email, telefono: phone, contrasena: pass },
    });
    showToast('¡Cuenta creada exitosamente! Ya puedes iniciar sesión', 'success');
    setTimeout(() => { window.location.href = 'index.html?login=1'; }, 1300);
  } catch (error) {
    if (error.estado === 409) showFieldError('regEmail', 'Ya existe una cuenta con este correo.');
    error.errores.forEach((e) => { if (CAMPOS_FORMULARIO[e.campo]) showFieldError(CAMPOS_FORMULARIO[e.campo], e.mensaje + '.'); });
    mostrarError(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('regPassword')?.addEventListener('input', e => checkPasswordStrength(e.target.value));
});
