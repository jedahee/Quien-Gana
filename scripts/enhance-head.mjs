#!/usr/bin/env node
/**
 * Mantenimiento de <head> en TODAS las páginas del sitio (idempotente):
 *  1. Corrige rutas relativas de favicon / apple-touch-icon (bug preexistente:
 *     en subpáginas apuntaban a ./assets/ → 404; ya que solo el CSS usaba ../).
 *  2. Añade metas PWA (manifest, apple-mobile-web-app-*, mobile-web-app-capable),
 *     theme-color oscuro, OpenGraph (site_name, locale, type) y Twitter cards.
 *  3. Añade viewport-fit=cover para móviles con notch / safe-area.
 *  Re-ejecución segura: si ya existe rel="manifest", solo repara iconos.
 *  Uso: node scripts/enhance-head.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

import { SITE_URL } from './env.mjs';
const SITE = SITE_URL;
const OG_IMAGE = `${SITE}/assets/img/og-preview.png`;

const sha = (p) => createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 10);
const CSS_HASH = sha(path.join(ROOT, 'assets/css/main.css'));
const JS_HASH = sha(path.join(ROOT, 'assets/js/main.js'));
const MANIFEST_HASH = sha(path.join(ROOT, 'site.webmanifest'));

function collect(dir = ROOT, depth = 0, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, depth + 1, out);
    else if (entry.name === 'index.html') out.push({ file: full, depth });
  }
  return out;
}

const prefixOf = (depth) => (depth === 0 ? './' : '../'.repeat(depth));

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

async function processHTML({ file, depth }) {
  let html = await readFile(file, 'utf8');
  const prefix = prefixOf(depth);

  // 1) Reparar iconos: href="./assets/  ->  href="{prefix}assets/"
  html = html.replace(/href="\.\/assets\/img\/(favicon|apple-touch-icon)[^"]*"/g,
    (m) => m.replace('href="./assets/', `href="${prefix}assets/`));

  // 2) Metas
  const hasManifest = /rel="manifest"/.test(html);
  if (!hasManifest) {
    const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || '¿Quién Gana?';
    const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
    const hasOgType = /property="og:type"/.test(html);
    const hasTwitterCard = /name="twitter:card"/.test(html);

    const add = [
      `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#101214">`,
      `<meta name="mobile-web-app-capable" content="yes">`,
      `<meta name="apple-mobile-web-app-capable" content="yes">`,
      `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
      `<meta name="apple-mobile-web-app-title" content="¿Quién Gana?">`,
      `<meta property="og:site_name" content="¿Quién Gana? — ¿Y quién acaba pagando?">`,
      `<meta property="og:locale" content="es_ES">`,
      hasOgType ? '' : `<meta property="og:type" content="website">`,
      hasTwitterCard ? '' : `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeAttr(title)}">`,
      desc ? `<meta name="twitter:description" content="${escapeAttr(desc)}">` : '',
      `<meta name="twitter:image" content="${OG_IMAGE}">`,
      `<link rel="manifest" href="${prefix}site.webmanifest">`,
    ].filter(Boolean).join('\n');

    html = html.replace(
      '<meta name="theme-color" content="#c1121f">',
      '<meta name="theme-color" content="#c1121f">\n' + add
    );
  }

  // 3) viewport-fit=cover (solo si aún no está)
  html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  );

  // 4) Reescritura del dominio canónico: reemplaza la URL SITE anterior (o la
  //    acumulada en el HTML) por la SITE_URL vigente de .env. Idempotente: si
  //    ya coincide, no cambia nada.
  const before = html;
  html = html.replaceAll('https://www.quiengana.es', SITE);
  if (html !== before) rewrites += 1;

  // 5) Cache-busting por hash de contenido (assets con ?v= derivado del archivo)
  html = html.replace(/(assets\/css\/main\.css)(?:\?[^"']*)?/g, `$1?v=${CSS_HASH}`);
  html = html.replace(/(assets\/js\/main\.js)(?:\?[^"']*)?/g, `$1?v=${JS_HASH}`);
  html = html.replace(/(site\.webmanifest)(?:\?[^"']*)?/g, `$1?v=${MANIFEST_HASH}`);

  await writeFile(file, html);
  return { file, depth, prefixed: !hasManifest };
}

const pages = collect();
let fixed = 0, meta = 0, rewrites = 0;
for (const p of pages) {
  const r = await processHTML(p);
  fixed += 1;
  if (r.prefixed) meta += 1;
}
console.log(`✓ enhance-head: ${fixed} páginas procesadas (${meta} con metas PWA añadidas, ${rewrites} con dominio canónico reescrito), cache-bust v=${CSS_HASH.slice(0,7)}`);