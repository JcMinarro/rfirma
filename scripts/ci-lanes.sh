#!/usr/bin/env bash
# Lee por stdin los ficheros de un PR o de un push y dice que carriles del CI corren (`java=true`...).
# Un carril de Linux se salta solo si todos caen en su lista de ajenos; uno de plataforma corre
# solo si alguno le concierne. Sin ficheros, corren todos.
#
# Uso: ci-lanes.sh [--platform-files FICHERO] [--no-platforms] [--force windows|macos]...
#   --platform-files  la salida de scripts/platform-files.sh: `plataforma ruta`, exacta o prefijo con '/'
#   --no-platforms    windows y macos no corren, sean cuales sean los ficheros (push a main)
#   --force           el carril corre, sean cuales sean los ficheros (etiqueta del PR)
set -euo pipefail

platform_files=()
no_platforms=false
forced=()
while [ "$#" -gt 0 ]; do
    case "$1" in
        --platform-files)
            mapfile -t platform_files <"$2"
            shift 2
            ;;
        --no-platforms)
            no_platforms=true
            shift
            ;;
        --force)
            case "${2:-}" in
                windows | macos) forced+=("$2") ;;
                *)
                    echo "ci-lanes.sh: --force admite windows o macos, no '${2:-}'" >&2
                    exit 2
                    ;;
            esac
            shift 2
            ;;
        *)
            echo "ci-lanes.sh: opcion desconocida '$1'" >&2
            exit 2
            ;;
    esac
done

inert() {
    case "$1" in
        docs/design/* | rfirma-conformance/console/*) return 1 ;;
        docs/* | rfirma-conformance/* | .claude/* | .agents/* | skills-lock.json) return 0 ;;
        */*) return 1 ;;
        *.md) return 0 ;;
    esac
    return 1
}

storybook_only() {
    case "$1" in
        rfirma-app/.storybook/* | rfirma-app/src/*.stories.tsx) return 0 ;;
    esac
    return 1
}
java_ignores() {
    case "$1" in
        scripts/bootstrap.sh | scripts/pinned-version.sh | scripts/ci-lanes.sh) return 1 ;;
        docs/* | rfirma-app/* | rfirma-conformance/* | packaging/* | scripts/* | testdata/site-driver/* | pnpm-lock.yaml) return 0 ;;
    esac
    return 1
}

web_ignores() {
    case "$1" in
        rfirma-native-bridge/pom.xml | testdata/site-driver/*) return 1 ;;
        packaging/repo/*) return 0 ;;
        rfirma-app/src-tauri/*.rs | rfirma-app/src-tauri/*.md | rfirma-app/src-tauri/*.png) return 0 ;;
        rfirma-app/src-tauri/tests/*.snapshot | rfirma-app/src-tauri/tests/*.baseline) return 0 ;;
        rfirma-app/src-tauri/.config/nextest.toml | rfirma-app/src-tauri/clippy.toml) return 0 ;;
        rfirma-native-bridge/* | testdata/*) return 0 ;;
    esac
    return 1
}

rust_ignores() {
    storybook_only "$1" && return 0
    case "$1" in
        rfirma-native-bridge/testbench/* | scripts/pinned-version.sh | scripts/install-tools.sh | scripts/ci-lanes.sh) return 1 ;;
        docs/design/* | rfirma-conformance/* | packaging/* | scripts/* | rfirma-native-bridge/* | pnpm-lock.yaml) return 0 ;;
    esac
    return 1
}

landing_ignores() {
    storybook_only "$1" && return 0
    case "$1" in
        scripts/ci-lanes.sh | packaging/repo/Dockerfile) return 1 ;;
        rfirma-app/src/design-system/*) return 1 ;;
        docs/* | rfirma-app/* | rfirma-conformance/* | rfirma-native-bridge/* | testdata/* | scripts/*) return 0 ;;
        packaging/repo/site/*) return 1 ;;
        packaging/*) return 0 ;;
    esac
    return 1
}

native_ignores() {
    storybook_only "$1" && return 0
    case "$1" in
        docs/* | packaging/* | rfirma-conformance/* | rfirma-app/src/* | rfirma-app/po/* | pnpm-lock.yaml) return 0 ;;
    esac
    return 1
}

has_cfg_of() {
    local platform="$1" file="$2" entry
    for entry in "${platform_files[@]}"; do
        [ "${entry%% *}" = "$platform" ] || continue
        entry="${entry#* }"
        case "$entry" in
            */) [[ "$file" == "$entry"* ]] && return 0 ;;
            *) [ "$file" = "$entry" ] && return 0 ;;
        esac
    done
    return 1
}

every_platform_needs() {
    case "$1" in
        rfirma-app/src-tauri/Cargo.toml | rfirma-app/src-tauri/build.rs | versions.env) return 0 ;;
        .github/workflows/platforms.yml | .github/actions/setup-runner/*) return 0 ;;
        scripts/bootstrap.sh | scripts/pinned-version.sh | scripts/install-tools.sh) return 0 ;;
    esac
    return 1
}

windows_needs() {
    case "$1" in
        packaging/windows/* | rfirma-app/src-tauri/windows-app-manifest.xml | rfirma-app/src-tauri/vcpkg.json) return 0 ;;
    esac
    every_platform_needs "$1" || has_cfg_of windows "$1"
}

macos_needs() {
    case "$1" in
        packaging/macos/*) return 0 ;;
    esac
    every_platform_needs "$1" || has_cfg_of macos "$1"
}

lanes=(java web rust native landing)
platforms=(windows macos)
declare -A runs=([java]=false [web]=false [rust]=false [native]=false [landing]=false [windows]=false [macos]=false)
seen=false

while IFS= read -r file || [ -n "$file" ]; do
    [ -n "$file" ] || continue
    seen=true
    inert "$file" && continue
    for lane in "${lanes[@]}"; do
        "${lane}_ignores" "$file" || runs[$lane]=true
    done
    for lane in "${platforms[@]}"; do
        ! "${lane}_needs" "$file" || runs[$lane]=true
    done
done

if [ "$seen" = false ]; then
    for lane in "${lanes[@]}" "${platforms[@]}"; do
        runs[$lane]=true
    done
fi
if [ "$no_platforms" = true ]; then
    for lane in "${platforms[@]}"; do
        runs[$lane]=false
    done
fi
for lane in "${forced[@]}"; do
    runs[$lane]=true
done

for lane in "${lanes[@]}" "${platforms[@]}"; do
    echo "$lane=${runs[$lane]}"
done
