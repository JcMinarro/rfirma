//! Un elemento del lote local tal como cruza a la ventana de sede, con el asa de su documento de paso.

use serde::Serialize;

use crate::crossing::crossing;
use crate::site::application::errand::LocalBatchItem;

use super::{DocumentTypeView, SignatureRoundView, SigningKindView};

crossing! {
    /// Un elemento del lote local tal como lo ve la ventana: su contenido se lee por el asa, y su ruta no cruza.
    #[derive(Clone, Debug, PartialEq, Eq, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct LocalBatchItemView {
        /// Identificador con el que la sede nombra el elemento.
        pub id: String,
        /// Asa del documento de paso del elemento.
        pub document: String,
        /// El nombre del elemento.
        pub name: Option<String>,
        /// El tipo que rFirma detecta en los bytes del elemento (ADR-0050).
        pub detected: DocumentTypeView,
        /// El SHA-256 del elemento, en hexadecimal.
        pub sha256: String,
        /// Qué es lo que se va a firmar.
        pub signing: SigningKindView,
        /// Tipo de firma solicitada sobre el elemento.
        pub round: SignatureRoundView,
        /// Si lo que trae el elemento es una huella precalculada y no el documento.
        pub precalculated_hash: bool,
    }
}

impl From<&LocalBatchItem> for LocalBatchItemView {
    fn from(item: &LocalBatchItem) -> Self {
        Self {
            id: item.id.clone(),
            document: item.document.handle.clone(),
            name: item.document.name.clone(),
            detected: item.document.detected.into(),
            sha256: item.document.sha256.clone(),
            signing: item.format.into(),
            round: item.round.into(),
            precalculated_hash: item.precalculated_hash,
        }
    }
}
