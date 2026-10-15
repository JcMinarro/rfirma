//! La vista de una factura de la sede: se prepara por el asa del documento, se guarda en el trámite y se sirve después al marco aislado (ADR-0051).

use crate::site::domain::protocol::DocumentType;

use super::download::received_now;
use super::state::LiveErrand;

/// Transforma la factura tras el asa y guarda su HTML en el trámite; `false` si no tiene vista.
pub fn prepare_the_invoice_view(
    live: &LiveErrand,
    handle: &str,
    read: &dyn Fn(&str) -> Result<Vec<u8>, String>,
    transform: &dyn Fn(&[u8]) -> Option<String>,
) -> bool {
    let is_an_invoice = received_now(live)
        .iter()
        .any(|document| document.handle == handle && document.detected == DocumentType::Invoice);
    if !is_an_invoice {
        return false;
    }
    let Some(html) = read(handle).ok().and_then(|bytes| transform(&bytes)) else {
        return false;
    };
    live.keep_the_invoice_view(handle, html);
    true
}

/// El HTML ya preparado de la factura tras el asa, si lo hay.
pub fn the_invoice_view(live: &LiveErrand, handle: &str) -> Option<String> {
    live.invoice_view(handle)
}
