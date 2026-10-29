// SGB — forgot-password.js
// Recuperación de contraseña en 2 pasos con la API:
//   1) POST /api/auth/recuperar   -> el servidor genera un código de 6 dígitos (válido 15 min)
//   2) POST /api/auth/restablecer -> nueva contraseña usando ese código
// Como el proyecto no tiene servidor de correo, en modo desarrollo la API devuelve
// el código y aquí se muestra en pantalla (en producción llegaría por correo).

let pendingEmail = null;

function goToStep(n) {
  document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');
  document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i <= n - 1));
}

function marcarError(idCampo, mensaje) {
  const campo = document.getElementById(idCampo).closest('.field');
  campo.classList.add('has-error');
  campo.querySelector('.field-error').textContent = mensaje;
}

async function pedirCodigo(email) {
  const respuesta = await api('/auth/recuperar', { metodo: 'POST', cuerpo: { correo: email } });
  document.getElementById('tokenCode').textContent = respuesta.datos?.codigo || '------';
  return respuesta;
}

async function requestReset() {
  const emailField = document.getElementById('fpEmail');
  const email = emailField.value.trim().toLowerCase();
  emailField.closest('.field').classList.remove('has-error');

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    marcarError('fpEmail', 'Ingresa un correo válido.');
    return;
  }

  try {
    const respuesta = await pedirCodigo(email);
    pendingEmail = email;
    document.getElementById('fpEmailLabel').textContent = email;
    // Por seguridad la API responde igual exista o no el correo
    showToast(respuesta.datos?.codigo ? 'Código de verificación generado' : respuesta.mensaje, 'success');
    goToStep(2);
  } catch (error) {
    mostrarError(error);
  }
}

async function confirmReset() {
  const code = document.getElementById('fpCode').value.trim();
  const pass = document.getElementById('fpPassword').value;
  const pass2 = document.getElementById('fpPassword2').value;

  document.querySelectorAll('#step2 .field').forEach(f => f.classList.remove('has-error'));
  let valid = true;

  if (!/^\d{6}$/.test(code)) { marcarError('fpCode', 'El código tiene 6 dígitos.'); valid = false; }
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    marcarError('fpPassword', 'Mínimo 8 caracteres, con letras y números.'); valid = false;
  }
  if (pass !== pass2) { marcarError('fpPassword2', 'Las contraseñas no coinciden.'); valid = false; }
  if (!valid) { showToast('Revisa los campos marcados', 'error'); return; }

  try {
    await api('/auth/restablecer', { metodo: 'POST', cuerpo: { correo: pendingEmail, codigo: code, contrasenaNueva: pass } });
    showToast('Contraseña actualizada correctamente', 'success');
    goToStep(3);
    setTimeout(() => { window.location.href = 'index.html?login=1'; }, 1800);
  } catch (error) {
    if (error.estado === 400 && !error.errores.length) marcarError('fpCode', 'Código incorrecto o vencido.');
    mostrarError(error);
  }
}

async function resendCode() {
  if (!pendingEmail) return;
  try {
    await pedirCodigo(pendingEmail);
    showToast('Nuevo código generado', 'success');
  } catch (error) {
    mostrarError(error);
  }
}
