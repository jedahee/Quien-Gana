#!/usr/bin/env node
/**
 * Regenera sitemap.xml y robots.txt desde scripts/pages.mjs (registro único)
 * usando la SITE_URL de scripts/env.mjs (.env si existe).
 * Uso: node scripts/build-sitemap.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL, PAGES } from './pages.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const urls = [...PAGES]
  .sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url < b.url ? -1 : 1))
  .map((p) =>
    `  <url><loc>${SITE_URL}${p.url}</loc><lastmod>${p.lastmod}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority.toFixed(1)}</priority></url>`
  )
  .join('\n');

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `${urls}\n` +
  `</urlset>\n`;

await writeFile(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`✓ sitemap.xml: ${PAGES.length} URLs -> ${SITE_URL}`);

const robots =
  `# ¿Quién Gana? — robots.txt\n` +
  `# Todo el sitio es público y estático: no hay nada que bloquear.\n` +
  `# Los datos en /data/ son JSON consumidos por el propio sitio; se permiten.\n` +
  `\n` +
  `User-agent: *\n` +
  `Allow: /\n` +
  `\n` +
  `# Sitemap (regenerado con: node scripts/build-sitemap.mjs)\n` +
  `Sitemap: ${SITE_URL}/sitemap.xml\n`;

await writeFile(path.join(ROOT, 'robots.txt'), robots);
console.log(`✓ robots.txt: Sitemap: ${SITE_URL}/sitemap.xml`);