//! Las huellas de los `.p12` que rFirma metió en el llavero de macOS, apuntadas en un fichero de su carpeta: solo esos se pueden quitar.

use std::path::Path;

use crate::identity::domain::error::{Situation, TokenError};

const RECORD: &str = "keychain-installs";

/// Apunta en `directory` las huellas de lo que rFirma acaba de meter en el llavero.
pub fn record(directory: &Path, thumbprints: &[Vec<u8>]) -> Result<(), TokenError> {
    let mut lines = recorded(directory);
    lines.extend(thumbprints.iter().map(|thumbprint| line_of(thumbprint)));
    std::fs::create_dir_all(directory)
        .and_then(|()| write(directory, &lines))
        .map_err(|error| unrecorded(&error))
}

/// Borra de `directory` la huella de lo que rFirma ha quitado del llavero.
pub fn forget(directory: &Path, thumbprint: &[u8]) -> Result<(), TokenError> {
    let gone = line_of(thumbprint);
    let lines = recorded(directory);
    if !lines.contains(&gone) {
        return Ok(());
    }
    let kept: Vec<String> = lines.into_iter().filter(|line| *line != gone).collect();
    write(directory, &kept).map_err(|error| unrecorded(&error))
}

/// Si la huella está apuntada en `directory`.
pub fn holds(directory: &Path, thumbprint: &[u8]) -> bool {
    recorded(directory).contains(&line_of(thumbprint))
}

fn line_of(thumbprint: &[u8]) -> String {
    thumbprint
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect()
}

fn recorded(directory: &Path) -> Vec<String> {
    std::fs::read_to_string(directory.join(RECORD))
        .map(|text| text.lines().map(str::to_owned).collect())
        .unwrap_or_default()
}

fn write(directory: &Path, lines: &[String]) -> std::io::Result<()> {
    let text: String = lines.iter().map(|line| format!("{line}\n")).collect();
    std::fs::write(directory.join(RECORD), text)
}

fn unrecorded(error: &std::io::Error) -> TokenError {
    TokenError::new(
        Situation::Unknown,
        format!("no se ha podido apuntar lo que rFirma ha instalado en el llavero: {error}"),
    )
}
