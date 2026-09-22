# Arquitectura — ¿Quién Gana?

## Visión general

Sitio 100% estático vanilla (HTML/CSS/JS), cero dependencias de runtime,
cero build step. Los datos viven en JSON servidos tal cual; las páginas los
consumen con `fetch` relativo para funcionar desde cualquier subdirectrio
(preview local, staging, producción).

```
quien-gana/
├── index.html                  # portada
├── site.webmanifest            # PWA instalable (nombre, iconos, standalone, atajos)
├── sw.js                       # service worker (offline + instalación)
├── dinero/                     # sección DINERO
│   ├── index.html
│   ├── presupuesto/index.html
│   └── gasto-militar/index.html
├── vida/                       # sección VIDA (+vivienda, salarios, coste-vida)
├── guerra/                     # sección GUERRA (+espana, ucrania, israel, estados-unidos)
├── democracia/                 # sección DEMOCRACIA (+extrema-derecha)
├── verificador/ · analisis/ · metodologia/ · fuentes/ · empresa/
├── assets/
│   ├── css/main.css            # sistema de diseño (tokens, dark mode, AA, fallbacks)
│   └── js/
│       ├── data.js             # capa de datos (fetch cacheado, formateo es-ES, mock check)
│       ├── charts.js           # render SVG propio (barras/líneas) + tabla accesible
│       ├── counters.js         # contadores animados + €/s interpolados
│       ├── search.js           # buscador global sobre search-index.json
│       └── main.js             # menú, tema, reveals, wiring, registra sw.js
├── data/                       # JSONs (esquema común) + search-index.json generado
├── scripts/
│   ├── pages.mjs               # ★ registro único de URLs (sitemap + índice + PWA)
│   ├── build-search-index.mjs  # genera índice (páginas + indicadores)
│   ├── build-sitemap.mjs       # regenera sitemap.xml desde pages.mjs
│   ├── enhance-head.mjs        # metas SEO/PWA + rutas de iconos en los <head>
│   ├── fetch-ine.mjs           # INE Tempus3 → ipc-anual.json
│   ├── fetch-eurostat.mjs      # Eurostat → 5 datasets
│   └── update-all.mjs          # orquestador semanal
├── robots.txt · sitemap.xml · .gitignore
└── README.md · ARCHITECTURE.md · SEO.md · DATA_SOURCES.md · DATA_METHODOLOGY.md
```

## Decisiones clave

1. **Vanilla primero** (petición explícita): HTML semántico por directorio → URLs limpias
   sin server-side routing. Compatible con GitHub Pages/Netlify/nginx sin config.
2. **Rutas relativas calculadas**: `QG.dataUrl()` y el buscador resuelven la profundidad
   desde `location.pathname`, así el mismo código funciona en cualquier nivel (`/`,
   `/dinero/`, `/dinero/gasto-militar/`).
3. **Gráficos propios en SVG**: ~150 líneas, sin librerías. Cada gráfico incluye
   `<details><table>` accesible como alternativa textual y `<title>` por barra/punto.
4. **Contadores honestos**: animación con `IntersectionObserver` + easing; respeta
   `prefers-reduced-motion`. El contador €/s muestra SIEMPRE su nota de método.
5. **Dark mode**: tokens CSS + `data-theme` + persistencia localStorage +
   `prefers-color-scheme`. Contrastes verificados WCAG AA.
6. **MOCK_DATA**: flag en `.env` + campo `"mock"` por dataset → banner automático global.
7. **SEO**: canonical, OpenGraph, Twitter card, JSON-LD (WebSite, BreadcrumbList,
   ClaimReview, NewsArticle), sitemap.xml regenerable, robots.txt.
8. **PWA instalable**: `site.webmanifest` + `sw.js` (precache del shell, red-preferente
   para datos con `stale-while-revalidate`) + iconos 192/512 maskable. Registro en
   `main.js` con ruta relativa por profundidad.
9. **Pipeline reproducible**: `npm run update-data` regenera datos automáticos e índice;
   los manuales llevan `actualizado` y `referencias[]`.

## Flujo de datos

```
INE/Eurostat API ──(scripts/fetch-*.mjs, semanal)──▶ data/*.json ◀──(import manual citada)── PGE/IGAE/Congreso/portales
                                                            │
                                    scripts/build-search-index.mjs
                                                            ▼
                                                  data/search-index.json
                                                            │
        navegador: página HTML ──fetch──▶ data.js ──▶ charts.js / counters.js / search.js
```

## Accesibilidad

- Skip-link, landmarks, foco visible, `aria-current`, breadcrumbs.
- Gráficos con alternativa tabular; buscador como dialog modal con focus trap básico
  (Escape cierra, Enter abre primer resultado).
- Texto mínimo 17px base; targets táctiles ≥38px.

## Limitaciones conocidas

- Sin SSR ni prerender: los gráficos dependen de JS (el contenido crítico y las cifras
  principales están también en el HTML para SEO/no-JS).
- `presupuesto.gob.es` inaccesible desde este entorno → partidas manuales.
- PLACSP completo bloqueado: la sindicación exige certificado digital autorizado
  (HTTP 200 pero cuerpo = error de acceso, verificado 2026-08).
