#!/usr/bin/env bash
set -euo pipefail

binario="${CARGO_TARGET_DIR:?}/debug/rfirma"
lib_dir="${RFIRMA_LIB_DIR:?}"
sistema="$(uname -s)"

if [ "$sistema" = "Darwin" ]; then
    destino="$HOME/.local/share/rfirma-dev"
    app="$destino/rfirma-dev.app"
    bundle_id="es.rfirma.dev-handler"
    lsregister="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
else
    destino="$HOME/.local/share/applications"
    fichero="$destino/rfirma-dev.desktop"
fi
previo="$destino/.rfirma-dev-handler-previo"

aviso_sin_binario() {
    if [ ! -x "$binario" ]; then
        echo
        echo "AVISO: todavia no existe $binario." >&2
        echo "Arranca 'just dev' antes de pulsar el enlace de la sede." >&2
    fi
}

# JXA es lo único de serie en macOS que llama a LaunchServices sin compilar nada.
macos_handler() {
    osascript -l JavaScript -e "
        ObjC.import('CoreServices');
        function run() {
            try { return ObjC.unwrap(ObjC.castRefToObject(\$.LSCopyDefaultHandlerForURLScheme(\$('afirma')))); }
            catch (e) { return ''; }
        }
    "
}

macos_set_handler() {
    osascript -l JavaScript -e "
        ObjC.import('CoreServices');
        function run() { \$.LSSetDefaultHandlerForURLScheme(\$('afirma'), \$('$1')); return ''; }
    " > /dev/null
}

macos_on() {
    mkdir -p "$app/Contents/MacOS"
    if [ ! -f "$previo" ]; then
        macos_handler > "$previo"
    fi
    # El ejecutable es el binario mismo y no un envoltorio: Tauri recibe afirma:// por evento de Apple.
    ln -sf "$binario" "$app/Contents/MacOS/rfirma"
    cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key><string>$bundle_id</string>
    <key>CFBundleName</key><string>rFirma (desarrollo)</string>
    <key>CFBundleExecutable</key><string>rfirma</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>LSEnvironment</key><dict><key>RFIRMA_LIB_DIR</key><string>$lib_dir</string></dict>
    <key>CFBundleURLTypes</key>
    <array><dict>
        <key>CFBundleURLName</key><string>afirma</string>
        <key>CFBundleURLSchemes</key><array><string>afirma</string></array>
    </dict></array>
</dict>
</plist>
PLIST
    "$lsregister" -f "$app"
    macos_set_handler "$bundle_id"
    echo
    echo "manejador de afirma://: $(macos_handler)"
    echo "  -> $app"
    aviso_sin_binario
}

macos_off() {
    "$lsregister" -u "$app" || true
    rm -rf "$app"
    if [ -s "$previo" ] && [ "$(cat "$previo")" != "$bundle_id" ]; then
        macos_set_handler "$(cat "$previo")" || true
    fi
    rm -f "$previo"
    echo "manejador de afirma://: $(macos_handler)"
}

on() {
    mkdir -p "$destino"
    # `off` le devuelve el esquema a quien lo tenía: con AutoFirma al lado, a su lanzador.
    if [ ! -f "$previo" ]; then
        xdg-mime query default x-scheme-handler/afirma > "$previo" || true
    fi
    {
        echo "[Desktop Entry]"
        echo "Type=Application"
        echo "Name=rFirma (desarrollo)"
        echo "Comment=NO INSTALADO: apunta al arbol de desarrollo. just dev-handler off lo quita."
        echo "Exec=env RFIRMA_LIB_DIR=$lib_dir $binario %u"
        echo "Terminal=false"
        echo "NoDisplay=true"
        echo "Categories=Utility;"
        echo "MimeType=x-scheme-handler/afirma;"
    } > "$fichero"
    command -v update-desktop-database >/dev/null && update-desktop-database "$destino" || true
    xdg-mime default rfirma-dev.desktop x-scheme-handler/afirma
    echo
    echo "manejador de afirma://: $(xdg-mime query default x-scheme-handler/afirma)"
    echo "  -> $fichero"
    aviso_sin_binario
}

off() {
    rm -f "$fichero"
    command -v update-desktop-database >/dev/null && update-desktop-database "$destino" || true
    if [ -s "$previo" ] && [ "$(cat "$previo")" != "rfirma-dev.desktop" ]; then
        xdg-mime default "$(cat "$previo")" x-scheme-handler/afirma || true
    fi
    rm -f "$previo"
    echo "manejador de afirma://: $(xdg-mime query default x-scheme-handler/afirma || echo 'ninguno')"
}

case "${1:-}:$sistema" in
    on:Darwin)  macos_on ;;
    off:Darwin) macos_off ;;
    on:*)  on ;;
    off:*) off ;;
    *) echo "uso: dev-handler.sh on|off" >&2; exit 1 ;;
esac
