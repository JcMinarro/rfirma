//! Lo que se descarga desde la ventana de sede: el nombre de cada fichero, con la extensión de su tipo detectado (ADR-0050), y el `.zip` de todos con su `SHA256SUMS`.

use std::collections::BTreeSet;
use std::io::{Cursor, Write};

use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use crate::site::domain::protocol::DocumentType;

const DEFAULT_STEM: &str = "documento";
const CHECKSUMS: &str = "SHA256SUMS";
const LONGEST_EXTENSION: usize = 5;

/// Un fichero listo para escribir donde elija la persona: su nombre y sus bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Download {
    /// El nombre con el que se propone guardarlo.
    pub name: String,
    /// Los bytes, tal cual.
    pub bytes: Vec<u8>,
}

/// El nombre con que se guarda un documento: el que propone la sede, sin ruta, con la extensión de su tipo.
pub fn file_name(proposed: Option<&str>, detected: DocumentType) -> String {
    let stem = proposed
        .map(|name| stem_of(&harmless(name)))
        .filter(|stem| !stem.is_empty())
        .unwrap_or_else(|| DEFAULT_STEM.to_owned());
    format!("{stem}.{}", detected.extension())
}

fn harmless(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect()
}

fn stem_of(name: &str) -> String {
    let stem = match name.rsplit_once('.') {
        Some((stem, extension)) if looks_like_an_extension(extension) => stem,
        _ => name,
    };
    stem.trim_matches(|c: char| c == '.' || c.is_whitespace())
        .to_owned()
}

fn looks_like_an_extension(text: &str) -> bool {
    !text.is_empty()
        && text.len() <= LONGEST_EXTENSION
        && text.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Las sumas de los ficheros en el formato de `sha256sum`.
pub fn checksums_of(files: &[Download]) -> String {
    files
        .iter()
        .map(|file| {
            format!(
                "{}  {}\n",
                hex(&openssl::sha::sha256(&file.bytes)),
                file.name
            )
        })
        .collect()
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// El `.zip` con los ficheros, sin pisar ningún nombre, y su `SHA256SUMS` al final.
pub fn archive_of(files: &[Download]) -> Result<Vec<u8>, String> {
    let files = with_distinct_names(files);
    let mut archive = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let sums = Download {
        name: CHECKSUMS.to_owned(),
        bytes: checksums_of(&files).into_bytes(),
    };
    for file in files.iter().chain(std::iter::once(&sums)) {
        archive
            .start_file(&file.name, options)
            .map_err(|error| error.to_string())?;
        archive
            .write_all(&file.bytes)
            .map_err(|error| error.to_string())?;
    }
    archive
        .finish()
        .map(Cursor::into_inner)
        .map_err(|error| error.to_string())
}

fn with_distinct_names(files: &[Download]) -> Vec<Download> {
    let mut taken = BTreeSet::from([CHECKSUMS.to_owned()]);
    files
        .iter()
        .map(|file| {
            let name = (1..)
                .map(|copy| numbered(&file.name, copy))
                .find(|name| !taken.contains(name))
                .unwrap_or_else(|| file.name.clone());
            taken.insert(name.clone());
            Download {
                name,
                bytes: file.bytes.clone(),
            }
        })
        .collect()
}

fn numbered(name: &str, copy: usize) -> String {
    if copy == 1 {
        return name.to_owned();
    }
    match name.rsplit_once('.') {
        Some((stem, extension)) => format!("{stem} ({copy}).{extension}"),
        None => format!("{name} ({copy})"),
    }
}

#[cfg(test)]
mod tests;
