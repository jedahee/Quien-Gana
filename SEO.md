# SEO · PWA · Compatibilidad — ¿Quién Gana?

Documento de análisis y guía de mantenimiento del frontal público del sitio
(SEO técnico, instalación tipo app, navegadores y móviles, tema y responsive).

---

## 1 · Objetivo del sitio

Web 100% estática, sin frameworks ni build, con datos públicos sobre España:
dónde está el dinero, quién tiene el poder y qué está pasando. Filosofía:
pocos temas → datos claros → contexto → **fuente original siempre visible**.

### Funcionalidades clave

| Área | Qué hace |
|---|---|
| Secciones | Dinero · Vida · Guerra · Democracia (23 páginas HTML por directorio) |
| Indicadores | Datos en `data/*.json` renderizados en SVG propio con tabla accesible |
| Contadores | €/s y equivalencias calculadas en vivo desde `poblacion.json` y `referencias-equivalencias.json` |
| Buscador global | Índice estático `data/search-index.json`, modal con atajos `/` y `Ctrl+K` |
| Verificador | Afirmaciones con veredictos (ClaimReview JSON-LD) y fuentes |
| Tema | Claro/oscuro con tokens CSS, persistencia y `prefers-color-scheme` |
| Transparencia | `/metodologia/`, `/fuentes/`, `/empresa/` — estado honesto incluido |

## 2 · Estado SEO (revisado 2026-09)

### Ya presente (correcto)
- `<html lang="es">`, `charset`, `viewport`.
- `title` y `description` únicos por página.
- `canonical` absoluto por página (`https://www.quiengana.es/…`).
- OpenGraph + Twitter card en todas las páginas (añadidas/ampliadas).
- JSON-LD: `WebSite`, `BreadcrumbList`, `ClaimReview`, `NewsArticle`.
- `robots.txt` con Sitemap y `sitemap.xml` con 23 URLs.
- Gobernanza de marcado: cargo abstracto, skip-link, landmarks, `aria-*`.

### Mejoras aplicadas en esta revisión
- **`site.webmanifest`** (PWA instalable) enlazado en las 23 páginas.
- **`sw.js`** service worker: instalación + precache del shell + lectura
  offline con datos `stale-while-revalidate` (nunca números caducados como
  si fueran frescos: el HTML crítico ya va embebido).
- **Iconos 192/512 (any + maskable)** y 180 generados en `assets/img/`.
- **Twitter cards**: `twitter:title`, `twitter:description`, `twitter:image`.
- **OpenGraph**: `og:site_name`, `og:locale`, `og:type` en todas las páginas.
- **`theme-color` oscuro** vía `media="(prefers-color-scheme: dark)"`.
- Metas iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title`, `mobile-web-app-capable`.
- **Bug corregido**: los enlaces `favicon`/`apple-touch-icon` de las 22
  subpáginas apuntaban a `./assets/…` (404). Ahora usan la ruta relativa
  correcta según profundidad (`../` o `../../`).
- **`viewport-fit=cover`** para móviles con notch / safe-area.
- **Sitemap regenerable** desde `scripts/pages.mjs` (registro único, ver §6).

### Pendientes (recomendados)
- Prerender/no-JS: los gráficos dependen de JS; las cifras principales ya
  están en HTML (así se mantiene). Un prerender programado no es prioritario.
- `hreflang` no aplica (un solo idioma, `es`).
- Verificación en Search Console / Bing Webmaster; `favicon` SVG opcional.
- HTTPS y headers de caché en el hosting final (el SW exige `https://` o
  `localhost`).

## 3 · PWA = "APK simulado"

Para que el navegador ofrezca "instalar" (Chrome: A2HS; cuota pantalla
completa propia) se necesita: **manifest + service worker + iconos 192/512 +
HTTPS**. Todo ello está en el repo:

```
site.webmanifest          # nombre, tema, display: standalone, atajos
sw.js                     # VERSION de caché; red 'navigate', assets 'cache-first', data 'SWR'
assets/img/icon-192.png   # any
assets/img/icon-512.png   # any + maskable (fondo rojo, logo centrado)
```

Regeneración de iconos (ImageMagick):
```bash
convert -size 512x512 xc:"#c1121f" \
  \( assets/img/logo-header-light.png -resize 360x -gravity center \) \
  -composite -gravity center -extent 512x512 -depth 8 assets/img/icon-512.png
for s in 192 180 64; do convert assets/img/icon-512.png -resize ${s}x${s} -depth 8 assets/img/icon-$s.png; done
```

