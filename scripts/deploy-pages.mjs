#!/usr/bin/env node
/* Deploy a GitHub Pages con whitelist estricta de archivos públicos.
 *
 * Qué hace:
 *  1. Valida que haya remote origin y al menos un commit en la rama actual.
 *  2. Regenera sitemap, robots y heads (metas + cache-busting) con SITE_URL de .env.
 *  3. Copia SOLO lo público a un directorio staging y lo sube a la rama gh-pages
 *     (/reponame/ en GitHub Pages) sin tocar nada más del repo.
 *
 * Qué NUNCA sube: scripts/, node_modules/, .env*, *.md, package.json,
 * .gitignore, update-data.sh, documentación interna, logs, etc.
 *
 * Uso:
 *   node scripts/deploy-pages.mjs            # deploy real
 *   node scripts/deploy-pages.mjs --dry-run  # solo prepara y muestra entrada/salida
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT_DIR, SITE_URL } from './env.mjs';

const DRY = process.argv.includes('--dry-run');
const WORKTREE = '/tmp/quiengana-gh-pages';

const PUBLIC_DIRS = [
  'analisis', 'assets', 'data', 'democracia', 'dinero', 'empresa',
  'fuentes', 'guerra', 'metodologia', 'verificador', 'vida',
];
const PUBLIC_FILES = [
  'index.html', 'sw.js', 'site.webmanifest', 'robots.txt', 'sitemap.xml',
];

const sh = (cmd) => execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });
const shQuiet = (cmd) => execSync(cmd, { cwd: ROOT_DIR, stdio: 'pipe' }).toString().trim();

function log(step, msg) { console.log(`\n\x1b[36m${step}\x1b[0m ${msg}`); }

/* ---- 1) Comprobaciones del repo ---- */
log('Verificando', 'remote origin y commit base…');
try { shQuiet('git remote get-url origin'); }
catch { console.error('\x1b[31m✗ No hay remote "origin". Crea el repo GitHub primero:\x1b[0m\n  gh repo create quien-gana --public --source . --push\n'); process.exit(1); }
try { shQuiet('git rev-parse HEAD'); }
catch { console.error('\x1b[31m✗ No hay commits aún. Haz el commit inicial:\x1b[0m\n  git add . && git commit -m "Inicial"\n'); process.exit(1); }

if (!DRY) {
  log('Build', 'regenerando sitemap / robots / heads…');
  sh('node scripts/build-sitemap.mjs');
  sh('node scripts/build-search-index.mjs');
  sh('node scripts/enhance-head.mjs');
}

/* ---- 2) Staging ---- */
log('Staging', `montando carpeta pública → ${WORKTREE}`);
await rm(WORKTREE, { recursive: true, force: true });
await mkdir(WORKTREE, { recursive: true });
for (const dir of PUBLIC_DIRS) {
  const src = path.join(ROOT_DIR, dir);
  if (!existsSync(src)) continue;
  await cp(src, path.join(WORKTREE, dir), { recursive: true });
}
for (const file of PUBLIC_FILES) {
  const src = path.join(ROOT_DIR, file);
  if (existsSync(src)) await cp(src, path.join(WORKTREE, file));
}
await writeFile(path.join(WORKTREE, '.nojekyll'), '');

/* 404 para GitHub Pages: redirige a la home del sitio (no depende de la URL). */
await writeFile(path.join(WORKTREE, '404.html'),
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./">
<title>404 — ¿Quién Gana?</title><h1>Página no encontrada</h1>
<p>Redirigiendo a la portada…</p><script>location.replace('./')</script>`);
const staged = readdirSync(WORKTREE).length;
const sizes = (p) => {
  let n = 0;
  const walk = (d) => { for (const e of readdirSync(d)) { const f = path.join(d, e); n += statSync(f).isDirectory() ? walk(f) : statSync(f).size; } return n; };
  return walk(p);
};
console.log(`  ${staged} elementos, ${(sizes(WORKTREE) / 1024 / 1024).toFixed(2)} MiB`);

if (DRY) {
  console.log('\n\x1b[33m[Dry-run] staging listo en ' + WORKTREE + '. Nada se publicó.\x1b[0m');
  process.exit(0);
}

/* ---- 3) Worktree en la rama gh-pages ---- */
log('git', 'rama gh-pages (worktree)…');
try { shQuiet(`git worktree add --detach ${WORKTREE} --orphan gh-pages`); }
catch { shQuiet('git worktree prune'); shQuiet(`git worktree add --detach ${WORKTREE} --orphan gh-pages`); }

const GIT = `-C ${WORKTREE}`;
sh(`git ${GIT} add -A`);
sh(`git ${GIT} -c user.name='deploy' -c user.email='deploy@localhost' commit --allow-empty -m "Deploy ${new Date().toISOString()} (${SITE_URL})"`);
sh(`git ${GIT} branch -M gh-pages`);
sh(`git ${GIT} push --force origin gh-pages`);
shQuiet(`git worktree prune`);

log('Hecho', `publicado en gh-pages → ${SITE_URL}`);