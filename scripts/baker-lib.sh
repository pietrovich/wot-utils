#!/usr/bin/env bash
# baker-lib.sh — shared build step functions for icon bake scripts.
# Source this file; do not execute it directly.

_CWD=$(pwd)
_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_BASE_DIR="$_LIB_DIR/.."

# Load .env from cwd if present (picks up LOCAL_DEV and similar vars).
if [ -f "$_CWD/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$_CWD/.env"
  set +a
fi

# Resolve CLI: LOCAL_DEV forces npm-start (dev clone), otherwise use installed binary.
if [ -n "${LOCAL_DEV:-}" ] || ! command -v pie-wot >/dev/null 2>&1; then
  PIE_WOT=(npm -s start --prefix="$_BASE_DIR" --)
else
  PIE_WOT=(pie-wot)
fi

# Shared state — set by parse_args, consumed by step functions.
CLEAN=0
SRC=""
OUT=""
BUILD=""
VEHICLES_COUNT=0

parse_args() {
  local script_name="$1"
  shift
  CLEAN=0
  SRC=""
  OUT=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --src) SRC="$2"; shift 2 ;;
      --out) OUT="$2"; shift 2 ;;
      --clean) CLEAN=1; shift ;;
      *)
        if [ -z "$SRC" ]; then SRC="$1"
        elif [ -z "$OUT" ]; then OUT="$1"
        else echo "Error: unexpected argument: $1" >&2; return 1
        fi
        shift ;;
    esac
  done

  if [ -z "$SRC" ] || [ -z "$OUT" ]; then
    echo "Usage: $script_name [--clean] [--src] <src-dir> [--out] <out-dir>" >&2
    return 1
  fi

  if [ ! -d "$SRC" ]; then
    echo "Error: source directory not found: $SRC" >&2
    return 1
  fi

  SRC="$(cd "$SRC" && pwd)"
  mkdir -p "$OUT"
  OUT="$(cd "$OUT" && pwd)"
  BUILD="$OUT/.build"
}

clean_build() {
  rm -rf "$OUT/.build" "$OUT/gui"
  find "$OUT" -maxdepth 1 \( -name '*.png' -o -name '*.xml' -o -name '*.dds' \) -delete
}

decode_dds() {
  if [ ! -f "$SRC/battleAtlas.png" ] && [ -f "$SRC/battleAtlas.dds" ]; then
    "${PIE_WOT[@]}" dds decode "$SRC/battleAtlas.dds"
  fi
  if [ ! -f "$SRC/vehicleMarkerAtlas.png" ] && [ -f "$SRC/vehicleMarkerAtlas.dds" ]; then
    "${PIE_WOT[@]}" dds decode "$SRC/vehicleMarkerAtlas.dds"
  fi
}

extract_atlases() {
  if [ -d "$BUILD/atlases/battleAtlas" ]; then
    echo "skipping battleAtlas extraction — $BUILD/atlases/battleAtlas already exists"
  else
    "${PIE_WOT[@]}" atlas extract --from "$SRC/battleAtlas" --to "$BUILD/atlases/battleAtlas"
    cp -f "$SRC/battleAtlas.png" "$SRC/battleAtlas.xml" "$BUILD/atlases/"
  fi

  if [ -d "$BUILD/atlases/vehicleMarkerAtlas" ]; then
    echo "skipping vehicleMarkerAtlas extraction — $BUILD/atlases/vehicleMarkerAtlas already exists"
  else
    "${PIE_WOT[@]}" atlas extract --from "$SRC/vehicleMarkerAtlas" --to "$BUILD/atlases/vehicleMarkerAtlas"
    cp -f "$SRC/vehicleMarkerAtlas.png" "$SRC/vehicleMarkerAtlas.xml" "$BUILD/atlases/"
  fi
}

warm_cache() {
  echo "warm up vehicle data cache"
  VEHICLES_COUNT="$("${PIE_WOT[@]}" vehicle list --all --json 2>/dev/null | jq length)"
  echo "  $VEHICLES_COUNT vehicles processed"

  echo "warm up vehicle profile cache"
  local profiles_count
  profiles_count="$("${PIE_WOT[@]}" vehicle stats --all --quiet --json | jq length)"
  echo "  $profiles_count vehicles processed"
}

# render_icons <icon-render-flags...>
# Skips if $BUILD/icons already contains at least $VEHICLES_COUNT PNGs.
render_icons() {
  local icons_count
  icons_count="$(find "$BUILD/icons" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l)"

  if [ "$icons_count" -ge "$VEHICLES_COUNT" ]; then
    echo "skipping icons render — $BUILD/icons already has $icons_count icons"
    return 0
  fi

  echo "generating icons"
  mkdir -p "$BUILD/icons"
  "${PIE_WOT[@]}" icon render --all --to "$BUILD/icons" "$@" || return 1
}

overlay_icons() {
  echo "overlaying generated icons into atlas directories"
  rsync -a --include='*.png' --exclude='*' "$BUILD/icons/" "$BUILD/atlases/battleAtlas/"
  rsync -a --include='*.png' --exclude='*' "$BUILD/icons/" "$BUILD/atlases/vehicleMarkerAtlas/"
}

replace_suffixed() {
  echo "replacing suffixed variants with base icons"
  "$_LIB_DIR/replace-suffixed-with-base.sh" "$BUILD/atlases/battleAtlas" "$BUILD/icons"
  "$_LIB_DIR/replace-suffixed-with-base.sh" "$BUILD/atlases/vehicleMarkerAtlas" "$BUILD/icons"
}

pack_atlases() {
  mkdir -p "$OUT/gui/flash/atlases"
  "${PIE_WOT[@]}" atlas pack --src "$BUILD/atlases/vehicleMarkerAtlas" --to "$OUT/gui/flash/atlases/vehicleMarkerAtlas"
  "${PIE_WOT[@]}" atlas pack --src "$BUILD/atlases/battleAtlas" --to "$OUT/gui/flash/atlases/battleAtlas"
  mv "$OUT/gui/flash/atlases/battleAtlas.png" "$OUT/gui/flash/atlases/battleAtlas.dds"
  mv "$OUT/gui/flash/atlases/vehicleMarkerAtlas.png" "$OUT/gui/flash/atlases/vehicleMarkerAtlas.dds"
}

copy_contour() {
  mkdir -p "$OUT/gui/flash/maps/icons/vehicle/contour/"
  rsync -a --include='*.png' --exclude='*' "$BUILD/icons/" "$OUT/gui/flash/maps/icons/vehicle/contour/"
}

# pogs_pipeline <icon-render-flags...>
# Full pogs icon bake: decode → extract → warm cache → render → overlay → replace → pack → copy.
pogs_pipeline() {
  cd "$_BASE_DIR" || return 1

  [ "$CLEAN" -eq 1 ] && clean_build

  decode_dds
  extract_atlases
  warm_cache
  render_icons "$@" || return 1
  overlay_icons
  replace_suffixed
  pack_atlases
  copy_contour
}
