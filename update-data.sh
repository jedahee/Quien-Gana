#!/usr/bin/env bash
# =============================================================================
# ¿QUIÉN GANA? — Actualización completa de datos (para cron del servidor)
#
#   ./update-data.sh            # actualiza todo y valida
#   ./update-data.sh --check    # solo valida, no descarga nada
#
# QUÉ HACE:
#   1. Copia de seguridad de data/ (restauración automática si algo falla)
#   2. Descarga de series automáticas: INE (IPC) + Eurostat (7 datasets)
#   3. Los datasets "manuales" (Defensa liquidada, PGE, Ucrania, Israel,
#      referencias Idealista/salarios) NO tienen API pública estable:
#      se comprueba su presencia y frescura y se AVISA si conviene revisarlos.
#      → Para automatizarlos en el futuro, añadir su collector en el PASO 2.
#   4. Valida TODOS los JSON (sintaxis, duplicados, valores numéricos).
#      Si una descarga dejó un fichero corrupto, se restaura desde el backup
#      automáticamente: la web nunca queda rota.
#   5. Regenera el índice de búsqueda.
#
# GARANTÍA: la web es estática; tras este script basta con republicar el
# directorio. Las gráficas, contadores y veredictos leen los JSON al cargar,
# así que nuevos años/cifras aparecen solos sin tocar HTML/JS.
#
# CRON SUGERIDO (diario 05:15) — crontab -e
#   15 5 * * * cd /ruta/a/quien-gana && ./update-data.sh >> /var/log/qg-update.log 2>&1
#
# Salida: resumen por fichero + RESUMEN final. Exit 0 = web sana.
# =============================================================================
set -u
cd "$(dirname "$0")" || exit 1

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

TMP="$(mktemp -d /tmp/qg-update.XXXXXX)"
LOG="$TMP/update.log"
trap 'rm -rf "$TMP"' EXIT

FALLOS_DUROS=0   # cosas que dejan la web insana
AVISOS=0         # cosas a revisar pero que no rompen nada

say()  { printf '%s\n' "$*"; }
aviso(){ printf '⚠  %s\n' "$*"; AVISOS=$((AVISOS+1)); }

if [ ! -f package.json ]; then say "ERROR: ejecuta desde la raíz del proyecto"; exit 1; fi
command -v node >/dev/null 2>&1 || { say "ERROR: node no está instalado o no está en PATH"; exit 1; }

validar() {
  node scripts/validate-data.mjs | tee "$TMP/validate.out"
  return "${PIPESTATUS[0]}"
}

restaurar_invalidos() {
  local restaurados=0 fichero
  while IFS= read -r linea; do
    fichero="$(printf '%s' "$linea" | awk '{print $2}')"
    if [ -f "$DATA_BAK/$fichero" ]; then
      cp "$DATA_BAK/$fichero" "data/$fichero"
      say "   ↩ restaurado desde backup: $fichero"
      restaurados=$((restaurados+1))
    else
      aviso "$fichero inválido y SIN backup para restaurar — revisar a mano"
    fi
  done < <(grep '^INVALID\|^MISSING' "$TMP/validate.out" || true)
}

say "=== ¿Quién Gana? · actualización de datos $(date '+%F %T') ==="

# --- PASO 0: validación previa (estado de partida debe ser sano) ------------
mkdir -p /tmp/qg-bak-$$$$
cp -r data "/tmp/qg-bak-$$$$/data"
DATA_BAK="/tmp/qg-bak-$$$$/data"
say "▶ Backup previo en $DATA_BAK"

if ! validar >/dev/null 2>&1; then
  aviso "el estado PREVIO ya tenía problemas; continúo igualmente (la descarga puede arreglarlos)"
fi

if [ "$CHECK_ONLY" = "1" ]; then
  validar || FALLOS_DUROS=$((FALLOS_DUROS+1))
  say "=== --check terminado (fallos duros: $FALLOS_DUROS · avisos: $AVISOS) ==="
  exit "$([ "$FALLOS_DUROS" -eq 0 ] && echo 0 || echo 1)"
fi

