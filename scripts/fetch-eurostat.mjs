#!/usr/bin/env node
/**
 * Collector de Eurostat (API REST JSON, estadísticas oficiales de la UE,
 * incluidos los datos que España reporta vía INE).
 *
 * Documentación: https://ec.europa.eu/eurostat/web/json-and-unicode-unicode-web-services
 * Endpoint comprobado en 2026-08 con las series de este fichero.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA_DIR = path.join(ROOT, 'data');
const RETRIEVED_AT = new Date().toISOString();
const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';

/** Decodifica la estructura JSON-stat del API de Eurostat.
 *  La API puede IGNORAR filtros de una sola dimensión (p. ej. `unit`),
 *  así que aplicamos aquí los filtros solicitados como segunda barrera. */
function parseJSONStat(json, filters = {}) {
  const dims = json.id;              // ["freq","unit","geo","time",...]
  const size = json.size;            // tamaño de cada dimensión
  const cats = json.dimension;
  const codes = [];
  for (let d = 0; d < dims.length; d++) {
    const entries = Object.entries(cats[dims[d]].category.index)
      .sort((a, b) => a[1] - b[1])
      .map(([code]) => code);
    codes.push(entries);
  }
  const out = [];
  const total = size.reduce((a, b) => a * b, 1);
  const idx = new Array(dims.length).fill(0);
  for (let n = 0; n < total; n++) {
    let rem = n;
    for (let d = dims.length - 1; d >= 0; d--) {
      idx[d] = rem % size[d];
      rem = Math.floor(rem / size[d]);
    }
    const flat = idx.reduce((acc, v, i) => acc + v * size.slice(i + 1).reduce((a, b) => a * b, 1), 0);
    const valor = json.value[String(flat)] ?? null;
    if (valor === null || valor === undefined) continue;
    const obs = {};
    dims.forEach((dimName, i) => { obs[dimName] = codes[i][idx[i]]; });
    let ok = true;
    for (const [k, v] of Object.entries(filters)) {
      if (k in obs && String(obs[k]) !== String(v)) { ok = false; break; }
    }
    if (!ok) continue;
    out.push({ ...obs, valor });
  }
  return out;
}

async function pull(dataset, params) {
  const qs = new URLSearchParams({ format: 'JSON', lang: 'EN', ...params });
  const endpoint = `${BASE}${dataset}?${qs}`;
  const res = await fetch(endpoint, { headers: { 'User-Agent': 'quien-gana/0.1' } });
  if (!res.ok) throw new Error(`Eurostat ${dataset}: HTTP ${res.status}`);
  return { json: await res.json(), endpoint };
}

function docBase(id, titulo, unidad, categoria, definicion, metodologia, fuenteUrl) {
  return {
    id, titulo, unidad, mock: false, importacion: 'automatica',
    categoria, definicion, metodologia,
    fuente: { nombre: 'Eurostat (datos oficiales UE, incluida España)', url: fuenteUrl },
    actualizado: RETRIEVED_AT,
    observaciones: [],
  };
}

async function save(file, doc, endpoint) {
  doc.fuente.endpoint = endpoint;
  await writeFile(path.join(DATA_DIR, file), JSON.stringify(doc, null, 2) + '\n');
  console.log(`✓ ${file}: ${doc.observaciones.length} observaciones`);
}

