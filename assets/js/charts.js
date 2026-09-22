/* ¿Quién Gana? — gráficos SVG sin dependencias.
   Cada gráfico incluye una tabla accesible alternativa (details > table)
   y tooltips flotantes al pasar el ratón. Las series mensuales/trimestrales
   largas se agregan a medias anuales para legibilidad; la tabla conserva
   siempre la serie completa. */
let tipEl = null;
function ensureTip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tip';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
function bindTip(el, html) {
  el.addEventListener('mouseenter', () => { const t = ensureTip(); t.innerHTML = html; t.classList.add('show'); });
  el.addEventListener('mousemove', (e) => { const t = ensureTip(); t.style.left = e.clientX + 'px'; t.style.top = e.clientY + 'px'; });
  el.addEventListener('mouseleave', () => { ensureTip().classList.remove('show'); });
}

const nfEs = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** Agrega una serie larga a media por año. Requiere año deducible de p.year o del inicio de p.x. */
function aggregateYearly(points) {
  const m = new Map();
  for (const p of points) {
    const key = p.year != null ? String(p.year) : (/^\d{4}/.test(String(p.x)) ? String(p.x).slice(0, 4) : null);
    if (!key) return null;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(Number(p.y));
  }
  return [...m.entries()]
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([y, arr]) => ({ x: y, y: arr.reduce((a, b) => a + b, 0) / arr.length }));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtEs(v) { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(v); }
function fmtInt(v) { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v); }

/** Varias series en un solo gráfico, INDEXADAS al primer año común (= 100),
 *  para comparar tendencias con unidades distintas sin engañar con dobles ejes. */
