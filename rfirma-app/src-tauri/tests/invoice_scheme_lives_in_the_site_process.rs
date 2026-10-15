//! Guarda del esquema de la vista de factura: lo registra solo el proceso del trámite (ADR-0024) y la CSP de la ventana solo lo admite en `frame-src` (ADR-0051).

use std::fs;
use std::path::{Path, PathBuf};

const REGISTRATION: &str = "with_the_invoice_scheme(";
const SCHEME_REGISTRARS: [&str; 2] = [
    "register_uri_scheme_protocol",
    "register_asynchronous_uri_scheme_protocol",
];
const THE_ADAPTER: &str = "src/site/adapters/invoice_scheme.rs";

const CSP_BEFORE_THE_SCHEME: &str =
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'";
const FRAME_SRC: &str = "frame-src rfirma-invoice://localhost http://rfirma-invoice.localhost";

fn crate_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn rust_files_in(folder: &Path, found: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(folder).expect("deberia leerse la carpeta") {
        let path = entry.expect("deberia leerse la entrada").path();
        if path.is_dir() {
            rust_files_in(&path, found);
        } else if path.extension().is_some_and(|extension| extension == "rs") {
            found.push(path);
        }
    }
}

fn body_of<'a>(source: &'a str, function: &str) -> &'a str {
    let start = source
        .find(&format!("fn {function}("))
        .unwrap_or_else(|| panic!("lib.rs deberia tener `fn {function}`"));
    let rest = &source[start..];
    let end = rest.find("\n}\n").map_or(rest.len(), |end| end + 3);
    &rest[..end]
}

#[test]
fn only_the_site_role_registers_the_invoice_scheme() {
    let lib = fs::read_to_string(crate_root().join("src/lib.rs")).expect("deberia leerse lib.rs");

    assert_eq!(
        lib.matches(REGISTRATION).count(),
        1,
        "el esquema se registra una sola vez"
    );
    assert!(
        body_of(&lib, "run_site").contains(REGISTRATION),
        "el esquema se registra en el rol de sede, no en el de escritorio"
    );
}

#[test]
fn no_module_but_the_adapter_registers_a_uri_scheme() {
    let mut files = Vec::new();
    rust_files_in(&crate_root().join("src"), &mut files);
    let offenders: Vec<String> = files
        .iter()
        .filter(|path| !path.ends_with(THE_ADAPTER))
        .filter(|path| {
            let source = fs::read_to_string(path).expect("deberia leerse el modulo");
            SCHEME_REGISTRARS
                .iter()
                .any(|registrar| source.contains(registrar))
        })
        .map(|path| path.display().to_string())
        .collect();

    assert!(
        offenders.is_empty(),
        "solo `{THE_ADAPTER}` registra un esquema: {offenders:?}"
    );
}

#[test]
fn the_window_csp_only_adds_both_forms_of_the_scheme_to_frame_src() {
    let config: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(crate_root().join("tauri.conf.json"))
            .expect("deberia leerse tauri.conf.json"),
    )
    .expect("tauri.conf.json deberia ser JSON");

    assert_eq!(
        config["app"]["security"]["csp"],
        format!("{CSP_BEFORE_THE_SCHEME}; {FRAME_SRC}")
    );
}
