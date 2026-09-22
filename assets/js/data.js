/* ¿Quién Gana? — capa de datos y utilidades */
export const QG = (() => {
  const cache = new Map();

  async function loadJSON(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo cargar ${url}: HTTP ${res.status}`);
    const json = await res.json();
    cache.set(url, json);
    return json;
  }

  /** Raíz real del sitio. Se deriva del href del <link rel="stylesheet">
   *  (que lleva el prefijo relativo correcto desde cualquier profundidad),
   *  subiendo dos niveles: {raiz}/assets/css/main.css → {raiz}/.
   *  Funciona en raíz de dominio y bajo prefijos tipo GitHub Pages. */
  function siteRoot() {
    const css = document.querySelector('link[rel="stylesheet"]')?.getAttribute('href');
    if (css) return new URL('../../', new URL(css, location.href));
    return new URL('/', location.href);
  }

  /** Convierte una ruta de sitio ("/dinero/", "/", "/verificador/") a URL
   *  absoluta relativa al origen, sana para fetch/enlazar desde cualquier página. */
  function resolveUrl(u) {
    if (u === '/') u = '';
    return new URL(String(u).replace(/^\//, ''), siteRoot()).pathname;
  }

  /** Ruta relativa a /data/ desde cualquier profundidad de página. */
  function dataUrl(file) {
    return resolveUrl('data/' + file);
  }

  const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

  function fmt(n, dec = 0) {
    return (dec === 0 ? nf0 : dec === 1 ? nf1 : nf2).format(n);
  }

  /** Formatea millones de € → "23.041 M€" o euros completos → "23.041.000.000 €" */
  function fmtMillones(m) { return fmt(m, 0); }

  function fmtEurosCompletos(euros) {
    if (!isFinite(euros)) return '—';
    return fmt(Math.round(euros), 0);
  }

  async function checkMock() {
    try {
      const idx = await loadJSON(dataUrl('search-index.json'));
      const mocks = (idx.entries || []).filter((e) => e.mock);
      if (mocks.length > 0) {
        const banner = document.createElement('div');
        banner.className = 'mock-banner';
        banner.setAttribute('role', 'status');
        banner.innerHTML = `<strong>MOCK_DATA activo:</strong> ${mocks.length} conjunto(s) de datos de prueba en uso (${mocks.map(m => m.titulo).join(', ')}). Estas cifras no son oficiales.`;
        document.querySelector('main')?.prepend(banner);
      }
    } catch { /* silencioso */ }
  }

  return {
    loadJSON, dataUrl, resolveUrl, fmt, fmtEurosCompletos,
    checkMock,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
})();
