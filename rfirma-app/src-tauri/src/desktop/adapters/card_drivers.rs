//! Los controladores de tarjeta (`.bundle`) que macOS trae para el servicio de tarjetas inteligentes.

use std::path::Path;

const SYSTEM_DRIVERS: &str = "/usr/libexec/SmartCardServices/drivers";

/// Los nombres de los controladores del sistema, ordenados; vacío si no hay ninguno o no se leen.
pub fn system_card_drivers() -> Vec<String> {
    card_drivers_in(Path::new(SYSTEM_DRIVERS))
}

fn card_drivers_in(directory: &Path) -> Vec<String> {
    let Ok(entries) = std::fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut names: Vec<String> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .is_some_and(|extension| extension == "bundle")
        })
        .filter_map(|path| Some(path.file_stem()?.to_string_lossy().into_owned()))
        .collect();
    names.sort();
    names
}

#[cfg(test)]
mod tests;
