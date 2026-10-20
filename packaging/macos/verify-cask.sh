#!/usr/bin/env bash
# Instala el cask del tap con el .dmg recién construido, arranca la app y la desinstala, sin escribir en el tap (TD-139).
set -euo pipefail

dmg="${1:?uso: verify-cask.sh <ruta al .dmg>}"
dmg="$(cd "$(dirname "$dmg")" && pwd)/$(basename "$dmg")"
source="${CASK_SOURCE:-https://raw.githubusercontent.com/sgomez/homebrew-rfirma/main/Casks/rfirma.rb}"
applications="${APPLICATIONS_DIR:-/Applications}"
tap="rfirma-ci/local"

tmp="$(mktemp -d)"
cleanup() {
    brew untap "$tap" > /dev/null 2>&1 || true
    rm -rf "$tmp"
}
trap cleanup EXIT

case "$source" in
    http*) curl -fsSL "$source" -o "$tmp/rfirma.rb" ;;
    *) cp "$source" "$tmp/rfirma.rb" ;;
esac

sha="$(shasum -a 256 "$dmg" | cut -d' ' -f1)"
sed -E \
    -e "s|^( *)version .*|\\1version \"0.0.0\"|" \
    -e "s|^( *)sha256 .*|\\1sha256 \"$sha\"|" \
    -e "s|^( *)url \"[^\"]*\".*|\\1url \"file://$dmg\"|" \
    "$tmp/rfirma.rb" > "$tmp/cask.rb"

brew tap-new --no-git "$tap" > /dev/null
mkdir -p "$(brew --repository "$tap")/Casks"
cp "$tmp/cask.rb" "$(brew --repository "$tap")/Casks/rfirma.rb"

brew install --cask "$tap/rfirma"
app="$applications/rfirma.app"
[ -d "$app" ] || { echo "$app no existe tras instalar" >&2; exit 1; }
xattr -c "$app"
"$app/Contents/MacOS/rfirma" --version

brew uninstall --cask "$tap/rfirma"
[ ! -e "$app" ] || { echo "$app sigue ahí tras desinstalar" >&2; exit 1; }
echo "cask: instala, arranca y desinstala"