export function renderIndexedChart(container, { series, title }) {
  if (!container || !series?.length || series.some(s => !s.points?.length)) return;
  const comunes = series.map(s => s.points.map(p => String(p.x)))
    .reduce((a, b) => a.filter(x => b.includes(x)))
    .sort((a, b) => Number(a) - Number(b));
  if (comunes.length < 3) return;

  const idx = series.map(s => {
    const mapa = new Map(s.points.map(p => [String(p.x), Number(p.y)]));
    const base = mapa.get(comunes[0]);
    return { name: s.name, color: s.color || 'var(--primary)', vals: comunes.map(x => (mapa.get(x) / base) * 100) };
  });

  const W = 720, H = 300, padL = 52, padB = 34, padT = 14, padR = 12;
  const iw = W - padL - padR, ih = H - padT - padB;
  const todos = idx.flatMap(s => s.vals);
  const max = Math.max(...todos), min = Math.min(...todos);
  const lo = Math.min(0, min) - (max - Math.min(0, min)) * .06, hi = max + (max - min) * .08;
  const px = i => padL + (iw * i) / (comunes.length - 1);
  const py = v => padT + ih - ((v - lo) / (hi - lo)) * ih;

  const paths = idx.map(s => ({
    d: s.vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(''),
    s,
  }));
  const showDots = comunes.length <= 18;
  const dots = paths.flatMap(({ s }) => showDots
    ? s.vals.map((v, i) =>
        `<circle class="dot" cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="4" fill="${s.color}" data-tip="<b>${esc(comunes[i])}</b><br>${esc(s.name)}: <b>${fmtInt(v)}</b> (base 100)">`
      ).join('')
    : '').join('');
  const hits = comunes.map((x, i) =>
    `<circle cx="${px(i).toFixed(1)}" cy="${padT + ih / 2}" r="26" fill="transparent" style="cursor:crosshair" data-tip="<b>${esc(x)}</b>${idx.map(s => `<br>${esc(s.name)}: <b>${fmtInt(s.vals[i])}</b>`).join('')}">`
  ).join('');

  const step = comunes.length <= 16 ? 1 : Math.ceil(comunes.length / 8);
  const labelsX = comunes.map((x, i) => i % step === 0
    ? `<text x="${px(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(x)}</text>` : '').join('');
  const leyenda = idx.map(s =>
    `<span style="--c:${s.color}"><i></i>${esc(s.name)} · ${fmtInt(s.vals.at(-1))}</span>`).join('');
  const refLine = `<line class="axis-line" x1="${padL}" y1="${py(100)}" x2="${W - padR}" y2="${py(100)}" stroke-dasharray="4 4"/><text x="${padL - 6}" y="${py(100) + 4}" text-anchor="end">100</text>`;
  const gridTop = `<line class="axis-line" x1="${padL}" y1="${py(hi * .97)}" x2="${W - padR}" y2="${py(hi * .97)}"/><text x="${padL - 6}" y="${py(hi * .97) + 4}" text-anchor="end">${fmtInt(hi * .97)}</text>`;
  const gridBot = `<line class="axis-line" x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}"/><text x="${padL - 6}" y="${padT + ih + 4}" text-anchor="end">${fmtInt(lo)}</text>`;

  container.innerHTML = `
    <div class="ml-legend">${leyenda}</div>
    <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(title)}. Gráfico de líneas múltiples indexadas al primer año común = 100.">
      ${refLine}${gridTop}${gridBot}
      ${paths.map(p => `<path d="${p.d}" fill="none" stroke="${p.s.color}" stroke-width="2.6"/>`).join('')}
      ${dots}${hits}${labelsX}
    </svg>
    <details class="data-table">
      <summary>Ver los datos en formato tabla (índice ${esc(comunes[0])} = 100)</summary>
      <table class="data-table">
        <caption>${esc(title)}</caption>
        <thead><tr><th scope="col">Año</th>${idx.map(s => `<th scope="col">${esc(s.name)}</th>`).join('')}</tr></thead>
        <tbody>${comunes.map((x, i) => `<tr><td>${esc(x)}</td>${idx.map(s => `<td>${fmtInt(s.vals[i])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </details>`;

  container.querySelectorAll('[data-tip]').forEach((c) => bindTip(c, c.getAttribute('data-tip')));
}

export function renderBarChart(container, { labels, values, unit = '', title }) {
  if (!container) return;
  if (!labels.length || !values.length || values.some(v => !isFinite(Number(v)))) {
    container.innerHTML = '<div class="pending-box"><strong>Dato no disponible todavía.</strong><br><span style="color:var(--muted)">Este gráfico se mostrará cuando existan cifras verificadas.</span></div>';
    return;
  }
  const W = 720, H = 300, padL = 56, padB = 34, padT = 14, padR = 10;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...values) * 1.06;
  const n = values.length;
  const gap = 8;
  const bw = Math.min(64, (iw - gap * (n - 1)) / n);

  let bars = '';
  values.forEach((v, i) => {
    const h = v <= 0 ? 0 : Math.max(2, (v / max) * ih);
    const x = padL + i * ((iw + gap) / n);
    const y = padT + ih - h;
    bars += `<rect class="bar" role="img" aria-label="${esc(labels[i])}: ${fmtEs(v)} ${esc(unit)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"><title>${esc(labels[i])}: ${fmtEs(v)} ${esc(unit)}</title></rect>`;
    if (bw >= 30 || i % 2 === 0) {
      bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(labels[i])}</text>`;
      bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-weight="700">${fmtInt(v)}</text>`;
    }
  });

  const grid = [0, .5, 1].map(t => {
    const y = padT + ih * (1 - t);
    return `<line class="axis-line" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>
            <text x="${padL - 6}" y="${y + 4}" text-anchor="end">${fmtInt(max * t)}</text>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(title)}. Gráfico de barras. Pasa el ratón sobre las barras para ver cada valor.">
      <line class="axis-line" x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}"/>
      ${grid}${bars}
    </svg>
    <details class="data-table">
      <summary>Ver los datos en formato tabla</summary>
      <table class="data-table">
        <caption>${esc(title)}</caption>
        <thead><tr><th scope="col">Periodo</th><th scope="col">Valor (${esc(unit)})</th></tr></thead>
        <tbody>${labels.map((l, i) => `<tr><td>${esc(l)}</td><td>${fmtEs(values[i])}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;

  container.querySelectorAll('.bar').forEach((rect, i) => {
    bindTip(rect, `<b>${esc(labels[i])}</b><br><b>${fmtInt(values[i])}</b> ${esc(unit)}`);
  });
}

export function renderLineChart(container, { points, fullPoints = null, unit = '', title }) {
  // points: [{x: etiqueta, y: valor, year?: número}]
  if (!container || !points.length || points.some(p => !isFinite(Number(p.y)))) return;

  let shown = points;
  let aggregated = false;
  if (points.length > 26) {
    const agg = aggregateYearly(points);
    if (agg && agg.length >= 3) { shown = agg; aggregated = true; }
  }

  const W = 720, H = 300, padL = 52, padB = 34, padT = 14, padR = 12;
  const iw = W - padL - padR, ih = H - padT - padB;
  const ys = shown.map(p => Number(p.y));
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  const lo = min - span * .08, hi = max + span * .08;

  const px = i => padL + (iw * i) / Math.max(1, shown.length - 1);
  const py = v => padT + ih - ((v - lo) / (hi - lo)) * ih;

  let path = '';
  shown.forEach((p, i) => { path += `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`; });

  const tipFor = (p) => `<b>${esc(p.x)}</b><br><b>${fmtEs(p.y)}</b> ${esc(unit)}`;

  const showDots = shown.length <= 18;
  const dots = showDots
    ? shown.map((p, i) =>
        `<circle class="dot" cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="4" data-tip="${esc(tipFor(p))}"><title>${esc(p.x)}: ${fmtEs(p.y)} ${esc(unit)}</title></circle>`
      ).join('')
    : '';
  const hits = shown.map((p, i) =>
    `<circle cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="12" fill="transparent" style="cursor:crosshair" data-tip="${esc(tipFor(p))}"></circle>`
  ).join('');

  const step = Math.ceil(shown.length / 8);
  const labelsX = shown.map((p, i) => i % step === 0
    ? `<text x="${px(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(p.x)}</text>` : '').join('');

  const [g0, g1] = [lo + (hi - lo) * .15, hi - (hi - lo) * .05];
  const tabla = fullPoints || points;

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(title)}. Gráfico de líneas. Pasa el ratón sobre los puntos para ver cada valor.">
      <line class="axis-line" x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}"/>
      <line class="axis-line" x1="${padL}" y1="${py(g0)}" x2="${W - padR}" y2="${py(g0)}"/>
      <text x="${padL - 6}" y="${py(g1) + 4}" text-anchor="end">${fmtEs(g1)}</text>
      <text x="${padL - 6}" y="${py(g0) + 4}" text-anchor="end">${fmtEs(g0)}</text>
      <path class="line-path" d="${path}"/>
      ${dots}${hits}${labelsX}
    </svg>
    <details class="data-table">
      <summary>Ver la serie completa en formato tabla (${tabla.length} observaciones${aggregated ? '; el gráfico muestra medias anuales' : ''})</summary>
      <table class="data-table">
        <caption>${esc(title)}</caption>
        <thead><tr><th scope="col">Periodo</th><th scope="col">Valor (${esc(unit)})</th></tr></thead>
        <tbody>${tabla.map(p => `<tr><td>${esc(p.x)}</td><td>${fmtEs(p.y)}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;

  container.querySelectorAll('[data-tip]').forEach((c) => bindTip(c, c.getAttribute('data-tip')));
}
