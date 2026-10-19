#!/usr/bin/env bash
# Firma de actualización (minisign) de cada instalador de Windows y de cada `.app.tar.gz` de macOS de una entrega, comprobada contra la pública embebida en la última etiqueta estable de su plataforma (ADR-0015).
#
# Uso: packaging/windows/sign-updater.sh <directorio>
# Entorno: TAURI_SIGNING_PRIVATE_KEY y TAURI_SIGNING_PRIVATE_KEY_PASSWORD.
set -euo pipefail

dir="${1-}"
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
    echo "uso: packaging/windows/sign-updater.sh <directorio>" >&2
    exit 2
fi

root="$(cd "$(dirname "$0")/../.." && pwd)"
manifest="$root/scripts/packages-manifest.sh"
windows_config=packaging/windows/tauri.windows.json
macos_config=packaging/macos/tauri.macos.json

mapfile -t installers < <("$manifest" files "$dir" nsis)
mapfile -t archives < <("$manifest" files "$dir" updater)
if [ "${#installers[@]}" -eq 0 ] && [ "${#archives[@]}" -eq 0 ]; then
    echo "sin instalador de Windows ni actualizacion de macOS que firmar"
    exit 0
fi

embedded_pubkey() {
    jq -r '.plugins.updater.pubkey // empty' 2> /dev/null || true
}

# No la actual: en la versión puente de una rotación ya embebe la nueva (ADR-0015).
trusted_pubkey() {
    local config="$1" tag pubkey
    while read -r tag; do
        [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
        pubkey="$(git -C "$root" show "$tag:$config" 2> /dev/null | embedded_pubkey)" || pubkey=""
        if [ -n "$pubkey" ]; then
            echo "$tag $pubkey"
            return
        fi
    done < <(git -C "$root" tag --list 'v*' --merged HEAD --no-contains HEAD --sort=-v:refname)
    echo "HEAD $(embedded_pubkey < "$root/$config")"
}

declare -A source_of=() pubkey_of=()
for config in "$windows_config" "$macos_config"; do
    if [ "$config" = "$windows_config" ] && [ "${#installers[@]}" -eq 0 ]; then continue; fi
    if [ "$config" = "$macos_config" ] && [ "${#archives[@]}" -eq 0 ]; then continue; fi
    read -r source pubkey < <(trusted_pubkey "$config")
    if [ -z "${pubkey-}" ]; then
        echo "falta plugins.updater.pubkey en $config ($source)" >&2
        echo "Se crea como dice «La clave de actualizaciones de Windows» en packaging/repo/README.md." >&2
        exit 1
    fi
    source_of["$config"]="$source"
    pubkey_of["$config"]="$pubkey"
done
if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ] || [ -z "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" ]; then
    echo "faltan TAURI_SIGNING_PRIVATE_KEY o TAURI_SIGNING_PRIVATE_KEY_PASSWORD en el entorno" >&2
    exit 1
fi
for tool in npx minisign base64; do
    if ! command -v "$tool" > /dev/null 2>&1; then
        echo "para firmar la actualizacion hace falta $tool" >&2
        exit 1
    fi
done

cli_version="$(jq -r '.devDependencies["@tauri-apps/cli"]' "$root/rfirma-app/package.json")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

sign_against() {
    local config="$1" name="$2" package="$dir/$2" source="${source_of[$1]}"
    printf '%s' "${pubkey_of[$config]}" | base64 -d > "$work/updater.pub"
    rm -f "$package.sig"
    npx --yes "@tauri-apps/cli@$cli_version" signer sign "$package" < /dev/null
    base64 -d "$package.sig" > "$work/updater.minisig"
    if ! minisign -V -q -p "$work/updater.pub" -m "$package" -x "$work/updater.minisig"; then
        echo "$name.sig no verifica con la clave publica embebida en $config de $source" >&2
        exit 1
    fi
    echo "OK  $name.sig verifica con la clave publica embebida en $config de $source"
}

for name in "${installers[@]}"; do
    sign_against "$windows_config" "$name"
done
for name in "${archives[@]}"; do
    sign_against "$macos_config" "$name"
done

"$manifest" write "$dir"
