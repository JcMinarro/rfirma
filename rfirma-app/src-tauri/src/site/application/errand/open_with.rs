//! La copia temporal que «Abrir con…» entrega al sistema operativo, con la extensión del tipo de sus bytes (ADR-0050).

use std::path::PathBuf;

use crate::site::domain::protocol::type_of;
use crate::site::ports::{FilterEngine, PolicyEngine};

use super::desk::scratch::write_the_document;
use super::download::received_now;
use super::{ErrandDesk, LiveErrand};

/// Por qué no se pudo preparar la copia.
#[derive(Debug, PartialEq, Eq)]
pub enum CopyToOpenError {
    /// El momento en curso no enseña ningún documento con esa asa.
    NotReceived(String),
    /// Los bytes del documento no se dejaron leer.
    Unreadable(String),
    /// rFirma no reconoce el tipo de los bytes: no se abre con ninguna aplicación.
    Unrecognised,
    /// La copia no se pudo escribir.
    Unwritable(String),
}

/// Escribe la copia del documento del consentimiento tras el asa para abrirla fuera, y la apunta para borrarla con el trámite.
pub fn copy_to_open<E: FilterEngine, P: PolicyEngine>(
    desk: &ErrandDesk<'_, E, P>,
    live: &LiveErrand,
    handle: &str,
    read: &dyn Fn(&str) -> Result<Vec<u8>, String>,
) -> Result<PathBuf, CopyToOpenError> {
    if !received_now(live)
        .iter()
        .any(|document| document.handle == handle)
    {
        return Err(CopyToOpenError::NotReceived(handle.to_owned()));
    }
    let bytes = read(handle).map_err(CopyToOpenError::Unreadable)?;
    if !type_of(&bytes).is_recognised() {
        return Err(CopyToOpenError::Unrecognised);
    }
    let path = write_the_document(desk, &bytes)
        .map_err(|refusal| CopyToOpenError::Unwritable(format!("{refusal:?}")))?;
    live.keep_the_scratch(path.clone(), desk.scratch.clone());
    Ok(path)
}
