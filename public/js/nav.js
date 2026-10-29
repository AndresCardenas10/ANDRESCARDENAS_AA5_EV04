// SGB — nav.js — navbar con fondo al hacer scroll, se oculta al bajar y
// reaparece al subir (no se oculta si el menú móvil está abierto) + drawer móvil
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('mainNav');
  if (nav) {
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);

      const drawer = document.getElementById('mobileDrawer');
      const drawerOpen = drawer && drawer.classList.contains('open');

      if (!drawerOpen && y > lastY && y > 140) {
        nav.classList.add('nav-hidden');   // bajando -> ocultar
      } else if (y < lastY) {
        nav.classList.remove('nav-hidden'); // subiendo -> mostrar
      }
      lastY = y;
    });
  }
});

function toggleDrawer() {
  document.getElementById('mobileDrawer').classList.toggle('open');
  document.getElementById('mainNav')?.classList.remove('nav-hidden');
}
