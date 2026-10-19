//! «Descargar» y «Descargar todo» del consentimiento de sede: qué documentos del momento en curso se guardan y dónde, sin tocar el trámite si la persona cancela.

use std::path::PathBuf;

use crate::site::domain::download::{archive_of, file_name, Download};
use crate::site::ports::Scratch;

use super::outcome::{Moment, ReceivedDocument};
use super::state::LiveErrand;

const ARCHIVE_NAME: &str = "documentos.zip";

/// Por qué no se descargó lo que pidió la ventana.
#[derive(Debug, PartialEq, Eq)]
pub enum DownloadError {
    /// El momento en curso no enseña ningún documento con esa asa.
    NotReceived(String),
    /// El momento en curso no enseña ningún documento.
    NothingReceived,
    /// Los bytes del documento no se dejaron leer.
    Unreadable(String),
    /// El diálogo de guardado no se pudo abrir.
    NoDialog(String),
    /// El `.zip` no se pudo componer.
    Unpackable(String),
    /// El destino elegido no se dejó escribir.
    Unwritable(String),
}

/// Guarda tal cual el documento del consentimiento tras el asa; `false` si la persona cerró el diálogo.
pub fn download_one(
    live: &LiveErrand,
    handle: &str,
    read: &dyn Fn(&str) -> Result<Vec<u8>, String>,
    choose: impl FnOnce(&Download) -> Result<Option<PathBuf>, String>,
    scratch: &dyn Scratch,
) -> Result<bool, DownloadError> {
    let received = received_now(live)
        .into_iter()
        .find(|document| document.handle == handle)
        .ok_or_else(|| DownloadError::NotReceived(handle.to_owned()))?;
    let download = downloaded(&received, read)?;
    written_where_chosen(&download, choose, scratch)
}

/// Guarda en un `.zip` todos los documentos del consentimiento y su `SHA256SUMS`; `false` si la persona cerró el diálogo.
pub fn download_all(
    live: &LiveErrand,
    read: &dyn Fn(&str) -> Result<Vec<u8>, String>,
    choose: impl FnOnce(&Download) -> Result<Option<PathBuf>, String>,
    scratch: &dyn Scratch,
) -> Result<bool, DownloadError> {
    let received = received_now(live);
    if received.is_empty() {
        return Err(DownloadError::NothingReceived);
    }
    let files = received
        .iter()
        .map(|document| downloaded(document, read))
        .collect::<Result<Vec<_>, _>>()?;
    let archive = Download {
        name: ARCHIVE_NAME.to_owned(),
        bytes: archive_of(&files).map_err(DownloadError::Unpackable)?,
    };
    written_where_chosen(&archive, choose, scratch)
}

/// Los documentos que enseña el momento en curso, los únicos que la ventana puede pedir.
pub(super) fn received_now(live: &LiveErrand) -> Vec<ReceivedDocument> {
    live.moment().map(received_in).unwrap_or_default()
}

fn received_in(moment: Moment) -> Vec<ReceivedDocument> {
    match moment {
        Moment::AskingToSign { document, .. } => vec![document],
        Moment::AskingToSignTheLocalBatch { items, .. } => items
            .into_iter()
            .filter(|item| !item.precalculated_hash)
            .map(|item| item.document)
            .collect(),
        Moment::Waiting
        | Moment::AskingForConsent { .. }
        | Moment::MarkingTheArea { .. }
        | Moment::AskingToConfirm { .. }
        | Moment::AskingToSignTheBatch { .. }
        | Moment::NoCertificate { .. }
        | Moment::Saving { .. }
        | Moment::Loading { .. }
        | Moment::NoChannel(_)
        | Moment::RefusedWithoutChannel(_)
        | Moment::ShowingTheRefusal(_)
        | Moment::Unreachable
        | Moment::OldWebClient => Vec::new(),
    }
}

fn downloaded(
    document: &ReceivedDocument,
    read: &dyn Fn(&str) -> Result<Vec<u8>, String>,
) -> Result<Download, DownloadError> {
    Ok(Download {
        name: file_name(document.name.as_deref(), document.detected),
        bytes: read(&document.handle).map_err(DownloadError::Unreadable)?,
    })
}

fn written_where_chosen(
    download: &Download,
    choose: impl FnOnce(&Download) -> Result<Option<PathBuf>, String>,
    scratch: &dyn Scratch,
) -> Result<bool, DownloadError> {
    let Some(path) = choose(download).map_err(DownloadError::NoDialog)? else {
        return Ok(false);
    };
    scratch
        .write(&path, &download.bytes)
        .map_err(DownloadError::Unwritable)?;
    Ok(true)
}
