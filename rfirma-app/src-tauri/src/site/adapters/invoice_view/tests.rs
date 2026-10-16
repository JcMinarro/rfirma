use sha2::{Digest, Sha256};

use super::{invoice_html, STYLESHEET_3_2, STYLESHEET_3_2_1, STYLESHEET_3_2_2};

const SOURCE_NOTE: &str = include_str!("../../../../stylesheets/facturae/README.md");

fn noted_sha256_of(file: &str) -> String {
    let row = SOURCE_NOTE
        .lines()
        .find(|line| line.starts_with(&format!("| `{file}`")))
        .unwrap_or_else(|| panic!("la nota de origen no lista {file}"));
    row.split('`')
        .rev()
        .nth(1)
        .expect("la fila lleva el SHA-256 entre comillas invertidas")
        .to_owned()
}

fn sha256_of(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[test]
fn the_stylesheets_in_the_binary_are_byte_for_byte_those_of_the_source_note() {
    for (file, bytes) in [
        ("FacturaeTemplate-3.2.xsl", STYLESHEET_3_2),
        ("visorFace-3.2.1.xsl", STYLESHEET_3_2_1),
        ("visorFace-3.2.2.xsl", STYLESHEET_3_2_2),
    ] {
        assert_eq!(sha256_of(bytes), noted_sha256_of(file), "{file}");
    }
}

const REFERENCE_INVOICE: &str = include_str!("../../../../../../testdata/reference/invoice.xml");
const REFERENCE_NAMESPACE: &str = "http://www.facturae.es/Facturae/2009/v3.2/Facturae";
const NAMESPACE_3_1: &str = "http://www.facturae.es/Facturae/2007/v3.1/Facturae";
const NAMESPACE_3_2_1: &str = "http://www.facturae.es/Facturae/2014/v3.2.1/Facturae";
const NAMESPACE_3_2_2: &str = "http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml";

const SELLER: &str = "Talleres Inventados del Norte SL";

fn an_invoice_in(namespace: &str) -> String {
    REFERENCE_INVOICE
        .replace(REFERENCE_NAMESPACE, namespace)
        .replace("rfirma pruebas SL", SELLER)
}

#[test]
fn an_invoice_of_each_version_with_stylesheet_shows_its_seller_and_its_total() {
    for namespace in [REFERENCE_NAMESPACE, NAMESPACE_3_2_1, NAMESPACE_3_2_2] {
        let html = invoice_html(an_invoice_in(namespace).as_bytes())
            .unwrap_or_else(|| panic!("la factura de {namespace} tiene vista"));

        assert!(html.contains(SELLER), "{namespace} sin emisor: {html}");
        assert!(html.contains("121,00"), "{namespace} sin total: {html}");
    }
}

#[test]
fn an_invoice_of_a_version_without_stylesheet_has_no_view() {
    assert_eq!(invoice_html(an_invoice_in(NAMESPACE_3_1).as_bytes()), None);
}

#[test]
fn a_malformed_invoice_has_no_view() {
    let truncated = an_invoice_in(NAMESPACE_3_2_2).replace("</fe:Facturae>", "");

    assert_eq!(invoice_html(truncated.as_bytes()), None);
}

const SECRET: &str = "SECRETO-DE-PRUEBA";

fn an_invoice_whose_seller_is_the_entity(declaration: &str) -> String {
    an_invoice_in(NAMESPACE_3_2_2)
        .replace(SELLER, "&seller;")
        .replacen(
            "?>",
            &format!("?>\n<!DOCTYPE fe:Facturae [<!ENTITY seller {declaration}>]>"),
            1,
        )
}

fn file_url(path: &std::path::Path) -> String {
    let path = path.display().to_string().replace('\\', "/");
    format!("file:///{}", path.trim_start_matches('/'))
}

#[test]
fn an_internal_entity_of_the_invoice_reaches_its_view() {
    let invoice = an_invoice_whose_seller_is_the_entity(&format!("\"{SELLER}\""));

    let html =
        invoice_html(invoice.as_bytes()).expect("la factura con entidad interna tiene vista");

    assert!(html.contains(SELLER), "sin la entidad interna: {html}");
}

#[test]
fn an_invoice_cannot_read_a_local_file_through_an_external_entity() {
    let folder = tempfile::tempdir().expect("carpeta temporal");
    let secret = folder.path().join("secreto.txt");
    std::fs::write(&secret, SECRET).expect("fichero secreto");
    let invoice =
        an_invoice_whose_seller_is_the_entity(&format!("SYSTEM \"{}\"", file_url(&secret)));

    let html = invoice_html(invoice.as_bytes()).unwrap_or_default();

    assert!(!html.contains(SECRET), "la factura leyó el fichero: {html}");
}

#[test]
fn an_invoice_cannot_reach_a_url_through_an_external_entity() {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("puerto local");
    let address = listener.local_addr().expect("dirección local");
    let reached = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let witness = std::sync::Arc::clone(&reached);
    std::thread::spawn(move || {
        if let Ok((mut connection, _)) = listener.accept() {
            witness.store(true, std::sync::atomic::Ordering::SeqCst);
            let _ = std::io::Write::write_all(
                &mut connection,
                format!("HTTP/1.0 200 OK\r\n\r\n{SECRET}").as_bytes(),
            );
        }
    });
    let invoice = an_invoice_whose_seller_is_the_entity(&format!("SYSTEM \"http://{address}/\""));

    let html = invoice_html(invoice.as_bytes()).unwrap_or_default();

    assert!(!html.contains(SECRET), "la factura leyó la URL: {html}");
    assert!(
        !reached.load(std::sync::atomic::Ordering::SeqCst),
        "la factura llamó a {address}"
    );
}

const ACCENTED_SELLER: &str = "Compañía Ñandú de Facturación SL";

fn in_latin_1(text: &str) -> Vec<u8> {
    text.chars()
        .map(|character| u8::try_from(u32::from(character)).expect("cabe en ISO-8859-1"))
        .collect()
}

#[test]
fn an_invoice_in_iso_8859_1_keeps_its_accents() {
    let invoice = an_invoice_in(NAMESPACE_3_2_2)
        .replace("encoding=\"UTF-8\"", "encoding=\"ISO-8859-1\"")
        .replace(SELLER, ACCENTED_SELLER);

    let html = invoice_html(&in_latin_1(&invoice)).expect("la factura en ISO-8859-1 tiene vista");

    assert!(html.contains(ACCENTED_SELLER), "tildes perdidas: {html}");
}
