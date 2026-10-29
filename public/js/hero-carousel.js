// SGB — hero-carousel.js — carrusel de imágenes del hero (auto-avance + dots)
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;

  let current = 0;
  const INTERVAL = 5000;
  let timer = null;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  function next() { goTo(current + 1); }

  function start() { timer = setInterval(next, INTERVAL); }
  function stop() { clearInterval(timer); }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); stop(); start(); });
  });

  start();
});
