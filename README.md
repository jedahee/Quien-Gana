# ¿Quién Gana? — ¿Y quién acaba pagando?

Web de datos públicos para entender dónde está el dinero, quién tiene el poder
y qué está pasando en España. **100% estática, sin frameworks, sin dependencias.**

> Filosofía: pocos temas → datos claros → contexto → fuente original siempre visible.
> No tienes que confiar en nosotros: cada cifra lleva enlace a su origen.

Producción: <https://jedahee.github.io/Quien-Gana/>

## Estructura del sitio

| URL | Contenido |
|---|---|
| [https://jedahee.github.io/Quien-Gana/](https://jedahee.github.io/Quien-Gana/) | Portada + historia destacada (gasto militar) + pulso del país |
| [Dinero](https://jedahee.github.io/Quien-Gana/dinero/) | Presupuesto, gasto militar, contratos públicos, grandes deudores |
| [Vida](https://jedahee.github.io/Quien-Gana/vida/) | Vivienda, salarios y empleo, coste de vida |
| [Guerra](https://jedahee.github.io/Quien-Gana/guerra/) | España/rearme, Ucrania, Israel, EE.UU. |
| [Democracia](https://jedahee.github.io/Quien-Gana/democracia/) | Inmigración y percepción vs realidad |
| [Verificador](https://jedahee.github.io/Quien-Gana/verificador/) | Afirmaciones contrastadas con veredictos y fuentes |
| [Análisis](https://jedahee.github.io/Quien-Gana/analisis/) | Piezas de análisis («Quién se beneficia del gasto militar») |
| [Metodología](https://jedahee.github.io/Quien-Gana/metodologia/) · [Fuentes](https://jedahee.github.io/Quien-Gana/fuentes/) · [Empresa](https://jedahee.github.io/Quien-Gana/empresa/) | Transparencia del proyecto |

El menú superior enlaza las cinco secciones (Dinero, Vida, Guerra, Democracia
y, desde la portada, Inicio). El footer enlaza además Verificador, Análisis,
Metodología, Fuentes y Empresa.

## SEO, PWA e instalación (tipo app)

El sitio es instalable desde el navegador (Android/iOS/desktop) y legible
offline:

- **`site.webmanifest`** — nombre, tema, iconos 192/512 (any + maskable),
  `display: standalone` y atajos a las secciones.
- **`sw.js`** — service worker: precache del shell, red-preferente para
  páginas y datos (`stale-while-revalidate` para JSON; nunca muestra cifras
  como frescas si no lo están).
- **SEO**: canonical, OpenGraph + Twitter cards en las 23 páginas,
  JSON-LD, `theme-color` claro/oscuro, `sitemap.xml` regenerable y robots.txt.
- **Cache-busting**: `scripts/enhance-head.mjs` añade `?v=` (hash SHA-1 del
  contenido) a CSS, JS y manifest en cada `<head>`; cambia solo si cambia el
  archivo.
- **Compatibilidad**: fallbacks CSS para navegadores sin `color-mix()`,
  `viewport-fit=cover` + safe-area en móviles con notch, `prefers-reduced-motion`,
  tema oscuro automático. Las rutas de datos y SW se resuelven contra la raíz
  real del sitio, por lo que el mismo código funciona en la raíz de un dominio
  o bajo un prefijo (GitHub Pages de proyecto).

Documentación completa: [`SEO.md`](SEO.md).

## Desarrollo

El proyecto no tiene dependencias ni paso de build:

```bash
npm run update-data    # descarga INE + Eurostat y regenera el índice de búsqueda
npm run build-index    # solo regenera data/search-index.json
npm run build-sitemap  # regenera sitemap.xml y robots.txt desde scripts/pages.mjs
npm run pwa            # enhance-head (23 <head>, cache-busting) + index + sitemap
npm run serve          # http://localhost:8080
npm run validate       # valida esquema e integridad de data/*.json
```

Requisitos: Node ≥ 20. Los scripts son ESM (`"type": "module"`).

## Datos

- `data/*.json` — esquema común documentado en `DATA_METHODOLOGY.md`.
- Orígenes y endpoints verificados en `DATA_SOURCES.md`.
- Automáticos: INE Tempus3 (IPC), Eurostat (población, paro, vivienda, alquiler,
  Gini), Tenders Electronic Daily (contratos) y AEAT (grandes deudores).
- Manuales con cita exacta: Defensa, PGE, EAES, Ucrania, Israel, niveles vivienda.
- `MOCK_DATA=true` en `.env` activa datasets de prueba + banner global de aviso.

## Principios editoriales

1. Fuente original siempre visible.
2. Niveles ≠ tendencias (nunca mezclar índices con precios).
3. No sumar definiciones distintas (ejecutado ≠ anunciado ≠ autorizado).
4. Huecos = «pendiente de verificación», nunca estimaciones inventadas.
5. Fuentes no gubernamentales siempre etiquetadas.

## Despliegue

**GitHub Pages (producción actual):**

```bash
node scripts/deploy-pages.mjs            # valida, regenera build y publica en gh-pages
node scripts/deploy-pages.mjs --dry-run  # solo monta el staging, sin publicar
```

El script copia SOLO los archivos públicos (páginas, `assets/`, `data/`,
`sw.js`, `site.webmanifest`, sitemap, robots, 404 y `.nojekyll`) a un staging
y los empuja a la rama `gh-pages`. Nunca sube `.env`, `scripts/`, documentación
ni logs. El contenido queda servido en <https://jedahee.github.io/Quien-Gana/>.

Cualquier otro hosting estático sirve igual (`/` → `index.html`, URLs limpias
por directorios). Configura `SITE_URL` en `.env` (o en `scripts/env.mjs`, que
lee `.env` si existe y si no usa el valor por defecto) para reescribir sitemap,
canonical y OG a tu dominio.

URL pública actual: <https://jedahee.github.io/Quien-Gana/>

## Licencias

Código: libre. Datos: pertenecen a sus fuentes originales (INE, Eurostat, IGAE…),
siempre citadas. Documentación completa en `/metodologia/` y `/fuentes/`.
