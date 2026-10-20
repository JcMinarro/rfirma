#!/usr/bin/env bash
# Las pruebas de `verify-cask.sh` con un `brew` de mentira, sin red.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
verify="$root/packaging/macos/verify-cask.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/bin" "$tmp/apps" "$tmp/repo"
printf 'dmg de prueba' > "$tmp/rfirma_1.0.0_aarch64.dmg"
expected_sha="$(shasum -a 256 "$tmp/rfirma_1.0.0_aarch64.dmg" | cut -d' ' -f1)"

cat > "$tmp/cask.rb" <<'CASK'
cask "rfirma" do
  version "0.0.0"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/sgomez/rfirma/releases/download/v#{version}/rfirma_#{version}_aarch64.dmg"
  app "rfirma.app"
end
CASK

cat > "$tmp/bin/brew" <<'BREW'
#!/usr/bin/env bash
echo "$*" >> "$FAKE_BREW_LOG"
case "$1" in
    tap-new) mkdir -p "$FAKE_REPO/Casks" ;;
    --repository) echo "$FAKE_REPO" ;;
    install)
        cp "$FAKE_REPO/Casks/rfirma.rb" "$FAKE_INSTALLED_CASK"
        mkdir -p "$APPLICATIONS_DIR/rfirma.app/Contents/MacOS"
        printf '#!/bin/sh\necho "rfirma 1.0.0"\n' > "$APPLICATIONS_DIR/rfirma.app/Contents/MacOS/rfirma"
        chmod +x "$APPLICATIONS_DIR/rfirma.app/Contents/MacOS/rfirma"
        ;;
    uninstall) [ -n "${FAKE_KEEP_APP:-}" ] || rm -rf "$APPLICATIONS_DIR/rfirma.app" ;;
esac
BREW
chmod +x "$tmp/bin/brew"

export PATH="$tmp/bin:$PATH" FAKE_REPO="$tmp/repo" FAKE_BREW_LOG="$tmp/brew.log"
export FAKE_INSTALLED_CASK="$tmp/installed.rb" APPLICATIONS_DIR="$tmp/apps" CASK_SOURCE="$tmp/cask.rb"

fail() { echo "FALLO  $*" >&2; exit 1; }

"$verify" "$tmp/rfirma_1.0.0_aarch64.dmg" > "$tmp/out" 2>&1 || fail "debía pasar: $(cat "$tmp/out")"
grep -q '^tap-new --no-git' "$tmp/brew.log" || fail "el tap de usar y tirar debe crearse sin git"
grep -qF "url \"file://$tmp/rfirma_1.0.0_aarch64.dmg\"" "$tmp/installed.rb" || fail "el cask debe apuntar al dmg local"
grep -q "sha256 \"$expected_sha\"" "$tmp/installed.rb" || fail "el cask debe llevar el sha256 del dmg local"
grep -q 'app "rfirma.app"' "$tmp/installed.rb" || fail "el resto del cask debe quedar igual"
grep -q '^uninstall --cask' "$tmp/brew.log" || fail "debe desinstalar"
[ ! -e "$tmp/apps/rfirma.app" ] || fail "la app debe haberse retirado"

if FAKE_KEEP_APP=1 "$verify" "$tmp/rfirma_1.0.0_aarch64.dmg" > "$tmp/out" 2>&1; then
    fail "si la desinstalación deja la app, tenía que fallar"
fi
grep -q 'sigue' "$tmp/out" || fail "esperaba el aviso de que la app sigue: $(cat "$tmp/out")"

echo "OK  verify-cask"
