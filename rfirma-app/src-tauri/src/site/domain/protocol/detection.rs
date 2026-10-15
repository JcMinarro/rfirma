//! Detector puro por cabecera: la forma que decide el formato de firma y el tipo de un documento de la sede, sin fiarse de su nombre (ADR-0050).

use quick_xml::events::Event;
use quick_xml::Reader;
use x509_cert::der::asn1::AnyRef;
use x509_cert::der::{Decode, Reader as _, SliceReader, Tag, TagNumber, Tagged};

/// Lo que dice la cabecera del documento, sin más.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DetectedShape {
    /// Empieza por `%PDF`.
    Pdf,
    /// XML cuya raíz es una factura electrónica.
    Invoice,
    /// Prólogo `<?xml`, o primer byte no blanco `<`.
    Xml,
    /// Ni lo uno ni lo otro.
    Binary,
}

/// Estructura de firma previa detectable en el documento.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DetectedSignature {
    /// PDF con diccionario de firma.
    Pdf,
    /// Factura electrónica.
    Invoice,
    /// XML con elemento Signature.
    Xml,
    /// `SignedData` con signingCertificate en todos sus firmantes.
    Cades,
    /// `SignedData` con algún firmante sin signingCertificate.
    Cms,
}

const PDF_HEADER: &[u8] = b"%PDF";
const BYTE_RANGE: &[u8] = b"/ByteRange";
const TYPE_SIG: &[u8] = b"/Type /Sig";
const TYPE_SIG_NO_SPACE: &[u8] = b"/Type/Sig";
const SIGNATURE_TAG: &[u8] = b"Signature";

const OID_SIGNED_DATA: &[u8] = &[
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02,
];

const OID_SIGNING_CERTIFICATES: [&[u8]; 2] = [
    &[
        0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x02, 0x0c,
    ],
    &[
        0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x02, 0x2f,
    ],
];

const SIGNED_ATTRIBUTES: Tag = Tag::ContextSpecific {
    constructed: true,
    number: TagNumber(0),
};

/// El nombre local de la raíz de una factura electrónica.
const INVOICE_ROOT: &[u8] = b"Facturae";

/// Los tres hijos que el original le exige a esa raíz.
const INVOICE_CHILDREN: [&[u8]; 3] = [b"FileHeader", b"Parties", b"Invoices"];

/// La forma del documento, mirando solo su cabecera.
pub fn shape_of(document: &[u8]) -> DetectedShape {
    if document.starts_with(PDF_HEADER) {
        return DetectedShape::Pdf;
    }
    match document.iter().find(|byte| !byte.is_ascii_whitespace()) {
        Some(b'<') if is_an_invoice(document) => DetectedShape::Invoice,
        Some(b'<') => DetectedShape::Xml,
        _ => DetectedShape::Binary,
    }
}

/// El tipo de un documento según sus bytes, del que salen su extensión y si se abre fuera (ADR-0050).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DocumentType {
    /// Un PDF.
    Pdf,
    /// Un XML que no es una factura con hoja de estilos.
    Xml,
    /// Una FacturaE de una versión con hoja de estilos.
    Invoice,
    /// Una imagen PNG.
    Png,
    /// Una imagen JPEG.
    Jpeg,
    /// Una imagen GIF.
    Gif,
    /// Una imagen WebP.
    Webp,
    /// Un texto de OpenDocument.
    Odt,
    /// Una hoja de cálculo de OpenDocument.
    Ods,
    /// Una presentación de OpenDocument.
    Odp,
    /// Un documento de Word.
    Docx,
    /// Una hoja de cálculo de Excel.
    Xlsx,
    /// Una presentación de PowerPoint.
    Pptx,
    /// Un `.zip` que no es ninguno de los anteriores.
    Zip,
    /// Texto UTF-8 sin caracteres de control.
    Text,
    /// Nada que rFirma reconozca.
    Unknown,
}

impl DocumentType {
    /// La extensión con la que el sistema recibe el documento.
    pub fn extension(self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Xml | Self::Invoice => "xml",
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Gif => "gif",
            Self::Webp => "webp",
            Self::Odt => "odt",
            Self::Ods => "ods",
            Self::Odp => "odp",
            Self::Docx => "docx",
            Self::Xlsx => "xlsx",
            Self::Pptx => "pptx",
            Self::Zip => "zip",
            Self::Text => "txt",
            Self::Unknown => "bin",
        }
    }

    /// Si rFirma reconoce el tipo: lo que no, no se abre con otra aplicación.
    pub fn is_recognised(self) -> bool {
        self != Self::Unknown
    }
}

const ZIP_HEADER: &[u8] = b"PK\x03\x04";
const ODF_MIMETYPE: &[u8] = b"mimetypeapplication/vnd.oasis.opendocument.";

