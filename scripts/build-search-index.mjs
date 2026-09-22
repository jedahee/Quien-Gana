#!/usr/bin/env node
/**
 * Genera data/search-index.json a partir del registro de páginas e indicadores.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PAGES } from './pages.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** Indicadores (se enriquecen leyendo los JSON de data/) */
const INDICADORES = [
  { file: 'gasto-defensa.json', url: '/dinero/gasto-militar/' },
  { file: 'pge-partidas.json', url: '/dinero/presupuesto/' },
  { file: 'hpi-vivienda.json', url: '/vida/vivienda/' },
  { file: 'alquiler-inflacion.json', url: '/vida/vivienda/' },
  { file: 'salarios-eaes.json', url: '/vida/salarios/' },
  { file: 'paro-tasa.json', url: '/vida/salarios/' },
  { file: 'ipc-anual.json', url: '/vida/coste-vida/' },
  { file: 'gini.json', url: '/vida/coste-vida/' },
];

async function readJSON(p) {
  try {
    const mod = await import(`file://${path.join(ROOT, 'data', p)}?t=${Date.now()}`);
    return mod.default ?? null;
  } catch {
    // import() de JSON necesita aserción; leemos con fs como alternativa
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(path.join(ROOT, 'data', p), 'utf8'));
  }
}

const entries = PAGES.map((p) => ({ ...p, keywords: `${p.titulo} ${p.texto}`.toLowerCase() }));

for (const ind of INDICADORES) {
  const doc = await readJSON(ind.file).catch(() => null);
  if (!doc) continue;
  entries.push({
    url: ind.url,
    titulo: doc.titulo,
    tipo: 'indicador',
    keywords: `${doc.titulo} ${(doc.definicion || '')} ${(doc.fuente?.nombre || '')}`.toLowerCase(),
    mock: doc.mock === true,
  });
}

await writeFile(
  path.join(ROOT, 'data', 'search-index.json'),
  JSON.stringify({ generado: new Date().toISOString(), entries }, null, 2) + '\n'
);
console.log(`✓ search-index.json: ${entries.length} entradas`);
