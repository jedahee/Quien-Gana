# Metodología de datos — ¿Quién Gana?

Documento normativo interno. La versión pública y divulgativa vive en `/metodologia/`.

## Principios

1. **Fuente original siempre visible.** Cada dato publicado enlaza a su fuente primaria.
2. **Niveles ≠ tendencias.** Los índices (Eurostat prc_hpi_q, 2015=100) nunca se presentan como precios; los niveles (€/m² de portales) nunca se presentan como series oficiales.
3. **No sumar definiciones distintas.** Ejemplos prohibidos: sumar exportaciones oficiales a Israel con contratos adjudicados (Centre Delàs); sumar ayuda bilateral a Ucrania con aportaciones a instrumentos europeos; sumar liquidación ministerial con criterio OTAN amplio.
4. **Ejecutado ≠ anunciado ≠ autorizado.** Se etiqueta la naturaleza de cada cifra en la propia observación (`nota`).
5. **Estados vacíos honestos.** Huecos = `valor: null` + nota «Pendiente de verificación». Nunca estimaciones disfrazadas.
6. **Contadores con método permanente.** Los contadores €/s interpolan una anual oficial (`total/31.536.000 s`) y muestran siempre la nota «Contador calculado a partir del gasto anual oficial». No son tiempo real y se declara así en title + nota visible.
7. **MOCK explícito.** Cualquier dataset con `"mock": true` activa banner global de aviso.

## Equivalencias documentadas

| Referencia | Valor | Origen |
|---|---|---|
| Vivienda media | 2.605 €/m² × 90 m² ≈ **234.450 €** | Idealista nov-2025 (portal) + supuesto propio conservador (Fomento estimó ~96 m² con fianzas) |
| Salario medio anual | **29.540,26 €** | EAES 2024 (INE) |
| SMI 2025 | **16.576 €**/año (1.184 € × 14) | Ministerio de Trabajo |
| Segundos/año | 31.536.000 | Constante (365 días) |

Fórmula general: `unidades = gasto_total / valor_referencia`. La fórmula y sus insumos se muestran junto a cada equivalencia publicada.

## Verificador — criterios de veredicto

- 🔴 **Falso**: los datos oficiales contradicen directamente la afirmación.
- 🟡 **Engañoso**: dato real usado sin contexto esencial que cambia su lectura.
- ⚪ **Sin verificar**: falta fuente primaria suficiente; se declara en lugar de opinar.

Los veredictos incluyen JSON-LD `ClaimReview` cuando aplican.

## Actualización

- Automática (semanal): `npm run update-data` → INE + Eurostat → regenera `search-index.json`.
- Manual: edición de los JSON de `data/` manteniendo esquema y añadiendo `referencias` nuevas.
- El campo `actualizado` de cada archivo registra la última revisión humana.

## Esquema común de datasets

```json
{
  "id": "...", "titulo": "...", "unidad": "M€|%|...",
  "mock": false, "importacion": "automatica|manual",
  "categoria": "dinero|vida|guerra|democracia|global",
  "definicion": "...", "metodologia": "...",
  "fuente": { "nombre": "...", "url": "..." },
  "referencias": [{ "label": "...", "url": "..." }],
  "actualizado": "YYYY-MM-DD",
  "observaciones": [{ "periodo": "...", "valor": null, "nota": "opcional" }]
}
```