/// El tipo del documento, mirando solo sus bytes.
pub fn type_of(document: &[u8]) -> DocumentType {
    if let Some(image) = image_type_of(document) {
        return image;
    }
    if document.starts_with(ZIP_HEADER) {
        return zip_type_of(document);
    }
    match shape_of(document) {
        DetectedShape::Pdf => DocumentType::Pdf,
        DetectedShape::Invoice if has_a_stylesheet(document) => DocumentType::Invoice,
        DetectedShape::Xml | DetectedShape::Invoice => DocumentType::Xml,
        DetectedShape::Binary if is_plain_text(document) => DocumentType::Text,
        DetectedShape::Binary => DocumentType::Unknown,
    }
}

const INVOICE_NAMESPACES_WITH_STYLESHEET: [&str; 2] = [
    "http://www.facturae.es/Facturae/2014/v3.2.1/Facturae",
    "http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml",
];

fn has_a_stylesheet(document: &[u8]) -> bool {
    root_namespace(document)
        .is_some_and(|namespace| INVOICE_NAMESPACES_WITH_STYLESHEET.contains(&namespace.as_str()))
}

fn root_namespace(document: &[u8]) -> Option<String> {
    let mut reader = Reader::from_reader(document);
    let mut buffer = Vec::new();
    loop {
        match reader.read_event_into(&mut buffer).ok()? {
            Event::Start(tag) | Event::Empty(tag) => {
                let wanted = match tag.name().prefix() {
                    Some(prefix) => format!("xmlns:{}", String::from_utf8_lossy(prefix.as_ref())),
                    None => "xmlns".to_owned(),
                };
                return tag
                    .attributes()
                    .flatten()
                    .find(|attribute| attribute.key.as_ref() == wanted.as_bytes())
                    .and_then(|attribute| attribute.normalized_value().ok())
                    .map(|value| value.into_owned());
            }
            Event::Eof => return None,
            _ => {}
        }
        buffer.clear();
    }
}

fn image_type_of(document: &[u8]) -> Option<DocumentType> {
    if document.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some(DocumentType::Png)
    } else if document.starts_with(&[0xff, 0xd8, 0xff]) {
        Some(DocumentType::Jpeg)
    } else if document.starts_with(b"GIF87a") || document.starts_with(b"GIF89a") {
        Some(DocumentType::Gif)
    } else if document.starts_with(b"RIFF") && document.get(8..12) == Some(b"WEBP") {
        Some(DocumentType::Webp)
    } else {
        None
    }
}

/// Un ODF abre con su `mimetype` sin comprimir; un OOXML se reconoce por la carpeta de su parte principal.
fn zip_type_of(document: &[u8]) -> DocumentType {
    if let Some(kind) = document
        .get(30..)
        .and_then(|rest| rest.strip_prefix(ODF_MIMETYPE))
    {
        if kind.starts_with(b"text") {
            return DocumentType::Odt;
        }
        if kind.starts_with(b"spreadsheet") {
            return DocumentType::Ods;
        }
        if kind.starts_with(b"presentation") {
            return DocumentType::Odp;
        }
    }
    let names = zip_entry_names(document);
    let has_folder = |folder: &[u8]| names.iter().any(|name| name.starts_with(folder));
    if !names.contains(&b"[Content_Types].xml".as_slice()) {
        DocumentType::Zip
    } else if has_folder(b"word/") {
        DocumentType::Docx
    } else if has_folder(b"xl/") {
        DocumentType::Xlsx
    } else if has_folder(b"ppt/") {
        DocumentType::Pptx
    } else {
        DocumentType::Zip
    }
}

