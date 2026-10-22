#!/usr/bin/env bash
# Lista, como `windows <ruta>` o `macos <ruta>`, los ficheros de rfirma-app/src-tauri con un cfg de esa plataforma y, con '/' final, los modulos que ese cfg declara.
set -euo pipefail

tauri=rfirma-app/src-tauri

find "$tauri" -path "$tauri/target" -prune -o -name '*.rs' -type f -print | sort | xargs env LC_ALL=C awk '
    function crate_dir(file, dir, base) {
        dir = file; sub(/\/[^\/]*$/, "", dir)
        base = file; sub(/.*\//, "", base)
        if (base == "mod.rs" || base == "lib.rs" || base == "main.rs" || base == "build.rs") return dir
        if (dir ~ /\/(tests|examples|benches)$/ || dir ~ /\/src\/bin$/) return dir
        sub(/\.rs$/, "", file)
        return file
    }
    function platforms_of(line, found, off_linux) {
        found = ""
        off_linux = line ~ /not[(][[:space:]]*target_os[[:space:]]*=[[:space:]]*"linux"[[:space:]]*[)]/
        if (off_linux || line ~ /(^|[^A-Za-z0-9_"-])windows([^A-Za-z0-9_"-]|$)/ || line ~ /"windows"/ || line ~ /not[(][[:space:]]*unix[[:space:]]*[)]/) found = found " windows"
        if (off_linux || line ~ /"macos"/) found = found " macos"
        return found
    }
    function emit(platforms, path, n, list, i) {
        n = split(platforms, list, " ")
        for (i = 1; i <= n; i++) print list[i], path
    }
    FNR == 1 { gated = ""; path = ""; dir = FILENAME; sub(/\/[^\/]*$/, "", dir); modules = crate_dir(FILENAME) }
    {
        attribute = $0 ~ /^[[:space:]]*#\[/
        if ($0 ~ /cfg(!|_attr)?[(](.*[^A-Za-z0-9_"-])?(windows|unix|target_os|target_family)([^A-Za-z0-9_"-]|$)/) {
            emit(platforms_of($0), FILENAME)
            if ($0 ~ /^[[:space:]]*#\[cfg[(]/) gated = platforms_of($0)
        }
        if (gated != "" && $0 ~ /^[[:space:]]*#\[path[[:space:]]*=/) {
            path = $0; sub(/^[^"]*"/, "", path); sub(/".*/, "", path)
        }
        if (gated != "" && $0 ~ /(^|[][:space:]])mod[[:space:]]+[A-Za-z0-9_]+[[:space:]]*;/) {
            name = $0; sub(/.*(^|[][:space:]])mod[[:space:]]+/, "", name); sub(/[^A-Za-z0-9_].*/, "", name)
            if (path != "") emit(gated, dir "/" path)
            else { emit(gated, modules "/" name ".rs"); emit(gated, modules "/" name "/") }
            gated = ""; path = ""; next
        }
        if (!attribute && $0 !~ /^[[:space:]]*(\/\/.*)?$/) { gated = ""; path = "" }
    }
' | sort -u
