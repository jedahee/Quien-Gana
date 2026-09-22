#!/usr/bin/env node
/* Configuración central desde .env (sin dependencias).
   Carga scripts/.env o el .env de la raíz del repo si existe; si no,
   usa los valores por defecto definidos aquí. */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  SITE_URL: 'https://www.quiengana.es',
  MOCK_DATA: 'false',
};

export const cfg = loadEnv();

function loadEnv() {
  const out = { ...DEFAULTS };
  const candidates = [
    path.join(ROOT, '.env'),
    path.join(ROOT, 'scripts', '.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) {
        out[m[1]] = m[2].replace(/["']/g, '');
      }
    }
    return out;
  }
  return out;
}

export const SITE_URL = cfg.SITE_URL.replace(/\/+$/, '');
export const ROOT_DIR = ROOT;