//! La vista de una FacturaE: su HTML con la hoja sin modificar del visor de FACe de su versión, o ninguna (ADR-0051).

use crate::site::domain::protocol::{invoice_version, InvoiceVersion};

use super::xslt;

const STYLESHEET_3_2_1: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/stylesheets/facturae/visorFace-3.2.1.xsl"
));
const STYLESHEET_3_2_2: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/stylesheets/facturae/visorFace-3.2.2.xsl"
));

/// El HTML de la factura, o `None` si no tiene vista: versión sin hoja, XML mal formado o fallo de la hoja.
pub fn invoice_html(document: &[u8]) -> Option<String> {
    xslt::transform(document, stylesheet_of(invoice_version(document)?))
}

fn stylesheet_of(version: InvoiceVersion) -> &'static [u8] {
    match version {
        InvoiceVersion::V3_2_1 => STYLESHEET_3_2_1,
        InvoiceVersion::V3_2_2 => STYLESHEET_3_2_2,
    }
}

#[cfg(test)]
mod tests;
