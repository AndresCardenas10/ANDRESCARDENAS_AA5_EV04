// SGB — contact.js
// Formulario de contacto / sugerencia de la landing. Como el prototipo no
// tiene backend de correo, el mensaje se valida y se guarda en localStorage
// (barberMessages) para simular el envío, igual que el resto del sistema.

function showContactFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId).closest('.field');
  field.classList.add('has-error');
  const err = field.querySelector('.field-error');
  if (err) err.textContent = msg;
}
function clearContactFieldErrors() {
  document.querySelectorAll('#contacto .field.has-error').forEach(f => f.classList.remove('has-error'));
}

function submitContact() {
  clearContactFieldErrors();

  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const type = document.getElementById('contactType').value;
  const message = document.getElementById('contactMessage').value.trim();

  let valid = true;
  if (!name) { showContactFieldError('contactName', 'Ingresa tu nombre.'); valid = false; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showContactFieldError('contactEmail', 'Ingresa un correo válido.'); valid = false; }
  if (!message) { showContactFieldError('contactMessage', 'Escribe tu mensaje.'); valid = false; }

  if (!valid) { showToast('Revisa los campos marcados', 'error'); return; }

  const messages = JSON.parse(localStorage.getItem('barberMessages') || '[]');
  messages.push({ id: Date.now(), name, email, type, message, date: new Date().toISOString() });
  localStorage.setItem('barberMessages', JSON.stringify(messages));

  showToast('¡Mensaje enviado! Te responderemos pronto.', 'success');

  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactType').value = 'Contacto general';
  document.getElementById('contactMessage').value = '';
}
