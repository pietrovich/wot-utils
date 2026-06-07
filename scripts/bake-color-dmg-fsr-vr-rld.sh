SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$SCRIPT_DIR/.."

CLEAN=0
SRC=""
OUT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --src) SRC="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --clean) CLEAN=1; shift ;;
    *)
      if [ -z "$SRC" ]; then
        SRC="$1"
      elif [ -z "$OUT" ]; then
        OUT="$1"
      else
        echo "Error: unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$SRC" ] || [ -z "$OUT" ]; then
  echo "Usage: $(basename "$0") [--clean] [--src] <src-dir> [--out] <out-dir>" >&2
  exit 1
fi

if [ ! -d "$SRC" ]; then
  echo "Error: source directory not found: $SRC" >&2
  exit 1
fi

# Resolve to absolute paths before cd changes the working directory
SRC="$(cd "$SRC" && pwd)"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

cd "$BASE_DIR"

if [ "$CLEAN" -eq 1 ]; then
  rm -rf "$OUT/.build" "$OUT/gui"
  find "$OUT" -maxdepth 1 \( -name '*.png' -o -name '*.xml' -o -name '*.dds' \) -delete
fi

if [ ! -f "$SRC/battleAtlas.png" ] && [ -f "$SRC/battleAtlas.dds" ]; then
  npm -s start -- dds decode "$SRC/battleAtlas.dds"
fi

if [ ! -f "$SRC/vehicleMarkerAtlas.png" ] && [ -f "$SRC/vehicleMarkerAtlas.dds" ]; then
  npm -s start -- dds decode "$SRC/vehicleMarkerAtlas.dds"
fi

if [ -d "$OUT/.build/atlases/battleAtlas" ]; then
  echo "skipping battleAtlas extraction — $OUT/.build/atlases/battleAtlas already exists"
else
  npm -s start -- atlas extract --from "$SRC/battleAtlas" --to "$OUT/.build/atlases/battleAtlas"
  cp -f "$SRC/battleAtlas.png" "$SRC/battleAtlas.xml" "$OUT/.build/atlases/"
fi

if [ -d "$OUT/.build/atlases/vehicleMarkerAtlas" ]; then
  echo "skipping vehicleMarkerAtlas extraction — $OUT/.build/atlases/vehicleMarkerAtlas already exists"
else
  npm -s start -- atlas extract --from "$SRC/vehicleMarkerAtlas" --to "$OUT/.build/atlases/vehicleMarkerAtlas"
  cp -f "$SRC/vehicleMarkerAtlas.png" "$SRC/vehicleMarkerAtlas.xml" "$OUT/.build/atlases/"
fi

echo "warm up vehicle data cache"
VEHICLES_COUNT="$(npm -s start -- vehicle list --all --json 2>/dev/null | jq length)"
echo "  $VEHICLES_COUNT vehicles processed"

echo "warm up vehicle profile cache"
PROFILES_COUNT="$(npm -s start -- vehicle stats --all --quiet --json | jq length)"
echo "  $PROFILES_COUNT vehicles processed"

ICONS_COUNT="$(find "$OUT/.build/icons" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l)"

if [ "$ICONS_COUNT" -ge "$VEHICLES_COUNT" ]; then
  echo "skipping icons render — $OUT/.build/icons already has $ICONS_COUNT icons"
else
  echo "generating icons"
  npm -s start -- icon render --all --color --to "$OUT/.build/icons" --bg v1 --create || exit 1
fi

echo "overlaying generated icons into atlas directories"
rsync -a --include='*.png' --exclude='*' "$OUT/.build/icons/" "$OUT/.build/atlases/battleAtlas/"
rsync -a --include='*.png' --exclude='*' "$OUT/.build/icons/" "$OUT/.build/atlases/vehicleMarkerAtlas/"

echo "replacing suffixed variants with base icons"
"$SCRIPT_DIR/replace-suffixed-with-base.sh" "$OUT/.build/atlases/battleAtlas" "$OUT/.build/icons"
"$SCRIPT_DIR/replace-suffixed-with-base.sh" "$OUT/.build/atlases/vehicleMarkerAtlas" "$OUT/.build/icons"

mkdir -p "$OUT/gui/flash/atlases"
mkdir -p "$OUT/gui/flash/maps/icons/vehicle/contour/"
npm -s start -- atlas pack --src "$OUT/.build/atlases/vehicleMarkerAtlas" --to "$OUT/gui/flash/atlases/vehicleMarkerAtlas"
npm -s start -- atlas pack --src "$OUT/.build/atlases/battleAtlas" --to "$OUT/gui/flash/atlases/battleAtlas"

mv "$OUT/gui/flash/atlases/battleAtlas.png" "$OUT/gui/flash/atlases/battleAtlas.dds"
mv "$OUT/gui/flash/atlases/vehicleMarkerAtlas.png" "$OUT/gui/flash/atlases/vehicleMarkerAtlas.dds"
rsync -a --include='*.png' --exclude='*' "$OUT/.build/icons/" "$OUT/gui/flash/maps/icons/vehicle/contour/"
