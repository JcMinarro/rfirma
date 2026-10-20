#!/usr/bin/env bash
# Rasteriza packaging/macos/dmg-background.tiff, a 1x y 2x, desde dmg-background.swift.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
swift "$here/dmg-background.swift" "$work"
tiffutil -cathidpicheck "$work/dmg-background.png" "$work/dmg-background@2x.png" -out "$here/dmg-background.tiff"