/* 1. Población a 1 de enero (demo_pjan) */
try {
  const params = {
    geo: 'ES', sex: 'T', age: 'TOTAL', sinceTimePeriod: '2015',
  };
  const { json, endpoint } = await pull('demo_pjan', params);
  const doc = docBase('poblacion', 'Población de España a 1 de enero', 'personas', 'vida',
    'Población total residente en España a 1 de enero de cada año.',
    'Dataset demo_pjan de Eurostat, alimentado por el INE (Cifras de Población).',
    'https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('poblacion.json', doc, endpoint);
} catch (e) { console.error('✗ poblacion:', e.message); process.exit(1); }

/* 2. Tasa de paro mensual (une_rt_m) */
try {
  const params = {
    geo: 'ES', s_adj: 'SA', sex: 'T', age: 'TOTAL', unit: 'PC_ACT', sinceTimePeriod: '2019',
  };
  const { json, endpoint } = await pull('une_rt_m', params);
  const doc = docBase('paro-tasa', 'Tasa de paro mensual (ajustada de estacionalidad)', '%', 'vida',
    'Porcentaje de activos en paro, ajustado de estacionalidad, ambos sexos.',
    'Dataset une_rt_m de Eurostat (Encuesta de Población Activa del INE).',
    'https://ec.europa.eu/eurostat/databrowser/view/une_rt_m/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('paro-tasa.json', doc, endpoint);
} catch (e) { console.error('✗ paro-tasa:', e.message); process.exit(1); }

/* 3. Índice de precios de vivienda trimestral (prc_hpi_q), base 2015=100 */
try {
  const params = {
    geo: 'ES', unit: 'I15_Q', purchase: 'TOTAL', sinceTimePeriod: '2015-Q1',
  };
  const { json, endpoint } = await pull('prc_hpi_q', params);
  const doc = docBase('hpi-vivienda', 'Índice de precios de vivienda (2015=100)', 'índice', 'vida',
    'Índice de precios de vivienda, base 2015=100, datos trimestrales.',
    'Dataset prc_hpi_q de Eurostat (INE y Banco de España). Mide evolución relativa de precios, no el nivel en €/m².',
    'https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_q/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('hpi-vivienda.json', doc, endpoint);
} catch (e) { console.error('✗ hpi-vivienda:', e.message); process.exit(1); }

/* 4. Coeficiente de Gini (ilc_di12) */
try {
  const params = {
    geo: 'ES', age: 'TOTAL', statinfo: 'GINI_HND', sinceTimePeriod: '2015',
  };
  const { json, endpoint } = await pull('ilc_di12', params);
  const doc = docBase('gini', 'Coeficiente de Gini (desigualdad de renta)', 'puntos', 'vida',
    'Coeficiente de Gini de la renta disponible equivalizada. 0 = igualdad total, 100 = desigualdad máxima.',
    'Dataset ilc_di12 de Eurostat (Encuesta de Condiciones de Vida del INE). Dato anual con desfase ~2 años.',
    'https://ec.europa.eu/eurostat/databrowser/view/ilc_di12/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .filter((o) => o.age === 'TOTAL' && (!o.statinfo || o.statinfo === 'GINI_HND'))
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('gini.json', doc, endpoint);
} catch (e) { console.error('✗ gini:', e.message); process.exit(1); }

/* 5. Variación anual del precio del alquiler dentro del IPC (HICP CP0411) */
try {
  const params = {
    geo: 'ES', coicop: 'CP0411', unit: 'RCH_A', sinceTimePeriod: '2015',
  };
  const { json, endpoint } = await pull('prc_hicp_manr', params);
  const doc = docBase('alquiler-inflacion', 'Variación anual del precio del alquiler (IPCA)', '%', 'vida',
    'Variación anual del subgrupo "Alquileres reales pagados por inquilinos" del IPC armonizado.',
    'Dataset prc_hicp_manr de Eurostat, coicop CP0411. Mide cuánto sube el alquiler cada año, no su nivel absoluto.',
    'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('alquiler-inflacion.json', doc, endpoint);
} catch (e) { console.error('✗ alquiler-inflacion:', e.message); process.exit(1); }

/* 6. Delincuencia registrada por categorías clave (crim_off_cat), por 100.000 hab.
   No existe agregado TOTAL en el dataset: usamos una cesta representativa
   (homicidio, lesiones graves, robo violento, robo con fuerza, hurto),
   cada serie separada para poder leer tendencias sin sumar peras y manzanas. */
try {
  const CESTA = [
    ['ICCS0101', 'Homicidio intencional'],
    ['ICCS020111', 'Lesiones graves'],
    ['ICCS0401', 'Robo con violencia o intimidación'],
    ['ICCS0501', 'Robo con fuerza (allanamiento)'],
    ['ICCS0502', 'Hurto'],
  ];
  const params = { geo: 'ES', unit: 'P_HTHAB', sinceTimePeriod: '2012' };
  const doc = docBase('criminalidad-espana', 'Delincuencia registrada en España (por 100.000 hab.)', 'infracciones por 100.000 habitantes', 'democracia',
    'Infracciones penales registradas por la policía según categoría ICCS, por 100.000 habitantes. Series separadas por tipo de delito.',
    'Dataset crim_off_cat de Eurostat (datos reportados por el Ministerio del Interior español). Cada categoría se analiza por separado: no se suma una "criminalidad total".',
    'https://ec.europa.eu/eurostat/databrowser/view/crim_off_cat/default/table');
  const endpoints = [];
  for (const [code, nombre] of CESTA) {
    const { json, endpoint } = await pull('crim_off_cat', { ...params, iccs: code });
    endpoints.push(endpoint);
    doc.observaciones.push(
      ...parseJSONStat(json, { ...params, iccs: code })
        .map((o) => ({ periodo: o.time, categoria: code, valor: o.valor }))
    );
  }
  doc.categorias = Object.fromEntries(CESTA);
  doc.observaciones.sort((a, b) => a.periodo.localeCompare(b.periodo) || a.categoria.localeCompare(b.categoria));
  doc.fuente.endpoint = endpoints;
  await writeFile(path.join(DATA_DIR, 'criminalidad-espana.json'), JSON.stringify(doc, null, 2) + '\n');
  console.log(`✓ criminalidad-espana.json: ${doc.observaciones.length} observaciones`);
} catch (e) { console.error('✗ criminalidad-espana:', e.message); }

/* 7. Inmigración bruta anual (migr_imm1ctz): personas que llegan a España */
try {
  const params = {
    geo: 'ES', citizen: 'TOTAL', sex: 'T', age: 'TOTAL', agedef: 'REACH', unit: 'NR',
    sinceTimePeriod: '2012',
  };
  const { json, endpoint } = await pull('migr_imm1ctz', params);
  const doc = docBase('inmigracion-flujos', 'Inmigración bruta anual hacia España', 'personas', 'democracia',
    'Número de personas que llegan a España cada año procedentes del extranjero (flujo de entrada total, todas las nacionalidades).',
    'Dataset migr_imm1ctz de Eurostat (INE, Estadística de Migraciones). Es flujo bruto de entrada, no saldo neto ni stock de población extranjera.',
    'https://ec.europa.eu/eurostat/databrowser/view/migr_imm1ctz/default/table');
  doc.observaciones = parseJSONStat(json, params)
    .map((o) => ({ periodo: o.time, valor: o.valor }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  await save('inmigracion-flujos.json', doc, endpoint);
} catch (e) { console.error('✗ inmigracion-flujos:', e.message); }

console.log(`Collector Eurostat completado (${RETRIEVED_AT})`);
