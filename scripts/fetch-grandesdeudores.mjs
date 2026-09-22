#!/usr/bin/env node
/**
 * Detector de nuevas ediciones del listado de grandes deudores de la AEAT.
 *
 * El PDF oficial es un documento ESCANEADO (119 páginas = 119 imágenes, sin capa
 * de texto), así que la extracción automática no es posible sin OCR. Lo que SÍ
 * automatizamos: comprobar cada día si el PDF oficial ha cambiado (tamaño) y
 * marcar el JSON para que update-data.sh avise de que toca actualizar a mano.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const FICHERO = path.join(ROOT, 'data', 'grandes-deudores.json');
const PDF_URL = 'https://sede.agenciatributaria.gob.es/static_files/Sede/NoIx/Listado_deudores.pdf';

async function tamanoPdf() {
  for (const metodo of ['HEAD', 'GET']) {
    try {
      const res = await fetch(PDF_URL, { method: metodo, headers: { 'User-Agent': 'quien-gana/1.0' } });
      const len = Number(res.headers.get('content-length'));
      if (res.body && metodo === 'GET') res.body.cancel().catch(() => {});
      if (res.ok && Number.isFinite(len) && len > 0) return len;
    } catch { /* probamos el siguiente método */ }
  }
  throw new Error(`no se pudo obtener el tamaño de ${PDF_URL}`);
}

const doc = JSON.parse(await readFile(FICHERO, 'utf8'));
doc.detector ??= {};
doc.detector.ultimaComprobacion = new Date().toISOString();

let tamano;
try {
  tamano = await tamanoPdf();
} catch (e) {
  console.error(`✖ detector AEAT: ${e.message} — se mantiene el estado anterior`);
  process.exit(1);
}

const anterior = doc.detector.ultimoTamanoBytes;
doc.detector.ultimoTamanoBytes = tamano;
doc.detector.cambioDetectado = anterior != null && anterior !== tamano;

await writeFile(FICHERO, JSON.stringify(doc, null, 2) + '\n');

if (doc.detector.cambioDetectado) {
  console.warn(`⚠ NUEVA EDICIÓN del listado de grandes deudores detectada (${anterior} → ${tamano} bytes). Actualizar manualmente data/grandes-deudores.json.`);
} else {
  console.log(`✓ grandes-deudores: sin cambios en el PDF oficial (${tamano} bytes)${anterior == null ? ' — baseline registrada' : ''}`);
}
