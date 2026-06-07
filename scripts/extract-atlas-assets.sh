#!/usr/bin/env bash
set -euo pipefail

TARGET_FILES=(
    "gui/flash/atlases/battleAtlas.dds"
    "gui/flash/atlases/battleAtlas.xml"
    "gui/flash/atlases/vehicleMarkerAtlas.dds"
    "gui/flash/atlases/vehicleMarkerAtlas.xml"
)

usage() {
    cat <<EOF
Usage: $(basename "$0") [--src] <src-dir> [--out] <out-dir>

Extract battle and vehicle marker atlas files from a World of Tanks installation.

Arguments:
  <src-dir>   Path to the WoT game directory. The script searches it recursively
              for gui-partN.pkg files (zip archives) and scans their index for
              the target atlas files.

  <out-dir>   Directory where extracted files are dropped (flat, no subdirs).
              Created automatically if it does not exist.

Extracted files:
  battleAtlas.dds
  battleAtlas.xml
  vehicleMarkerAtlas.dds
  vehicleMarkerAtlas.xml

Options:
  --src <dir>   Explicit form for <src-dir>
  --out <dir>   Explicit form for <out-dir>
  --help        Show this message and exit

Both positional and named forms may be mixed freely.
EOF
}

SRC=""
OUT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --src)
            SRC="$2"
            shift 2
            ;;
        --out)
            OUT="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            echo "Error: unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$SRC" ]]; then
                SRC="$1"
            elif [[ -z "$OUT" ]]; then
                OUT="$1"
            else
                echo "Error: unexpected argument: $1" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$SRC" || -z "$OUT" ]]; then
    usage >&2
    exit 1
fi

if [[ ! -d "$SRC" ]]; then
    echo "Error: source directory does not exist: $SRC" >&2
    exit 1
fi

mkdir -p "$OUT"

found_any=0
while IFS= read -r -d '' pkg_file; do
    found_any=1
    echo "Checking: $pkg_file"

    # Read only the central directory (TOC) — no decompression
    archive_index=$(zipinfo -1 "$pkg_file" 2>/dev/null) || {
        echo "  Warning: failed to read archive index, skipping." >&2
        continue
    }

    files_to_extract=()
    for target in "${TARGET_FILES[@]}"; do
        if grep -qxF "$target" <<< "$archive_index"; then
            files_to_extract+=("$target")
        fi
    done

    if [[ ${#files_to_extract[@]} -gt 0 ]]; then
        echo "  Extracting ${#files_to_extract[@]} file(s): ${files_to_extract[*]}"
        unzip -oj "$pkg_file" "${files_to_extract[@]}" -d "$OUT"
    else
        echo "  No target files."
    fi
done < <(find "$SRC" -regextype posix-extended -regex ".*/gui-part[0-9]+\.pkg" -print0)

if [[ $found_any -eq 0 ]]; then
    echo "No gui-partN.pkg files found in: $SRC" >&2
    exit 1
fi
