// SGB — reveal.js — aparición progresiva de elementos al hacer scroll
// Vanilla JS, sin librerías. Respeta prefers-reduced-motion vía CSS.
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
});