# --- PASO 1: collectors automáticos -----------------------------------------
run_step() {
  local nombre="$1"; shift
  say "▶ $nombre"
  if node "$@" >>"$LOG" 2>&1; then
    say "✔ $nombre OK"
  else
    say "✖ $nombre FALLÓ (detalle en $LOG)"
    aviso "$nombre falló; se mantienen/restauran los datos anteriores"
  fi
}

run_step "INE · IPC anual"            scripts/fetch-ine.mjs
run_step "Eurostat · 7 series oficiales" scripts/fetch-eurostat.mjs
run_step "TED · adjudicaciones públicas ES" scripts/fetch-ted.mjs
run_step "AEAT · detector grandes deudores" scripts/fetch-grandesdeudores.mjs

if grep -q '"cambioDetectado": true' data/grandes-deudores.json 2>/dev/null; then
  say "⚠ MANUAL RECOMENDADO: la AEAT ha publicado una NUEVA EDICIÓN del listado de grandes deudores — actualizar data/grandes-deudores.json a mano"
  AVISOS=$((AVISOS+1))
fi

# PASO 2 futuro: los 7 datasets manuales NO tienen vía automática hoy (sondeado
# 2026-08-25, ver DATA_SOURCES.md §3): IGAE y trabajo.gob.es inaccesibles desde
# el servidor, presupuesto.gob.es caído, Kiel requiere parser XLSX, INE no
# expone tablas EAES, Centre Delàs/Idealista son PDF/portal. Reintentar si:
#   run_step "IGAE liquidados Defensa" scripts/fetch-defensa.mjs   (si igae responde)
#   run_step "PLACSP adjudicaciones"   scripts/fetch-placsp.mjs    (requiere certificado)

# --- PASO 3: validar estado nuevo; restaurar lo corrupto --------------------
say "▶ Validando datos descargados..."
if validar; then
  say "✔ Todos los JSON válidos"
else
  say "⚠ Hay ficheros inválidos tras la descarga — restaurando desde backup"
  rm -rf /tmp/qg-restaurar; mkdir -p /tmp/qg-restaurar
  cp -r "$DATA_BAK" /tmp/qg-restaurar/data.bak
  DATA_BAK="/tmp/qg-restaurar/data.bak"
  restaurar_invalidos || true
  if validar; then
    say "✔ Estado recuperado: todos los JSON válidos tras restauración"
  else
    say "✖ Estado INSANO incluso tras restaurar — NO publicar esta actualización"
    FALLOS_DUROS=$((FALLOS_DUROS+1))
  fi
fi

rm -rf /tmp/qg-bak-$$$$ /tmp/qg-restaurar 2>/dev/null

# --- PASO 4: avisos de frescura (automáticos parados + manuales viejos) -----
while IFS= read -r linea; do
  case "$linea" in
    STALE*) aviso "${linea#STALE }" ;;
  esac
done < "$TMP/validate.out"
aviso_recuerda=0
for f in gasto-defensa pge-partidas ucrania-ayudas israel-material referencias-equivalencias vivienda-referencias salarios-eaes; do
  if [ -f "data/$f.json" ]; then
    fecha="$(node -e 'try{console.log(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).actualizado||"").slice(0,10))}catch(e){console.log("")}' "data/$f.json")"
    [ -z "$fecha" ] && continue
    dias=$(( ( $(date +%s) - $(date -d "$fecha" +%s 2>/dev/null || echo 0) ) / 86400 ))
    if [ "$dias" -gt 90 ]; then
      say "⚠ MANUAL RECOMENDADO: data/$f.json lleva $dias días sin revisión (fuente sin API)"
      AVISOS=$((AVISOS+1))
    fi
  fi
done

# --- PASO 5: índice de búsqueda ---------------------------------------------
run_step "Índice de búsqueda" scripts/build-search-index.mjs

say "============================================================="
if [ "$FALLOS_DUROS" -eq 0 ]; then
  say "✔ ACTUALIZACIÓN SANA (avisos no bloqueantes: $AVISOS)"
  say "  Siguiente paso en local: nada más (recarga el navegador)."
  say "  En servidor: republica el directorio (rsync/git) con estos data/."
  exit 0
else
  say "✖ ACTUALIZACIÓN CON PROBLEMAS ($FALLOS_DUROS) — revisa $LOG"
  exit 1
fi
