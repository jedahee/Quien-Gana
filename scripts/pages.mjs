import { SITE_URL } from './env.mjs';

export { SITE_URL };

/* ¿Quién Gana? — Registro único de páginas del sitio.
   Única fuente de verdad para:
   - data/search-index.json  (scripts/build-search-index.mjs)
   - sitemap.xml             (scripts/build-sitemap.mjs)
   Si se añade una página, se añade AQUÍ y se regenera con:
   node scripts/build-search-index.mjs && node scripts/build-sitemap.mjs */

export const PAGES = [
  {
    url: '/', titulo: '¿Quién Gana? — ¿Y quién acaba pagando?', tipo: 'página',
    texto: 'inicio portada datos públicos España dinero poder',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 1.0,
  },
  {
    url: '/dinero/', titulo: 'Dinero — ¿Dónde va nuestro dinero?', tipo: 'sección',
    texto: 'presupuestos defensa empresas deuda hacienda contratos subvenciones',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/dinero/gasto-militar/', titulo: 'Gasto militar de España', tipo: 'indicador',
    texto: 'defensa ejército rearme presupuesto sección otan pib armamento',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/dinero/presupuesto/', titulo: 'Presupuesto: ¿en qué se gasta?', tipo: 'indicador',
    texto: 'pge pensiones deuda intereses sanidad educación transferencias comunidades',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.8,
  },
  {
    url: '/dinero/contratos-publicos/', titulo: 'Contratación pública', tipo: 'indicador',
    texto: 'placsp licitaciones adjudicaciones empresas proveedores estado',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.8,
  },
  {
    url: '/dinero/grandes-deudores/', titulo: 'Grandes deudores con Hacienda', tipo: 'indicador',
    texto: 'atc agencia tributaria morosidad listado deudas',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.7,
  },
  {
    url: '/vida/', titulo: 'Vida — ¿Por qué cuesta más vivir?', tipo: 'sección',
    texto: 'vivienda alquiler salarios empleo coste vida inflación desigualdad',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/vida/vivienda/', titulo: 'Vivienda: precios y alquiler', tipo: 'indicador',
    texto: 'alquiler compra precio metro cuadrado hipoteca vivienda pública turístico',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/vida/salarios/', titulo: 'Salarios y empleo', tipo: 'indicador',
    texto: 'salario medio mediano smi paro epa precariedad temporalidad brecha',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.8,
  },
  {
    url: '/vida/coste-vida/', titulo: 'Coste de vida e inflación', tipo: 'indicador',
    texto: 'ipc alimentos energía luz cesta compra precios',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.8,
  },
  {
    url: '/guerra/', titulo: 'Guerra — ¿Cuánto nos cuesta el rearme?', tipo: 'sección',
    texto: 'militar españa estados unidos israel ucrania armas exportaciones bases',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/guerra/espana/', titulo: 'España: gasto militar y rearme', tipo: 'indicador',
    texto: 'defensa rearme otan dos por ciento pib presupuestos',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.8,
  },
  {
    url: '/guerra/estados-unidos/', titulo: 'EE.UU. — relación militar con España', tipo: 'análisis',
    texto: 'bases rota morón acuerdo defensa cooperación compras material',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.7,
  },
  {
    url: '/guerra/israel/', titulo: 'Israel — relaciones económicas y militares', tipo: 'indicador',
    texto: 'exportaciones importaciones licencias jimddu embargo contratos armamento',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.8,
  },
  {
    url: '/guerra/ucrania/', titulo: 'Ucrania — ayuda española', tipo: 'indicador',
    texto: 'paquetes ayuda militar bilateral europeo fondo paz',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.7,
  },
  {
    url: '/democracia/', titulo: 'Democracia — ¿Qué está pasando?', tipo: 'sección',
    texto: 'discurso datos derechos inmigración percepción verificador participación',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/democracia/extrema-derecha/', titulo: 'Inmigración: percepción frente a realidad', tipo: 'análisis',
    texto: 'inmigración percepción criminalidad empleo extranjeros datos brecha discurso',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.8,
  },
  {
    url: '/verificador/', titulo: 'Verificador de afirmaciones', tipo: 'herramienta',
    texto: 'comprobar afirmación bulo inmigrantes ayudas trabajo criminalidad gasto otan pensiones',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.9,
  },
  {
    url: '/empresa/', titulo: 'Empresas — estado del proyecto', tipo: 'página',
    texto: 'indra contratos subvenciones deuda empresa perfil',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.4,
  },
  {
    url: '/analisis/', titulo: 'Análisis', tipo: 'sección',
    texto: 'artículos explicaciones datos contexto quién se beneficia',
    lastmod: '2026-09-02', changefreq: 'weekly', priority: 0.8,
  },
  {
    url: '/analisis/quien-se-beneficia-del-aumento-del-gasto-militar/', titulo: '¿Quién se beneficia del aumento del gasto militar?', tipo: 'artículo',
    texto: 'contratos industria defensa aesmide indra santa bárbara programas especiales armamento',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.8,
  },
  {
    url: '/metodologia/', titulo: 'Metodología y transparencia', tipo: 'página',
    texto: 'cálculo contadores equivalencias revisiones estimado oficial limitaciones',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.5,
  },
  {
    url: '/fuentes/', titulo: 'Fuentes de datos', tipo: 'página',
    texto: 'ine eurostat igae hacienda placsp boe cis comercio defensa licencias',
    lastmod: '2026-09-02', changefreq: 'monthly', priority: 0.5,
  },
];