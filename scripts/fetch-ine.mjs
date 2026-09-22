#!/usr/bin/env node
/**
 * Collector del INE (API Tempus3, JSON oficial).
 * Documentación: https://www.ine.es/dyngs/DataLab/manual.html?cid=45
 * Endpoint comprobado: https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/{COD}?date=A:B
 *
 * IPC251856 = "Nacional. Índice general. Variación anual." (verificado 2026-08)
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA_DIR = path.join(ROOT, 'data');
const RETRIEVED_AT = new Date().toISOString();

const SERIES = [
  {
    cod: 'IPC251856',
    id: 'ipc-anual',
    titulo: 'Inflación (IPC): variación anual del índice general',
    unidad: '%',
    categoria: 'vida',
    definicion:
      'Variación porcentual anual del Índice de Precios de Consumo general nacional.',
    metodologia:
      'Serie IPC251856 de la API Tempus3 del INE ("Nacional. Índice general. Variación anual"). Datos mensuales desde 2020.',
    urlFicha:
      'https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1254735939495&p=1254735939495&pagename=ProductosYServicios%2FPYSLayout',
  },
];

async function fetchSerie(cod) {
  const endpoint = `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${cod}?date=20200101:20261231`;
  const res = await fetch(endpoint, {
    headers: { 'User-Agent': 'quien-gana/0.1' },
  });
  if (!res.ok) throw new Error(`INE ${cod}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.Data?.length) throw new Error(`INE ${cod}: sin datos`);
  return { json, endpoint };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

for (const s of SERIES) {
  try {
    const { json, endpoint } = await fetchSerie(s.cod);
    const observaciones = json.Data.map((d) => ({
      periodo: `${MESES[d.FK_Periodo - 1]} ${d.Anyo}`,
      anyo: d.Anyo,
      mes: d.FK_Periodo,
      valor: d.Valor,
    })).sort((a, b) => (a.anyo - b.anyo) || (a.mes - b.mes));

    const doc = {
      id: s.id,
      titulo: s.titulo,
      unidad: s.unidad,
      mock: false,
      importacion: 'automatica',
      categoria: s.categoria,
      definicion: s.definicion,
      metodologia: s.metodologia,
      fuente: {
        nombre: 'INE — Instituto Nacional de Estadística',
        url: s.urlFicha,
        serie: s.cod,
        endpoint,
      },
      actualizado: RETRIEVED_AT,
      observaciones,
    };
    await writeFile(
      path.join(DATA_DIR, `${s.id}.json`),
      JSON.stringify(doc, null, 2) + '\n'
    );
    console.log(`✓ ${s.id}: ${observaciones.length} observaciones (última: ${observaciones.at(-1)?.periodo}, ${observaciones.at(-1)?.valor}%)`);
  } catch (err) {
    console.error(`✗ ${s.id}:`, err.message);
    process.exit(1);
  }
}
console.log(`Collector INE completado (${RETRIEVED_AT})`);
