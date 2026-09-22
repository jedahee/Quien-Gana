/* ¿Quién Gana? — contadores.
   Regla del proyecto: nunca fingir datos en tiempo real. Los contadores
   interpolan una cifra anual oficial y SIEMPRE muestran la nota de método. */
import { QG } from './data.js';

/** Anima un número desde 0 hasta target cuando entra en pantalla. */
export function animateNumber(el, target, { duration = 1100, decimals = 0 } = {}) {
  if (!el) return;
  const fmt = (v) => new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(v);

  if (QG.reducedMotion) { el.textContent = fmt(target); return; }

  const obs = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return;
    obs.disconnect();
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: .35 });
  obs.observe(el);
}

/**
 * Contador "ritmo por segundo" a partir de una cifra anual oficial.
 * totalAnual en euros; segundos del periodo = 365*24*3600 (o bisiesto).
 */
export function perSecondCounter(el, totalAnualEuros, yearSeconds) {
  if (!el) return;
  const rate = totalAnualEuros / yearSeconds;
  el.setAttribute('title', 'Contador calculado a partir de una cifra anual oficial');
  const start = Date.now();

  function render() {
    const elapsed = (Date.now() - start) / 1000;
    // Mostramos el ritmo acumulado dentro de la sesión + ritmo fijo por segundo
    el.textContent = `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(rate)} €/s`;
    if (!QG.reducedMotion && elapsed < 3600) requestAnimationFrame(render);
  }
  render();
}

export const SECONDS_PER_YEAR = 365 * 24 * 3600;
