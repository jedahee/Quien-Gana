# Fuentes de datos — ¿Quién Gana?

Catálogo técnico de todos los orígenes de datos del proyecto: endpoints verificados,
formato de descarga y errores conocidos.

## 1 · APIs automáticas (pipeline semanal)

### INE Tempus3
- **Endpoint verificado:** `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/{COD}?date=YYYYMMDD:YYYYMMDD`
- **Serie en uso:** `IPC251856` → «Nacional. Índice general. Variación anual» (mensual).
- **Salida:** `data/ipc-anual.json` (72 observaciones al 23-ago-2026; última: dic-2025… actualizada por ejecución).
- **Notas:** el parámetro `date=A:B` filtra por rango; sin `date` devuelve la serie completa.
- **Script:** `scripts/fetch-ine.mjs`.

### Eurostat
- **Endpoint:** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?format=JSON&lang=EN&...`
- **Datasets verificados y en uso:**

| Dataset | Contenido | Salida | Dimensiones clave |
|---|---|---|---|
| `demo_pjan` | Población a 1 de enero | `data/poblacion.json` | `geo=ES`, `sex=T`, `age=TOTAL` |
| `une_rt_m` | Tasa de paro mensual | `data/paro-tasa.json` | `s_adj=SA`, `sex=T`, `age=TOTAL`, `unit=PC_ACT`, `geo=ES` |
| `prc_hpi_q` | Índice precios vivienda (2015=100) | `data/hpi-vivienda.json` | `unit=2015_100`, `geo=ES` |
| `prc_hicp_manr` | Inflación IPC anual por rubro | `data/alquiler-inflacion.json` | `coicop=RENT` («Alquiler real»), `unit=RCH_A_AVG` |
| `ilc_di12` | Índice de Gini | `data/gini.json` | `indic_il=Gini`, `unit=PCT` |
| `crim_off_cat` | Delitos registrados por categoría ICCS (x100k hab.) | `data/criminalidad-espana.json` | `geo=ES`, `unit=P_HTHAB`, cesta de 5 categorías (no existe TOTAL); usar `sinceTimePeriod`, NO `time=a..b` |
| `migr_imm1ctz` | Inmigración bruta anual (flujos) | `data/inmigracion-flujos.json` | `geo=ES`, `citizen=TOTAL`, `sex=T`, `age=TOTAL`, `agedef=REACH`, `unit=NR` (la API ignora filtros sueltos → segunda barrera en `parseJSONStat`) |

- **Datasets que FALLARON (no usar sin verificar):**
  - `ilc_di03` → error `INVALID_QUERY_DIMENSION` con `INDIC_IL`.
  - `ilc_mdho06` (housing cost overburden) → 404.
  - `sdg_11_10` (overcrowding) → 404.
  - `migr_pop3ctb` → dimensión `CITZ` no definida para España.
- **Script:** `scripts/fetch-eurostat.mjs`.

## 2 · Importaciones manuales (documentos oficiales)

Cada archivo incluye `fuente`, `referencias[]` y notas por observación. Regla:
**ejecutado ≠ anunciado ≠ autorizado**, siempre separados.

| Archivo | Origen | Estado |
|---|---|---|
| `data/gasto-defensa.json` | PGE borradores + liquidaciones IGAE vía prensa citada | Activo; huecos declarados (2017, 2019, 2023) |
| `data/pge-partidas.json` | Hacienda (PGE-2023), Moncloa (ejecución pensiones dic-2025), IGAE (Defensa) | Activo; ejercicio mixto etiquetado |
| `data/salarios-eaes.json` | INE EAES 2023–2024 (+SMI Trabajo como referencia aparte) | Activo |
| `data/vivienda-referencias.json` | Idealista / pisos.com vía agencias (portales, etiquetados); contraste oficial pendiente (HabitMITma) | Activo |
| `data/ucrania-ayudas.json` | Respuestas parlamentarias + comparecencias (Infodefensa/EuropaPress/Euronews) | Activo; bilateral vs fondos UE separados |
| `data/israel-material.json` | Sec. Estado Comercio/Jimddu (oficial) + Centre Delàs (no gubernamental, etiquetado) | Activo; categorías separadas |
| `data/referencias-equivalencias.json` | Derivado: Idealista × supuesto superficie; EAES; SMI | Activo |

## 3 · Portales públicos sin API estable

| Fuente | Estado verificado | Uso previsto |
|---|---|---|
| PLACSP — sindicación (`contrataciondelestado.es/sindicacion`) | **HTTP 200 pero cuerpo = error**: exige certificado digital autorizado («Su certificado no está autorizado…», verificado 2026-08) | Análisis de contratos BLOQUEADO hasta credenciales válidas |
| PLACSP — datos abiertos (`datosabiertos/...`) | HTTP 302 (redirección con control de acceso); el CSV directo responde WAF «Request Rejected» incluso con User-Agent de navegador (verificado 2026-08) | Seguir redirección cuando haya credenciales |
| **TED — Tenders Electronic Daily** (`api.ted.europa.eu/v3/notices/search`, POST, sin auth) | ✅ **FUNCIONA**: adjudicaciones ES (`organisation-country-buyer = "ESP"` ISO-3, `notice-type = "can-standard"`, fechas `AAAAMMDD` o `today(-N)`, operador `=` simple). ~2.800 avisos/40 días. Gotchas: campos multivaluados/idiomas, techos de acuerdos marco inflan sumas → clasificados aparte en `fetch-ted.mjs` | `data/contratos-ted.json` — cobertura parcial: solo contratos sobre umbral UE |
| presupuesto.gob.es | **HTTP 000** (inaccesible desde este entorno) | Bloqueado; partidas importadas manualmente |
| datos.gob.es CKAN | **200** con `?title=` (⚠ NO usa `q=`) | Búsqueda de catálogo para nuevas fuentes |
| igae.pap.hacienda.gob.es (liquidaciones Defensa) | **HTTP 000** (inaccesible desde este entorno, verificado 2026-08-25) | `gasto-defensa.json` sigue manual |
| trabajo.gob.es (Salario Mínimo) | **HTTP 000** (inaccesible desde este entorno, verificado 2026-08-25) | SMI en `referencias-equivalencias.json` sigue manual |
| Kiel Institute — Ukraine Support Tracker | **200**: publica XLSX (`Ukraine_Support_Tracker_Release_NN.xlsx`) pero requiere parser zip/xml sin dependencias y su semántica es global UE+donantes, NO bilateral España → no comparable con nuestro dataset | `ucrania-ayudas.json` sigue manual; reintentar si se acepta una dependencia (xlsx) |
| INE wstempus — búsqueda de series/tablas | No existe endpoint de búsqueda (`SERIES?q=`/`TABLES?q=` → «La operación indicada no existe») y la página de la EAES no expone IDs `DATOS_TABLA` en HTML → sin ruta automática para el salario medio anual | `salarios-eaes.json` sigue manual |

## 4 · Fuentes secundarias etiquetadas

Se usan solo cuando el documento original no está en línea o no tiene formato legible.
Siempre se cita el medio + fecha y se marca la naturaleza de la cifra:

- **Público** — criterio «gasto efectivo» Defensa 2025 (23.333 M€, +46%).
- **Infobae** — liquidación oficial 2025 (23.041 M€, 1,44% PIB).
- **RTVE** — informe OTAN abril-2026 (España supera 2% del PIB).
- **Centre Delàs d'Estudis per la Pau** — criterio amplio (33.123 M€) y contratos a industrias israelíes (46 contratos / 1.044 M€). *No gubernamental.*
- **ElDiario.es** — percepción inmigración (CIS/Eurobarómetro) y serie empleo extranjeros INE 2007–2023.
- **Reuters / The Guardian / El País** — acuerdo marco UE–EE.UU. (ago-2026). Pendiente de texto jurídico público.

## 5 · Modo MOCK_DATA

Variable `MOCK_DATA=true` (`.env`) + campo `"mock": true/false` en cada JSON.
Si algún dataset activo está en mock, todas las páginas muestran un banner de aviso
automático (`assets/js/data.js → QG.checkMock()`).