fn zip_entry_names(document: &[u8]) -> Vec<&[u8]> {
    let mut names = Vec::new();
    let mut rest = document;
    while let Some(start) = find(rest, ZIP_HEADER) {
        let header = &rest[start..];
        let Some(length) = header
            .get(26..28)
            .map(|bytes| usize::from(u16::from_le_bytes([bytes[0], bytes[1]])))
        else {
            break;
        };
        if let Some(name) = header.get(30..30 + length) {
            names.push(name);
        }
        rest = &header[ZIP_HEADER.len()..];
    }
    names
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn is_plain_text(document: &[u8]) -> bool {
    !document.is_empty()
        && std::str::from_utf8(document).is_ok_and(|text| {
            text.chars()
                .all(|c| !c.is_control() || matches!(c, '\t' | '\n' | '\r' | '\u{c}'))
        })
}

/// Comprueba si los datos contienen una estructura de firma previa reconocible.
pub fn detect_signature(document: &[u8]) -> Option<DetectedSignature> {
    if document.starts_with(PDF_HEADER) && has_pdf_signatures(document) {
        return Some(DetectedSignature::Pdf);
    }
    if is_an_invoice(document) {
        return Some(DetectedSignature::Invoice);
    }
    if is_cms_signed_data(document) {
        return Some(if every_signer_carries_its_signing_certificate(document) {
            DetectedSignature::Cades
        } else {
            DetectedSignature::Cms
        });
    }
    if document
        .iter()
        .any(|b| !b.is_ascii_whitespace() && *b == b'<')
        && has_xml_signatures(document)
    {
        return Some(DetectedSignature::Xml);
    }
    None
}

/// Comprueba si un PDF contiene una estructura de firma previa.
pub fn has_pdf_signatures(document: &[u8]) -> bool {
    document.starts_with(PDF_HEADER)
        && (contains_subsequence(document, BYTE_RANGE)
            || contains_subsequence(document, TYPE_SIG)
            || contains_subsequence(document, TYPE_SIG_NO_SPACE))
}

/// Comprueba si un documento XML contiene un elemento de firma electrónica.
pub fn has_xml_signatures(document: &[u8]) -> bool {
    let mut reader = Reader::from_reader(document);
    reader.config_mut().trim_text(true);
    let mut buffer = Vec::new();
    loop {
        match reader.read_event_into(&mut buffer) {
            Ok(Event::Start(tag)) | Ok(Event::Empty(tag)) => {
                if tag.local_name().as_ref() == SIGNATURE_TAG {
                    return true;
                }
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buffer.clear();
    }
    false
}

/// Comprueba si los datos corresponden a un contenedor CMS/CAdES SignedData.
pub fn is_cms_signed_data(document: &[u8]) -> bool {
    if document.len() < 14 || document[0] != 0x30 {
        return false;
    }
    let mut idx = 1;
    let first_len = document[idx];
    if first_len <= 0x80 {
        idx += 1;
    } else {
        let num_bytes = (first_len & 0x7f) as usize;
        if num_bytes == 0 || num_bytes > 4 || idx + 1 + num_bytes > document.len() {
            return false;
        }
        idx += 1 + num_bytes;
    }
    if idx + OID_SIGNED_DATA.len() > document.len() {
        return false;
    }
    document[idx..idx + OID_SIGNED_DATA.len()] == *OID_SIGNED_DATA
}

/// El reconocedor de CAdES del original (`CAdESValidator.isCAdESValid`, 1.9.2); lo que no se lee sigue siendo CAdES.
fn every_signer_carries_its_signing_certificate(document: &[u8]) -> bool {
    signer_infos(document).is_none_or(|signers| {
        signers
            .into_iter()
            .all(|signer| carries_its_signing_certificate(signer).unwrap_or(true))
    })
}

fn signer_infos(document: &[u8]) -> Option<Vec<AnyRef<'_>>> {
    let content_info = AnyRef::from_der(document).ok()?;
    let explicit = *elements(content_info.value())?.get(1)?;
    let signed_data = AnyRef::from_der(explicit.value()).ok()?;
    let signer_set = *elements(signed_data.value())?.last()?;
    elements(signer_set.value())
}

fn carries_its_signing_certificate(signer: AnyRef<'_>) -> Option<bool> {
    let fields = elements(signer.value())?;
    let Some(attributes) = fields.iter().find(|field| field.tag() == SIGNED_ATTRIBUTES) else {
        return Some(false);
    };
    let kinds = elements(attributes.value())?
        .into_iter()
        .map(|attribute| elements(attribute.value())?.first().copied())
        .collect::<Option<Vec<_>>>()?;
    Some(kinds.into_iter().any(|kind| {
        kind.tag() == Tag::ObjectIdentifier && OID_SIGNING_CERTIFICATES.contains(&kind.value())
    }))
}

fn elements(content: &[u8]) -> Option<Vec<AnyRef<'_>>> {
    let mut reader = SliceReader::new(content).ok()?;
    let mut found = Vec::new();
    while !reader.is_finished() {
        found.push(AnyRef::decode(&mut reader).ok()?);
    }
    Some(found)
}

fn contains_subsequence(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() {
        return true;
    }
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
}

/// La misma comprobación que `AOFacturaESigner.isValidDataFile`: la raíz y sus tres hijos.
fn is_an_invoice(document: &[u8]) -> bool {
    let mut reader = Reader::from_reader(document);
    reader.config_mut().trim_text(true);
    let mut buffer = Vec::new();
    let mut depth = 0_usize;
    let mut pending = INVOICE_CHILDREN.to_vec();
    loop {
        let opened = match reader.read_event_into(&mut buffer) {
            Ok(Event::Start(tag)) => Some((tag.local_name().as_ref().to_vec(), true)),
            Ok(Event::Empty(tag)) => Some((tag.local_name().as_ref().to_vec(), false)),
            Ok(Event::End(_)) => {
                depth = depth.saturating_sub(1);
                None
            }
            Ok(Event::Eof) => break,
            Ok(_) => None,
            Err(_) => return false,
        };
        if let Some((name, nested)) = opened {
            if depth == 0 && name != INVOICE_ROOT {
                return false;
            }
            if depth == 1 {
                pending.retain(|child| *child != name.as_slice());
            }
            if nested {
                depth += 1;
            }
        }
        buffer.clear();
    }
    pending.is_empty()
}

#[cfg(test)]
pub(crate) mod tests;
