use tauri::http::{header, StatusCode, Uri};

use super::{served, INVOICE_SCHEME};

const HANDLE: &str = "0123456789abcdef0123456789abcdef";
const THE_HTML: &str = "<html><body>Talleres Inventados del Norte SL</body></html>";
const THE_CSP: &str =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:";

fn prepared(handle: &str) -> Option<String> {
    (handle == HANDLE).then(|| THE_HTML.to_owned())
}

fn uri(text: &str) -> Uri {
    text.parse().expect("la URI de prueba es válida")
}

#[test]
fn a_prepared_view_is_served_as_html_with_its_own_csp_in_both_forms_of_the_scheme() {
    for form in [
        format!("{INVOICE_SCHEME}://localhost/{HANDLE}"),
        format!("http://{INVOICE_SCHEME}.localhost/{HANDLE}"),
    ] {
        let response = served(&uri(&form), &prepared);

        assert_eq!(response.status(), StatusCode::OK, "{form}");
        assert_eq!(response.body().as_slice(), THE_HTML.as_bytes(), "{form}");
        assert_eq!(
            response.headers()[header::CONTENT_SECURITY_POLICY],
            THE_CSP,
            "{form}"
        );
        assert_eq!(
            response.headers()[header::CONTENT_TYPE],
            "text/html; charset=utf-8",
            "{form}"
        );
    }
}

#[test]
fn a_handle_without_a_prepared_view_is_not_found() {
    let response = served(
        &uri(&format!("{INVOICE_SCHEME}://localhost/otra-asa")),
        &prepared,
    );

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert!(response.body().is_empty());
}
