#!/usr/bin/env node
/**
 * Ejecuta todos los collectors en orden y regenera el índice de búsqueda.
 * Uso: node scripts/update-all.mjs
 */
import { spawn } from 'node:child_process';

const steps = [
  'scripts/fetch-ine.mjs',
  'scripts/fetch-eurostat.mjs',
  'scripts/build-search-index.mjs',
];

for (const step of steps) {
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [step], { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${step} falló (${code})`))));
  });
}
console.log('Actualización completada: SUCCESS');
