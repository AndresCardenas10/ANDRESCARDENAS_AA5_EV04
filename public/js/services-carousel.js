// SGB — services-carousel.js
// Carrusel de servicios: una tarjeta grande a la vez (imagen + detalle),
// avance automático cada cierto tiempo, control manual con flechas/puntos,
// y pausa al pasar el cursor o tocar la pantalla — se reanuda solo.

let svcCurrent = 0;
let svcTotal = 0;
let svcTimer = null;
let svcResumeTimer = null;
const SVC_INTERVAL = 4500;
const SVC_RESUME_DELAY = 3000;

function renderService() {
  const track = document.getElementById('servicesTrack');
  const dots = document.querySelectorAll('.services-dot');
  track.style.transform = `translateX(-${svcCurrent * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === svcCurrent));
}

function stopServiceAutoplay() {
  clearInterval(svcTimer);
  svcTimer = null;
}
function startServiceAutoplay() {
  stopServiceAutoplay();
  svcTimer = setInterval(nextService, SVC_INTERVAL);
}

function goToService(i) {
  svcCurrent = (i + svcTotal) % svcTotal;
  renderService();
  startServiceAutoplay(); // cualquier navegación reinicia el conteo automático
}
function nextService() { goToService(svcCurrent + 1); }
function prevService() { goToService(svcCurrent - 1); }

document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('servicesTrack');
  const stage = document.getElementById('servicesStage');
  if (!track || !stage) return;
  svcTotal = track.children.length;

  stage.addEventListener('mouseenter', stopServiceAutoplay);
  stage.addEventListener('mouseleave', startServiceAutoplay);
  stage.addEventListener('touchstart', () => {
    stopServiceAutoplay();
    clearTimeout(svcResumeTimer);
    svcResumeTimer = setTimeout(startServiceAutoplay, SVC_RESUME_DELAY);
  }, { passive: true });

  renderService();
  startServiceAutoplay();
});
