#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=baker-lib.sh
source "$(cd "$(dirname "$0")" && pwd)/baker-lib.sh"

parse_args "$(basename "$0")" "$@" || exit 1
pogs_pipeline --clear
