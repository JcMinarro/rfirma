//! El esquema de URI propio del proceso de sede, que sirve al marco aislado el HTML ya preparado de una factura con su propia CSP (ADR-0051).

use tauri::http::{header, Response, StatusCode, Uri};

/// El nombre del esquema, que la CSP de la ventana admite en `frame-src`.
pub const INVOICE_SCHEME: &str = "rfirma-invoice";

const INVOICE_CSP: &str =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:";

/// La respuesta a la petición de `uri`, cuyo camino es el asa del documento.
pub fn served(uri: &Uri, view_of: &dyn Fn(&str) -> Option<String>) -> Response<Vec<u8>> {
    let handle = uri.path().trim_start_matches('/');
    let response = Response::builder();
    let built = match view_of(handle) {
        Some(html) => response
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .header(header::CONTENT_SECURITY_POLICY, INVOICE_CSP)
            .body(html.into_bytes()),
        None => response.status(StatusCode::NOT_FOUND).body(Vec::new()),
    };
    built.unwrap_or_else(|_| Response::new(Vec::new()))
}

/// El constructor con el esquema registrado, que sirve las vistas que guarda el trámite vivo.
pub fn with_the_invoice_scheme(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.register_uri_scheme_protocol(INVOICE_SCHEME, |context, request| {
        use tauri::Manager;

        let site = context.app_handle().state::<crate::site::SiteRoot>();
        served(request.uri(), &|handle| {
            crate::site::application::errand::the_invoice_view(&site.errand, handle)
        })
    })
}

#[cfg(test)]
mod tests;
