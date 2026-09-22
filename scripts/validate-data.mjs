#!/usr/bin/env node
/**
 * Valida la integridad de todos los datasets de data/:
 *  - JSON parseable
 *  - observaciones es array (si existe) con valores numéricos finitos
 *  - sin claves duplicadas periodo(+categoria)
 *  - ficheros núcleo presentes (los que rompen páginas si faltan)
 *  - avisa STALE si un dataset automático lleva >45 días sin refrescar
 * Salida legible por máquina: líneas "OK|INVALID|STALE|MISSING <fichero> ...".
 * Exit 0 = estado sano; exit 1 = algún fichero inválido o núcleo ausente.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = new URL('../data/', import.meta.url).pathname;
const STALE_DAYS = 45;

/** Ficheros sin los cuales páginas clave quedan rotas o vacías. */
const NUCLEO = [
  'ipc-anual.json',
  'poblacion.json',
  'paro-tasa.json',
  'hpi-vivienda.json',
  'alquiler-inflacion.json',
  'gini.json',
  'criminalidad-espana.json',
  'inmigracion-flujos.json',
  'gasto-defensa.json',
  'referencias-equivalencias.json',
];

const diasDesde = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : Math.floor((Date.now() - t) / 864e5);
};

let invalidos = 0;
let sanos = 0;

for (const fichero of NUCLEO) {
  try {
    await readFile(path.join(DATA_DIR, fichero));
  } catch {
    console.log(`MISSING ${fichero} :: núcleo ausente`);
    invalidos++;
  }
}

let ficheros = [];
try {
  ficheros = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
} catch (e) {
  console.error(`data/ ilegible: ${e.message}`);
  process.exit(1);
}

for (const fichero of ficheros.sort()) {
  const ruta = path.join(DATA_DIR, fichero);
  try {
    const doc = JSON.parse(await readFile(ruta, 'utf8'));
    const obs = doc.observaciones;
    let n = '—';
    let ultima = '—';

    if (obs !== undefined) {
      if (!Array.isArray(obs)) throw new Error('observaciones no es un array');
      const vistas = new Set();
      for (const o of obs) {
        const clave = `${o.periodo ?? ''}|${o.categoria ?? ''}`;
        if (vistas.has(clave)) throw new Error(`observación duplicada: ${clave}`);
        vistas.add(clave);
        if (!Number.isFinite(Number(o.valor))) throw new Error(`valor no numérico en ${clave}`);
      }
      n = obs.length;
      ultima = obs.at(-1)?.periodo ?? '—';
    }
    if (Array.isArray(doc.adjudicaciones) && doc.adjudicaciones.length) {
      // Datasets de eventos (p. ej. contratos-ted): además de la serie, llevan avisos.
      n = `${n} obs + ${doc.adjudicaciones.length} avisos`;
      ultima = doc.ventana?.hasta ?? ultima;
    }

    sanos++;
    const sufijo = typeof n === 'string' ? '' : ' obs';
    console.log(`OK ${fichero} :: ${n}${sufijo} · última ${ultima} · act. ${(doc.actualizado ?? '?').slice(0, 10)}`);

    if (doc.importacion === 'automatica') {
      const dias = diasDesde(doc.actualizado);
      if (dias > STALE_DAYS) console.log(`STALE ${fichero} :: ${dias} días sin actualizar (> ${STALE_DAYS})`);
    }
  } catch (e) {
    invalidos++;
    console.log(`INVALID ${fichero} :: ${e.message}`);
  }
}

console.log(`RESUMEN ${sanos} OK · ${invalidos} problemas · ${ficheros.length} ficheros`);
process.exit(invalidos > 0 ? 1 : 0);