Si se cambia el rediseño: incrementar `VERSION` en `sw.js` → `activate`
purga cachés antiguas automáticamente.

## 4 · Compatibilidad de navegadores y móviles

| Componente | Soporte mínimo | Nota |
|---|---|---|
| `color-mix()` | Chrome/Edge 111+, Firefox 113+, Safari 16.2+ | Existe bloque de fallbacks planos (§4.1) |
| `backdrop-filter` | Chrome 76+, Safari 9+ | Tail: `@supports not` deja el header opaco |
| `env(safe-area-inset-*)` | iOS 11.1+, Chrome 69+ | Footer y `viewport-fit=cover` |
| `Intl.NumberFormat` / `Array.at` | Safari 15.4+, Chrome 92+ | Sin polyfill: navegadores 2021+ |
| `IntersectionObserver` | Safari 12.1+ | Con guard `'IntersectionObserver' in window` |
| ES modules | Safari 11+ | `type="module"` |

Política razonable: la web funciona completa en navegadores de 2022 en
adelante y **degradada pero legible** en los anteriores (2020-2021): si el
navegador no entiende `color-mix`, se conservan los colores planos del
bloque de fallbacks y el contenido, el tema y el texto intactos.

### 4.1 Fallbacks declarados
Todos antes de las reglas modernas, así que el cascade solo activa el plano
si la propiedad moderna es inválida: `.mock-banner`, `.source-box`,
`.card:hover`, `.equivalencia`, `.duo-card.*`, `.duo-impact`,
`.search-results li a.active`, `.tag.*`.

## 5 · Tema y colores

Tokens en `:root` (claro) y `[data-theme="dark"]` (oscuro), con
`color-scheme: light dark` para form controls nativos.

- **Primary `#c1121f`** (rojo sangre) : light 4.5:1+, dark `#ef7b74`.
- **Bad `#b3261e`** / **OK `#15803d`** / **Warn `#b45309`** en ambos temas.
- `theme-color` claro `#c1121f` + oscuro `#101214` (barra del navegador).
- Manifest: `theme_color #c1121f`, `background_color #faf9f6`.
- Persistencia: `localStorage` (`qg-theme`) → `prefers-color-scheme` como
  fallback; botón `◐` con `aria-pressed`.
- Contrastes verificados WCAG AA (texto ≥17px base).

## 6 · Mantenimiento (flujo único de registro)

Las URLs del sitio viven en **un solo lugar**: `scripts/pages.mjs`.

```bash
node scripts/build-search-index.mjs   # data/search-index.json
node scripts/build-sitemap.mjs        # sitemap.xml
node scripts/enhance-head.mjs         # metas PWA/SEO en los 23 <head> (idempotente)
```

`npm run pwa` ejecuta los tres. Añadir una página = añadirla a `pages.mjs`
+ crear su directorio e `index.html` (el script de `<head>` lo enriquece).

## 7 · Git y repositorio

- Repositorio iniciado con `.gitignore` (node_modules, .env, logs).
- Convenio propuesto para commits: prefijos `feat:` / `fix:` / `docs:` /
  `data:` / `chore:`.
- En `SEGURIDAD`: `.env` no se versiona; el sitio no guarda secretos,
  todas las APIs usadas son públicas.

## 8 · Arquitectura de archivos (nueva)

```
quien-gana/
├── index.html  ·  site.webmanifest  ·  sw.js  ·  robots.txt  ·  sitemap.xml
├── dinero/ vida/ guerra/ democracia/ verificador/ analisis/
│   └── metodologia/ fuentes/ empresa/        # 23 páginas
├── assets/
│   ├── css/main.css                          # + fallbacks navegadores
│   ├── img/                                  # + icon-192/512/180/64 (PWA)
│   └── js/ …                                 # main.js registra sw.js
├── data/*.json  +  search-index.json  +  contratos-ted.json (TED)
├── scripts/
│   ├── pages.mjs                             # ★ registro único de URLs
│   ├── build-search-index.mjs  ·  build-sitemap.mjs  ·  enhance-head.mjs
│   └── fetch-*.mjs  ·  update-all.mjs  ·  validate-data.mjs
└── README.md · ARCHITECTURE.md · SEO.md · DATA_*.md
```