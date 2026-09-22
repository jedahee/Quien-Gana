#!/usr/bin/env node
/**
 * Collector TED (Tenders Electronic Daily — Diario Oficial de Contratación de la UE).
 * API pública sin autenticación: https://api.ted.europa.eu/v3/notices/search
 *
 * Trae las ADJUDICACIONES españolas (avisos "can-standard" cuyo órgano de
 * contratación es español) publicadas en la última ventana de días.
 * Cobertura: solo contratos sobre los umbrales de publicidad europea —
 * el grueso de la contratación menor solo está en PLACSP (bloqueado por
 * certificado digital; ver DATA_SOURCES.md).
 *
 * Sintaxis aprendida a base de errores del propio API:
 *   operador "=", países ISO-3 ("ESP"), fechas AAAAMMDD o today(-N).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA_DIR = path.join(ROOT, 'data');
const RETRIEVED_AT = new Date().toISOString();
const ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';
const VENTANA_DIAS = 40;
const MAX_PAGES = 12;
const PAGE_SIZE = 250;

/** Los campos llegan como string | array | {idioma:[...]}. Normaliza al primero. */
function pick(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return pick(v[0]);
  if (typeof v === 'object') {
    const pref = v.spa ?? v.eng ?? Object.values(v);
    return Array.isArray(pref) ? String(pref[0] ?? '').trim() : String(pref ?? '').trim();
  }
  return String(v);
}

async function buscar(page) {
  const body = {
    query: `(organisation-country-buyer = "ESP") AND (notice-type = "can-standard") AND (publication-date > today(-${VENTANA_DIAS}))`,
    fields: ['publication-date', 'notice-title', 'buyer-name', 'winner-name', 'total-value', 'total-value-cur', 'winner-country'],
    limit: PAGE_SIZE,
    page,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TED HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

let avisos = [];
let total = null;
for (let page = 1; page <= MAX_PAGES; page++) {
  const j = await buscar(page);
  total = j.totalNoticeCount ?? total;
  avisos.push(...(j.notices ?? []));
  if (!j.notices?.length || (total !== null && page * PAGE_SIZE >= total)) break;
}

const adjudicaciones = avisos.map((n) => {
  const titulo = pick(n['notice-title']);
  // Los acuerdos marco (AM) declaran el TECHO total del acuerdo, no un gasto puntual;
  // cada lote lo repite, así que se contabilizan aparte para no inflar los totales.
  const esMarco = /(acuerdo marco|\bAM\b\s+para|acord marc)/i.test(titulo);
  return {
    expediente: n['publication-number'] ?? '',
    fecha: String(n['publication-date'] ?? '').slice(0, 10),
    titulo,
    tipo: esMarco ? 'techo-acuerdo-marco' : 'adjudicacion',
    comprador: pick(n['buyer-name']),
    adjudicataria: pick(n['winner-name']),
    paisAdjudicataria: pick(n['winner-country']) || null,
    importeEur: (() => {
      const cur = pick(n['total-value-cur']);
      const val = Number(pick(n['total-value']));
      return cur.toUpperCase() === 'EUR' && Number.isFinite(val) ? val : null;
    })(),
    url: n['publication-number']
      ? `https://ted.europa.eu/en/notice/-/detail/${n['publication-number']}`
      : null,
  };
}).sort((a, b) => (b.importeEur ?? 0) - (a.importeEur ?? 0));

// --- Agregados ---------------------------------------------------------------
const conImporte = adjudicaciones.filter((a) => a.importeEur != null);
const contratos = conImporte.filter((a) => a.tipo === 'adjudicacion');
const marcos = conImporte.filter((a) => a.tipo === 'techo-acuerdo-marco');
const sumaPor = (lista, clave) => {
  const m = new Map();
  for (const a of lista) {
    const k = a[clave];
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + a.importeEur);
  }
  return [...m.entries()]
    .map(([nombre, importe]) => ({ nombre, importeMillones: Math.round(importe / 1e5) / 10 }))
    .sort((a, b) => b.importeMillones - a.importeMillones);
};

const fechas = adjudicaciones.map((a) => a.fecha).filter(Boolean).sort();
const mM = (lista) => Math.round(lista.reduce((s, a) => s + a.importeEur, 0) / 1e5) / 10;
const doc = {
  id: 'contratos-ted',
  titulo: 'Adjudicaciones españolas notificadas a TED (últimas semanas)',
  unidad: 'EUR',
  mock: false,
  importacion: 'automatica',
  categoria: 'dinero',
  definicion: `Contratos públicos españoles adjudicados y notificados al Diario Oficial Europeo (TED) como "contract award notices" estándar, publicados en los últimos ${VENTANA_DIAS} días.`,
  metodologia: 'API pública v3 de TED (sin credenciales). Cobertura parcial: solo contratos sobre umbrales de publicidad europea; la contratación menor española vive en PLACSP (acceso bloqueado por certificado digital). Importes solo cuando el aviso los declara en EUR.',
  fuente: {
    nombre: 'TED — Tenders Electronic Daily (Publications Office of the EU)',
    url: 'https://ted.europa.eu/',
    endpoint: ENDPOINT,
  },
  actualizado: RETRIEVED_AT,
  observaciones: [],
  ventana: {
    dias: VENTANA_DIAS,
    desde: fechas[0] ?? null,
    hasta: fechas.at(-1) ?? null,
    avisosTotalesVentana: total ?? null,
    descargados: adjudicaciones.length,
    conImporteConocido: conImporte.length,
  },
  resumen: {
    nContratos: contratos.length,
    importeContratosMillones: mM(contratos),
    nMarcos: marcos.length,
    techoMarcosMillones: mM(marcos),
    topAdjudicatarias: sumaPor(contratos, 'adjudicataria').slice(0, 12),
    topCompradores: sumaPor(contratos, 'comprador').slice(0, 10),
    topMarcos: sumaPor(marcos, 'adjudicataria').slice(0, 6),
  },
  adjudicaciones: adjudicaciones.slice(0, 900),
};

await writeFile(path.join(DATA_DIR, 'contratos-ted.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(`✓ contratos-ted.json: ${contratos.length} contratos (${mM(contratos).toLocaleString('es-ES')} M€) + ${marcos.length} techos de acuerdos marco (${mM(marcos).toLocaleString('es-ES')} M€) en ${VENTANA_DIAS} días`);
