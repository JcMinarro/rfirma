#!/usr/bin/env bash
#
# Instala (`install`) o quita (`uninstall`) los .p12 de testdata/fnmt en un llavero
# de pruebas de macOS que se añade a la lista de búsqueda del usuario, donde los
# ve rFirma; quitarlo borra el llavero entero y no toca el de inicio de sesión.

set -euo pipefail

keychain="$HOME/Library/Keychains/rfirma-test.keychain-db"
password="1234"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fnmt="$here/../fnmt"
scratch=""

the_password_of() {
    awk -F'|' -v name="\`$1\`" '$2 ~ name { gsub(/[ `]/, "", $3); print $3; exit }' \
        "$fnmt/README.md"
}

# El Llavero rechaza los .p12 con AES y MAC SHA-256 como si la contraseña fuera mala.
in_legacy_cipher() {
    openssl pkcs12 -in "$1" -passin "pass:$2" -nodes -legacy -out "$scratch/unwrapped.pem"
    openssl pkcs12 -export -legacy -in "$scratch/unwrapped.pem" -passout "pass:$password" -out "$3"
}

search_list() {
    security list-keychains -d user | sed 's/^[[:space:]]*"//; s/"[[:space:]]*$//'
}

install() {
    if [ -f "$keychain" ]; then
        echo "el llavero $keychain ya existe; para rehacerlo: uninstall e install"
        return
    fi
    security create-keychain -p "$password" "$keychain"
    security set-keychain-settings "$keychain"
    security unlock-keychain -p "$password" "$keychain"

    local keychains=()
    while IFS= read -r line; do keychains+=("$line"); done < <(search_list)
    security list-keychains -d user -s "${keychains[@]}" "$keychain"

    local p12
    scratch="$(mktemp -d)"
    trap '[ -z "$scratch" ] || rm -rf "$scratch"' EXIT
    for p12 in "$fnmt"/*.p12; do
        in_legacy_cipher "$p12" "$(the_password_of "$(basename "$p12")")" "$scratch/legacy.p12"
        security import "$scratch/legacy.p12" -k "$keychain" -P "$password" -A >/dev/null
        echo "importado $(basename "$p12")"
    done
    echo "llavero de pruebas listo en $keychain (contraseña $password)"
}

uninstall() {
    if [ ! -f "$keychain" ]; then
        echo "no hay llavero de pruebas en $keychain"
        return
    fi
    security delete-keychain "$keychain"
    echo "llavero de pruebas borrado"
}

case "${1:-}" in
    install) install ;;
    uninstall) uninstall ;;
    *)
        echo "uso: $0 install|uninstall" >&2
        exit 1
        ;;
esac
