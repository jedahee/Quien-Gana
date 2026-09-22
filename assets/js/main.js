/* ¿Quién Gana? — comportamiento general: menú, tema, animaciones, buscador */
import { QG } from './data.js';
import { initSearch } from './search.js';
import { animateNumber } from './counters.js';

/* Menú móvil */
const menuBtn = document.getElementById('menu-btn');
const navLinks = document.getElementById('nav-links');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

/* Tema claro/oscuro */
const themeBtn = document.getElementById('theme-btn');
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('qg-theme', t); } catch {}
  themeBtn?.setAttribute('aria-pressed', String(t === 'dark'));
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('qg-theme'); } catch {}
  if (saved) setTheme(saved);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeBtn?.setAttribute('aria-pressed', 'true');
  }
})();
themeBtn?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(cur);
});

/* Animaciones de aparición */
if (!QG.reducedMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

/* Números animados genéricos: [data-animate-to="1234"] */
document.querySelectorAll('[data-animate-to]').forEach(el => {
  const v = parseFloat(el.dataset.animateTo);
  const dec = parseInt(el.dataset.decimals || '0', 10);
  if (!isNaN(v)) animateNumber(el, v, { decimals: dec });
});

/* Aviso MOCK_DATA si aplica */
QG.checkMock();

/* Buscador */
initSearch();

/* Service Worker (PWA / instalación / lectura offline).
   El sw.js vive en la raíz y su ámbito es "/"; la ruta relativa se resuelve
   desde cualquier profundidad de página. Se registra en `load` para no
   competir con el render de la página. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = QG.resolveUrl('sw.js');
    navigator.serviceWorker.register(swPath).catch((err) => {
      console.warn('Service worker no disponible:', err);
    });
  });
}
