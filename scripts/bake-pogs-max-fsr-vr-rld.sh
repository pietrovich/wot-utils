SCRIPT_DIR="$(dirname "$0")"
BASE_DIR="$SCRIPT_DIR/.."
cd "$BASE_DIR"

CLEAN=0
SOURCE_DIR=""

for arg in "$@"; do
  case "$arg" in
    --clean) CLEAN=1 ;;
    *) SOURCE_DIR="${arg##/}" ;;
  esac
done

if [ -z "$SOURCE_DIR" ]; then
  echo "Usage: $0 [--clean] <source-dir>" >&2
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [ "$CLEAN" -eq 1 ]; then
  rm -rf ./out/atlases ./out/icons
  find ./out -maxdepth 1 \( -name '*.png' -o -name '*.xml' -o -name '*.dds' \) -delete
fi

if [ ! -f "$SOURCE_DIR/battleAtlas.png" ] && [ -f "$SOURCE_DIR/battleAtlas.dds" ]; then
  npm -s start -- dds decode "$SOURCE_DIR/battleAtlas.dds"
fi

if [ ! -f "$SOURCE_DIR/vehicleMarkerAtlas.png" ] && [ -f "$SOURCE_DIR/vehicleMarkerAtlas.dds" ]; then
  npm -s start -- dds decode "$SOURCE_DIR/vehicleMarkerAtlas.dds"
fi

if [ -d ./out/atlases/battleAtlas ]; then
  echo "skipping battleAtlas extraction — ./out/atlases/battleAtlas already exists"
else
  npm -s start -- atlas extract --from "$SOURCE_DIR/battleAtlas" --to ./out/atlases/battleAtlas
  cp -f "$SOURCE_DIR/battleAtlas.png" "$SOURCE_DIR/battleAtlas.xml" ./out/atlases/
fi

if [ -d ./out/atlases/vehicleMarkerAtlas ]; then
  echo "skipping vehicleMarkerAtlas extraction — ./out/atlases/vehicleMarkerAtlas already exists"
else
  npm -s start -- atlas extract --from "$SOURCE_DIR/vehicleMarkerAtlas" --to ./out/atlases/vehicleMarkerAtlas
  cp -f "$SOURCE_DIR/vehicleMarkerAtlas.png" "$SOURCE_DIR/vehicleMarkerAtlas.xml" ./out/atlases/
fi

echo "warm up vehicle data cache"
VEHICLES_COUNT="$(npm -s start -- vehicle list --all --json 2>/dev/null | jq length)"
echo "  $VEHICLES_COUNT vehicles processed"

echo "warm up vehicle profile cache"
PROFILES_COUNT="$(npm -s start -- vehicle stats --all --quiet --json | jq length)"
echo "  $PROFILES_COUNT vehicles processed"

ICONS_COUNT="$(find ./out/icons -maxdepth 1 -name '*.png' 2>/dev/null | wc -l)"

if [ "$ICONS_COUNT" -ge "$VEHICLES_COUNT" ]; then
  echo "skipping icons render — ./out/icons already has $ICONS_COUNT icons"
else
  echo "generating icons"
  npm -s start -- icon render --all --color --to ./out/icons --bg v1 --create
fi

echo "overlaying generated icons into atlas directories"
rsync -a --include='*.png' --exclude='*' ./out/icons/ ./out/atlases/battleAtlas/
rsync -a --include='*.png' --exclude='*' ./out/icons/ ./out/atlases/vehicleMarkerAtlas/

echo "replacing suffixed variants with base icons"
"$SCRIPT_DIR/replace-suffixed-with-base.sh" ./out/atlases/battleAtlas "$BASE_DIR/out/icons"
"$SCRIPT_DIR/replace-suffixed-with-base.sh" ./out/atlases/vehicleMarkerAtlas "$BASE_DIR/out/icons"

npm -s start -- atlas pack --src ./out/atlases/vehicleMarkerAtlas --to ./out/vehicleMarkerAtlas
npm -s start -- atlas pack --src ./out/atlases/battleAtlas --to ./out/battleAtlas

mv ./out/battleAtlas.png ./out/battleAtlas.dds
mv ./out/vehicleMarkerAtlas.png ./out/vehicleMarkerAtlas.dds
