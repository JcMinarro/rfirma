//! El módulo PKCS#11 de SoftHSM en el que `just certs install` monta los tokens de pruebas.

use std::path::PathBuf;

#[cfg(target_os = "macos")]
fn system_module() -> PathBuf {
    let prefix = std::env::var("HOMEBREW_PREFIX").unwrap_or_else(|_| "/opt/homebrew".to_owned());
    PathBuf::from(prefix).join("lib/softhsm/libsofthsm2.so")
}

#[cfg(not(target_os = "macos"))]
fn system_module() -> PathBuf {
    PathBuf::from("/usr/lib/softhsm/libsofthsm2.so")
}

#[cfg(target_os = "macos")]
const INSTALL: &str = "brew install softhsm opensc";
#[cfg(not(target_os = "macos"))]
const INSTALL: &str = "sudo apt install -y softhsm2 opensc";

/// El módulo de `RFIRMA_PKCS11_MODULE` o, sin ella, el SoftHSM del sistema.
pub fn the_softhsm_module() -> PathBuf {
    let module = std::env::var_os("RFIRMA_PKCS11_MODULE").map_or_else(system_module, PathBuf::from);
    assert!(
        module.is_file(),
        "falta el modulo PKCS#11 en {}. Estas pruebas necesitan SoftHSM:\n  \
         {INSTALL}\n  just certs install",
        module.display()
    );
    module
}
