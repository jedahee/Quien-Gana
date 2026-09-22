/* ¿Quién Gana? — bloque filosofía del proyecto:
   BANDA DE IMPACTO (contador en vivo) · QUIÉN PAGA (tu bolsillo) ·
   QUIÉN GANA (beneficiario) · QUÉ PODRÍAS HACER (equivalencias).
   Todos los números se calculan en vivo desde data/poblacion.json y
   data/referencias-equivalencias.json para no duplicar cifras hardcodeadas. */
import { QG } from './data.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Rellena `el` con banda de impacto + tres tarjetas. Opciones:
 *  - gastoMillones: cifra anual oficial en M€ (obligatorio)
 *  - etiquetaPaga: contexto bajo las cifras (p. ej. "Créditos liquidados de Defensa · 2025")
 *  - quienGanaHtml: contenido HTML de la tarjeta central (título fijo QUIÉN GANA)
 *  - mostrarEquivalencias: true por defecto
 */
export async function renderDuo(el, { gastoMillones, etiquetaPaga = '', quienGanaHtml = '', mostrarEquivalencias = true, mostrarContador = true }) {
  if (!el || !isFinite(Number(gastoMillones))) return;
  const gastoEuros = Number(gastoMillones) * 1e6;

  const pobDoc = await QG.loadJSON(QG.dataUrl('poblacion.json')).catch(() => null);
  const refDoc = await QG.loadJSON(QG.dataUrl('referencias-equivalencias.json')).catch(() => null);

  const hab = pobDoc?.observaciones?.at(-1)?.valor ?? null;
  const pv = refDoc?.valores?.precio_vivienda_media?.valor ?? 234450;
  const sm = refDoc?.valores?.salario_medio_anual?.valor ?? 29540.26;

  const perHab = hab ? gastoEuros / hab : null;
  const diasTrabajo = (perHab != null && sm) ? Math.round((perHab * 365) / sm) : null;

  const eqViv = Math.floor(gastoEuros / pv);
  const eqSal = Math.floor(gastoEuros / sm);
  const perSec = gastoEuros / (365 * 24 * 3600);

  const fmt0 = (v) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v);
  const fmt2 = (v) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v);

  el.innerHTML = `
    ${mostrarContador ? `
    <div class="duo-impact">
      <span class="duo-impact-label">⏱️ Mientras lees esta página, este gasto ya suma en toda España:</span>
      <span class="duo-impact-num">0 €</span>
      <small>≈ ${fmt2(perSec)} € cada segundo, día y noche · dato oficial anual proyectado al tiempo real que llevas aquí. Sigue contando mientras navegas.</small>
    </div>` : ''}

    <div class="duo">
      <div class="duo-card pay">
        <h3><span class="ico">💸</span> Quién paga</h3>
        ${perHab != null ? `
        <span class="big">${fmt0(perHab)} €</span>
        <p><strong>al año por cada ciudadano</strong>, salidos directamente de tus impuestos</p>
        ${diasTrabajo != null ? `
        <span class="big mid">≈ ${fmt0(diasTrabajo)} días de trabajo</span>
        <p>con un salario medio: eso trabaja un asalariado al año solo para financiar este gasto</p>` : ''}
        ${etiquetaPaga ? `<p class="src">${esc(etiquetaPaga)}</p>` : ''}` : ''}
      </div>

      <div class="duo-card win">
        <h3><span class="ico">🏭</span> Quién gana</h3>
        ${quienGanaHtml || '<p>Empresas adjudicatarias del gasto público.</p>'}
      </div>

      ${mostrarEquivalencias ? `
      <div class="duo-card alt">
        <h3><span class="ico">🏥</span> Qué podrías hacer</h3>
        <span class="big">${fmt0(eqViv)}</span>
        <p><strong>viviendas medias</strong> (~234.450 € cada una)</p>
        <span class="big mid">${fmt0(eqSal)}</span>
        <p><strong>salarios medios anuales</strong> (29.540 €)</p>
      </div>` : ''}
    </div>
  `;

  const numEl = mostrarContador ? el.querySelector('.duo-impact-num') : null;
  const t0 = performance.now();
  if (numEl && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const tick = () => {
      numEl.textContent = fmt0(Math.max(0, (performance.now() - t0) / 1000 * perSec)) + ' €';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else if (numEl) {
    numEl.textContent = `${fmt0(perSec)} €/segundo`;
  }
}
