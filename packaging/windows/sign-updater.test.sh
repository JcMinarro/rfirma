#!/usr/bin/env bash
# Prueba la firma de actualización del instalador de Windows y del `.app.tar.gz` de macOS: sin clave no firma, y la firma verifica contra la pública embebida en la última estable y falla contra otra.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
manifest="$root/scripts/packages-manifest.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fail() {
    echo "FALLO ($1)" >&2
    exit 1
}

git_in() {
    local repo="$1"
    shift
    git -C "$repo" -c user.name=rfirma -c user.email=rfirma@example.invalid -c commit.gpgsign=false \
        -c tag.gpgsign=false "$@" > /dev/null
}

embed_in() {
    local config="$1" original="$2" pubkey="$3"
    if [ -n "$pubkey" ]; then
        jq --arg k "$pubkey" '.plugins.updater.pubkey = $k' "$original" > "$config"
    else
        jq 'del(.plugins.updater)' "$original" > "$config"
    fi
}

embed() {
    local repo="$1" pubkey="$2" platform
    for platform in windows macos; do
        embed_in "$repo/packaging/$platform/tauri.$platform.json" "$root/packaging/$platform/tauri.$platform.json" "$pubkey"
    done
    git_in "$repo" add -A
    git_in "$repo" commit -q --allow-empty -m "embebe $pubkey"
}

repo_embedding() {
    local repo="$1"
    mkdir -p "$repo/packaging/windows" "$repo/packaging/macos" "$repo/scripts" "$repo/rfirma-app"
    cp "$root/packaging/windows/sign-updater.sh" "$repo/packaging/windows/"
    cp "$manifest" "$repo/scripts/"
    cp "$root/rfirma-app/package.json" "$repo/rfirma-app/"
    git_in "$repo" init -q -b main
    embed "$repo" "$2"
}

delivery() {
    mkdir "$1"
    echo flatpak > "$1/me.sgomez.rfirma.flatpak"
    [ "${2-}" = sin-instalador ] || echo instalador > "$1/rfirma_1.0.0_x64-setup.exe"
    [ "${2-}" != con-macos ] || echo app > "$1/rfirma_1.0.0_aarch64.app.tar.gz"
    "$manifest" write "$1"
}

signs() {
    local repo="$1" key="$2" password="$3" name="$4"
    delivery "$tmp/$name" "${5-}"
    TAURI_SIGNING_PRIVATE_KEY="$(cat "$key")" TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$password" \
        "$repo/packaging/windows/sign-updater.sh" "$tmp/$name" > /dev/null 2>&1
}

repo_embedding "$tmp/sin-publica" ""

delivery "$tmp/candidata" sin-instalador
env -u TAURI_SIGNING_PRIVATE_KEY "$tmp/sin-publica/packaging/windows/sign-updater.sh" "$tmp/candidata" > /dev/null \
    || fail "sin instalador no hay nada que firmar"

delivery "$tmp/sin-publica-entrega"
if TAURI_SIGNING_PRIVATE_KEY=k TAURI_SIGNING_PRIVATE_KEY_PASSWORD=p \
    "$tmp/sin-publica/packaging/windows/sign-updater.sh" "$tmp/sin-publica-entrega" 2> /dev/null; then
    fail "sin clave publica embebida: debia fallar"
fi
[ ! -e "$tmp/sin-publica-entrega/rfirma_1.0.0_x64-setup.exe.sig" ] || fail "sin clave publica no se firma"

repo_embedding "$tmp/macos-sin-publica" cHVibGljYQ==
embed_in "$tmp/macos-sin-publica/packaging/macos/tauri.macos.json" "$root/packaging/macos/tauri.macos.json" ""
git_in "$tmp/macos-sin-publica" commit -q -am "macos sin updater"
delivery "$tmp/macos-sin-publica-entrega" con-macos
if salida="$(TAURI_SIGNING_PRIVATE_KEY=k TAURI_SIGNING_PRIVATE_KEY_PASSWORD=p \
    "$tmp/macos-sin-publica/packaging/windows/sign-updater.sh" "$tmp/macos-sin-publica-entrega" 2>&1)"; then
    fail "sin clave publica embebida en la configuracion de macOS: debia fallar"
fi
grep -qF packaging/macos/tauri.macos.json <<< "$salida" || fail "sin clave publica de macOS: dice que configuracion"
[ ! -e "$tmp/macos-sin-publica-entrega/rfirma_1.0.0_x64-setup.exe.sig" ] \
    || fail "sin clave publica de macOS no se firma tampoco el instalador de Windows"

