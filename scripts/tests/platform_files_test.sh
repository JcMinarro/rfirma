#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
platform_files="$root/scripts/platform-files.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tauri="$work/rfirma-app/src-tauri"
mkdir -p "$tauri/src/adapters/store" "$tauri/src/domain" "$tauri/tests/support" "$tauri/target/debug"

cat >"$tauri/build.rs" <<'EOF'
fn main() {
    if cfg!(windows) {}
}
EOF
cat >"$tauri/src/lib.rs" <<'EOF'
pub mod adapters;
pub mod domain;
EOF
cat >"$tauri/src/adapters/mod.rs" <<'EOF'
#[cfg(windows)]
#[allow(dead_code)]
pub mod store;
#[cfg(target_os = "linux")] mod gtk;
#[cfg(not(target_os = "linux"))]
mod native;
#[cfg(test)]
mod tests;
pub mod shared;
EOF
cat >"$tauri/src/adapters/lock.rs" <<'EOF'
#[cfg(all(test, windows))]
#[path = "lock/windows_tests.rs"]
mod windows_tests;
#[cfg(unix)]
mod inline {
    pub fn x() {}
}
EOF
cat >"$tauri/src/adapters/store/cng.rs" <<'EOF'
pub fn sign() {}
EOF
cat >"$tauri/src/adapters/trust.rs" <<'EOF'
#[cfg(target_os = "macos")]
mod keychain;
EOF
cat >"$tauri/src/domain/name.rs" <<'EOF'
#[cfg(feature = "windows-like")]
pub fn feature_is_not_a_platform() {}
EOF
cat >"$tauri/src/domain/family.rs" <<'EOF'
#[cfg_attr(target_family = "unix", allow(unused))]
pub fn family() {}
EOF
cat >"$tauri/tests/pin_fd.rs" <<'EOF'
#[cfg(unix)]
mod support;
EOF
cat >"$tauri/target/debug/generated.rs" <<'EOF'
#[cfg(windows)]
mod generated;
EOF

expected="macos rfirma-app/src-tauri/src/adapters/mod.rs
macos rfirma-app/src-tauri/src/adapters/native.rs
macos rfirma-app/src-tauri/src/adapters/native/
macos rfirma-app/src-tauri/src/adapters/trust.rs
macos rfirma-app/src-tauri/src/adapters/trust/keychain.rs
macos rfirma-app/src-tauri/src/adapters/trust/keychain/
windows rfirma-app/src-tauri/build.rs
windows rfirma-app/src-tauri/src/adapters/lock.rs
windows rfirma-app/src-tauri/src/adapters/lock/windows_tests.rs
windows rfirma-app/src-tauri/src/adapters/mod.rs
windows rfirma-app/src-tauri/src/adapters/native.rs
windows rfirma-app/src-tauri/src/adapters/native/
windows rfirma-app/src-tauri/src/adapters/store.rs
windows rfirma-app/src-tauri/src/adapters/store/"

actual="$(cd "$work" && "$platform_files")"
if [ "$actual" != "$expected" ]; then
    echo "FALLO (arbol de prueba):" >&2
    diff <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") >&2 || true
    exit 1
fi

real="$(cd "$root" && "$platform_files")"
for needle in \
    "windows rfirma-app/src-tauri/src/identity/adapters/windows_store/" \
    "macos rfirma-app/src-tauri/src/identity/adapters/macos_store/" \
    "windows rfirma-app/src-tauri/src/site/adapters/channel/acceptor.rs"; do
    grep -qxF "$needle" <<<"$real" || {
        echo "FALLO (repositorio): falta $needle" >&2
        exit 1
    }
done
for path in \
    rfirma-app/src-tauri/src/lib.rs \
    rfirma-app/src-tauri/src/desktop/adapters/titlebar/gtk_titlebar.rs; do
    if grep -q " $path\$" <<<"$real"; then
        echo "FALLO (repositorio): $path no es de Windows ni de macOS" >&2
        exit 1
    fi
done

echo "platform_files_test: correcto"
