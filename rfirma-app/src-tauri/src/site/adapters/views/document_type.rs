//! El tipo de un documento de la sede tal como cruza a su ventana, el que rFirma detecta en sus bytes (ADR-0050).

use serde::Serialize;

use crate::crossing::crossing;
use crate::site::domain::protocol::DocumentType;

crossing! {
    /// El tipo de un documento de la sede según sus bytes; `unknown` se guarda como `.bin` y no se abre fuera (ADR-0050).
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub enum DocumentTypeView {
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
        /// Texto sin formato.
        Text,
        /// Nada que rFirma reconozca.
        Unknown,
    }
}

impl From<DocumentType> for DocumentTypeView {
    fn from(detected: DocumentType) -> Self {
        match detected {
            DocumentType::Pdf => Self::Pdf,
            DocumentType::Xml => Self::Xml,
            DocumentType::Invoice => Self::Invoice,
            DocumentType::Png => Self::Png,
            DocumentType::Jpeg => Self::Jpeg,
            DocumentType::Gif => Self::Gif,
            DocumentType::Webp => Self::Webp,
            DocumentType::Odt => Self::Odt,
            DocumentType::Ods => Self::Ods,
            DocumentType::Odp => Self::Odp,
            DocumentType::Docx => Self::Docx,
            DocumentType::Xlsx => Self::Xlsx,
            DocumentType::Pptx => Self::Pptx,
            DocumentType::Zip => Self::Zip,
            DocumentType::Text => Self::Text,
            DocumentType::Unknown => Self::Unknown,
        }
    }
}
