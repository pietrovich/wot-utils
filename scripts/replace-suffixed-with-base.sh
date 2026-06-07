ATLAS_DIR="$1"
ICONS_DIR="$2"

if [ -z "$ATLAS_DIR" ]; then
  echo "Usage: $0 <atlas-dir> [icons-dir]" >&2
  exit 1
fi

if [ ! -d "$ATLAS_DIR" ]; then
  echo "Error: directory not found: $ATLAS_DIR" >&2
  exit 1
fi

EXCLUDED=(
  "battleLoadingFormBgTips.png"
  "battleLoadingFormBgTips_7x7.png"
)

is_excluded() {
  local name="$1"
  for ex in "${EXCLUDED[@]}"; do
    if [ "$name" = "$ex" ]; then
      return 0
    fi
  done
  return 1
}

find "$ATLAS_DIR" -maxdepth 1 -name '*_7x7.png' -o -name '*_bob.png' -o -name '*_IGR.png' | while read -r suffixed; do
  filename="$(basename "$suffixed")"
  if is_excluded "$filename"; then
    continue
  fi
  base="${suffixed%_*.png}.png"
  if is_excluded "$(basename "$base")"; then
    continue
  fi
  if [ -f "$base" ]; then
    cp "$base" "$suffixed"
    if [ -d "$ICONS_DIR" ]; then
      cp "$suffixed" "$ICONS_DIR/"
    fi
  fi
done
