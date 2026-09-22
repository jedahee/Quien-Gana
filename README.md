# ¿Quién Gana? — ¿Y quién acaba pagando?

Web de datos públicos para entender dónde está el dinero, quién tiene el poder
y qué está pasando en España. **100% estática, sin frameworks, sin dependencias.**

> Filosofía: pocos temas → datos claros → contexto → fuente original siempre visible.
> No tienes que confiar en nosotros: cada cifra lleva enlace a su origen.

## Estructura del sitio

| Ruta | Contenido |
|---|---|
| `/` | Portada + historia destacada (gasto militar) + pulso del país |
| `/dinero/` | Presupuesto, gasto militar, contratos públicos*, grandes deudores* |
| `/vida/` | Vivienda, salarios y empleo, coste de vida |
| `/guerra/` | España/rearme, Ucrania, Israel, EE.UU. |
| `/democracia/` | Inmigración y percepción vs realidad |
| `/verificador/` | Afirmaciones contrastadas con veredictos y fuentes |
| `/analisis/` | Piezas de análisis («Quién se beneficia del gasto militar») |
| `/metodologia/` · `/fuentes/` · `/empresa/` | Transparencia del proyecto |

*\* = páginas con estado honesto «en preparación».*

## SEO, PWA e instalación (tipo app)

El sitio es instalable desde el navegador (Android/iOS/desktop) y legible
offline:

- **`site.webmanifest`** — nombre, tema, iconos 192/512 (any + maskable),
  `display: standalone` y atajos a las secciones.
- **`sw.js`** — service worker: precache del shell, red-preferente para
  páginas y datos (`stale-while-revalidate` para JSON; nunca muestra cifras
  como frescas si no lo están).
- **SEO**: canonical, OpenGraph + Twitter cards en las 23 páginas,
  JSON-LD, `theme-color` claro/oscuro, sitemap.xml regenerable y robots.txt.
- **Compatibilidad**: fallbacks CSS para navegadores sin `color-mix()`,
  `viewport-fit=cover` + safe-area en móviles con notch, `prefers-reduced-motion`,
  tema oscuro automático.

Documentación completa: [`SEO.md`](SEO.md).

## Desarrollo

```bash
npm install            # solo dependencias de desarrollo (dotenv)
npm run update-data    # descarga INE + Eurostat y regenera el índice de búsqueda
npm run build-index    # solo regenera data/search-index.json
npm run build-sitemap  # regenera sitemap.xml desde scripts/pages.mjs
npm run pwa            # enhance-head (23 <head>) + index + sitemap
npm run serve          # http://localhost:8080
```

Requisitos: Node ≥ 18. Sin build step: lo que ves es lo que hay.

## Datos

- `data/*.json` — esquema común documentado en `DATA_METHODOLOGY.md`.
- Orígenes y endpoints verificados en `DATA_SOURCES.md`.
- Automáticos: INE Tempus3 (IPC) y Eurostat (población, paro, vivienda, alquiler, Gini).
- Manuales con cita exacta: Defensa, PGE, EAES, Ucrania, Israel, niveles vivienda.
- `MOCK_DATA=true` en `.env` activa datasets de prueba + banner global de aviso.

## Principios editoriales

1. Fuente original siempre visible.
2. Niveles ≠ tendencias (nunca mezclar índices con precios).
3. No sumar definiciones distintas (ejecutado ≠ anunciado ≠ autorizado).
4. Huecos = «pendiente de verificación», nunca estimaciones inventadas.
5. Fuentes no gubernamentales siempre etiquetadas.

## Despliegue

Cualquier hosting estático sirve (`/` → `index.html`, URLs limpias por directorios).
Configura `SITE_URL` en `.env` para sitemap/canonical (placeholder actual:
`https://www.quiengana.es`).

## Licencias

Código: libre. Datos: pertenecen a sus fuentes originales (INE, Eurostat, IGAE…),
siempre citadas. Documentación completa en `/metodologia/` y `/fuentes/`.