repo_embedding "$tmp/con-publica" cHVibGljYQ==
delivery "$tmp/sin-privada"
if env -u TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD=p \
    "$tmp/con-publica/packaging/windows/sign-updater.sh" "$tmp/sin-privada" 2> /dev/null; then
    fail "sin clave privada: debia fallar"
fi
if TAURI_SIGNING_PRIVATE_KEY=k env -u TAURI_SIGNING_PRIVATE_KEY_PASSWORD \
    "$tmp/con-publica/packaging/windows/sign-updater.sh" "$tmp/sin-privada" 2> /dev/null; then
    fail "sin la contrasena de la clave: debia fallar"
fi

if ! command -v minisign > /dev/null 2>&1 || ! command -v npx > /dev/null 2>&1; then
    echo "AVISO sin minisign o sin npx: se salta la firma de verdad (el CI los instala)" >&2
    echo "OK  sign-updater (sin la firma de verdad)"
    exit 0
fi

cli_version="$(jq -r '.devDependencies["@tauri-apps/cli"]' "$root/rfirma-app/package.json")"
tauri() { npx --yes "@tauri-apps/cli@$cli_version" "$@" < /dev/null > /dev/null 2>&1; }
tauri signer generate --ci -p vieja -w "$tmp/vieja.key"
tauri signer generate --ci -p nueva -w "$tmp/nueva.key"
tauri signer generate --ci -p candidata -w "$tmp/candidata.key"
old="$(cat "$tmp/vieja.key.pub")"
new="$(cat "$tmp/nueva.key.pub")"

repo="$tmp/sin-estable"
repo_embedding "$repo" "$old"
git_in "$repo" tag v0.9.0-rc.1
signs "$repo" "$tmp/vieja.key" vieja sin-estable-vieja || fail "sin estable, verifica con la embebida actual"
[ -s "$tmp/sin-estable-vieja/rfirma_1.0.0_x64-setup.exe.sig" ] || fail "el .sig queda al lado del instalador"
[ "$(cat "$tmp/sin-estable-vieja/rfirma_1.0.0_x64-setup.exe")" = instalador ] || fail "firmar no toca el instalador"
[ "$("$manifest" files "$tmp/sin-estable-vieja" minisign)" = rfirma_1.0.0_x64-setup.exe.sig ] \
    || fail "el .sig es una fila del manifiesto"
if signs "$repo" "$tmp/nueva.key" nueva sin-estable-nueva; then
    fail "sin estable, una firma que no verifica con la embebida actual: debia fallar"
fi
signs "$repo" "$tmp/vieja.key" vieja con-macos con-macos || fail "firma tambien la actualizacion de macOS"
[ "$("$manifest" files "$tmp/con-macos" minisign | sort | tr '\n' ' ')" \
    = "rfirma_1.0.0_aarch64.app.tar.gz.sig rfirma_1.0.0_x64-setup.exe.sig " ] \
    || fail "el .sig de la actualizacion de macOS es una fila del manifiesto"
[ "$(cat "$tmp/con-macos/rfirma_1.0.0_aarch64.app.tar.gz")" = app ] || fail "firmar no toca el .app.tar.gz"

repo="$tmp/estable-sin-updater"
repo_embedding "$repo" ""
git_in "$repo" tag v0.8.0
embed "$repo" "$old"
signs "$repo" "$tmp/vieja.key" vieja sin-updater-vieja \
    || fail "si ninguna estable tiene updater, verifica con la embebida actual"

repo="$tmp/rotacion"
repo_embedding "$repo" "$old"
git_in "$repo" tag v1.0.0
embed "$repo" "$(cat "$tmp/candidata.key.pub")"
git_in "$repo" tag v1.0.1-rc.1
embed "$repo" "$new"
git_in "$repo" tag v1.1.0
signs "$repo" "$tmp/vieja.key" vieja puente-vieja \
    || fail "la version puente verifica con la embebida en la ultima estable, no con la suya"
if signs "$repo" "$tmp/nueva.key" nueva puente-nueva; then
    fail "la version puente firmada con la clave que embebe ella misma: debia fallar"
fi
if signs "$repo" "$tmp/candidata.key" candidata puente-candidata; then
    fail "una candidata no cuenta como ultima estable: debia fallar"
fi

git_in "$repo" commit -q --allow-empty -m siguiente
signs "$repo" "$tmp/nueva.key" nueva siguiente-nueva \
    || fail "tras la version puente, verifica con la nueva que ella embebe"
if signs "$repo" "$tmp/vieja.key" vieja siguiente-vieja; then
    fail "tras la version puente, la clave vieja: debia fallar"
fi

echo "OK  sign-updater"
