/* ¿Quién Gana? — buscador global (índice estático en data/search-index.json) */
import { QG } from './data.js';

export async function initSearch() {
  const overlay = document.getElementById('search-overlay');
  const panel = document.getElementById('search-panel');
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  const openBtns = document.querySelectorAll('[data-open-search]');
  let index = null;
  let lastFocus = null;

  try { index = await QG.loadJSON(QG.dataUrl('search-index.json')); }
  catch (e) { console.warn('Índice de búsqueda no disponible', e); }

  function open() {
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    input.value = '';
    render('');
    input.focus();
  }
  function close() {
    overlay.classList.remove('open');
    lastFocus?.focus?.();
  }

  openBtns.forEach(b => {
    b.addEventListener('click', open);
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault(); open();
    }
  });

  function score(entry, q) {
    const t = entry.keywords || entry.titulo.toLowerCase();
    if (!q) return entry.tipo === 'sección' ? 1 : .5;
    let s = 0;
    for (const word of q.split(/\s+/).filter(Boolean)) {
      if (t.includes(word)) s += 2;
      else if (entry.titulo.toLowerCase().includes(word)) s += 1.5;
      else return -1;
    }
    if (entry.titulo.toLowerCase().startsWith(q)) s += 2;
    return s;
  }

  function render(q) {
    if (!index) { list.innerHTML = '<li><span style="padding:.6rem;display:block;color:var(--muted)">Índice no disponible.</span></li>'; return; }
    const results = index.entries
      .map(e => ({ e, s: score(e, q.toLowerCase()) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 9);

    list.innerHTML = results.length === 0
      ? '<li><span style="padding:.6rem;display:block;color:var(--muted)">Sin resultados. Prueba con: vivienda, defensa, Israel, Hacienda…</span></li>'
      : results.map(({ e }) =>
          `<li><a href="${QG.resolveUrl(e.url)}"><span class="tipo">${esc(e.tipo)}${e.mock ? ' · MOCK' : ''}</span>${esc(e.titulo)}</a></li>`
        ).join('');
  }

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = list.querySelector('a');
      if (first) location.href = first.getAttribute('href');
    }
  });

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
}
