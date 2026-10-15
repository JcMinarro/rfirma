//! Pruebas de la vista de factura que el trámite prepara por el asa del documento y sirve después.

use std::cell::Cell;

use super::support::*;
use super::support_requests::{a_signature_asking_for, A_PDF};
use crate::documents::application::documents::{opened_document, OpenedDocuments};
use crate::identity::application::tests::{a_usable_certificate, listed_from};
use crate::signing::application::tests::a_memory;
use crate::site::application::errand::*;
use crate::site::domain::channel::ArrivalMode;
use crate::site::domain::protocol::NegotiatedCredential;

const REFERENCE_INVOICE: &str = include_str!("../../../../../../../testdata/reference/invoice.xml");
const REFERENCE_NAMESPACE: &str = "http://www.facturae.es/Facturae/2009/v3.2/Facturae";
const NAMESPACE_3_2_2: &str = "http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml";
const THE_HTML: &str = "<html><body>Talleres Inventados del Norte SL</body></html>";

fn an_invoice() -> Vec<u8> {
    REFERENCE_INVOICE
        .replace(REFERENCE_NAMESPACE, NAMESPACE_3_2_2)
        .into_bytes()
}

/// Un consentimiento de firma sobre un documento, con el asa que enseña.
struct Consenting {
    _home: tempfile::TempDir,
    opened: OpenedDocuments,
    live: LiveErrand,
    document: String,
}

impl Consenting {
    fn read(&self) -> impl Fn(&str) -> Result<Vec<u8>, String> + '_ {
        |handle| {
            let document = opened_document(&self.opened, handle).map_err(|e| format!("{e:?}"))?;
            std::fs::read(document.reading_path()).map_err(|e| e.to_string())
        }
    }
}

fn consenting_to_sign(format: &str, document: &[u8]) -> Consenting {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let live = a_live();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let mut neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    neighbours.ours = ours;
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    assert!(live.begin(Errand::of(
        NegotiatedCredential::Required(a_credential()),
        ArrivalMode::Awaited,
        a_codec()
    )));
    let (reply, _wire) = the_wire();
    let step = attend(
        &desk,
        a_signature_asking_for(format, document),
        reply,
        &live,
    )
    .expect("hay codec");
    let ErrandStep::AskingToSign(asking) = step else {
        panic!("hay un certificado que la sede acepta: {step:?}");
    };
    let document = asking.document.handle;
    drop(desk);
    drop(neighbours);
    Consenting {
        _home: home,
        opened,
        live,
        document,
    }
}

#[test]
fn an_invoice_that_transforms_has_a_view_and_its_html_is_served_by_its_handle() {
    let consenting = consenting_to_sign("XAdES", &an_invoice());

    let prepared = prepare_the_invoice_view(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        &|_| Some(THE_HTML.to_owned()),
    );

    assert!(prepared);
    assert_eq!(
        the_invoice_view(&consenting.live, &consenting.document).as_deref(),
        Some(THE_HTML)
    );
}

#[test]
fn the_invoice_is_transformed_from_the_bytes_the_site_sent() {
    let invoice = an_invoice();
    let consenting = consenting_to_sign("XAdES", &invoice);
    let transformed = std::cell::RefCell::new(Vec::new());

    prepare_the_invoice_view(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        &|bytes| {
            transformed.borrow_mut().extend_from_slice(bytes);
            Some(THE_HTML.to_owned())
        },
    );

    assert!(
        transformed.into_inner() == invoice,
        "se transforman los bytes de la sede"
    );
}

#[test]
fn an_invoice_the_stylesheet_cannot_transform_has_no_view() {
    let consenting = consenting_to_sign("XAdES", &an_invoice());

    let prepared = prepare_the_invoice_view(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        &|_| None,
    );

    assert!(!prepared);
    assert_eq!(
        the_invoice_view(&consenting.live, &consenting.document),
        None
    );
}

#[test]
fn a_document_that_is_not_an_invoice_has_no_view_and_is_not_transformed() {
    let consenting = consenting_to_sign("PAdES", A_PDF);
    let transforms = Cell::new(0);

    let prepared = prepare_the_invoice_view(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        &|_| {
            transforms.set(transforms.get() + 1);
            Some(THE_HTML.to_owned())
        },
    );

    assert!(!prepared);
    assert_eq!(transforms.get(), 0);
    assert_eq!(
        the_invoice_view(&consenting.live, &consenting.document),
        None
    );
}

#[test]
fn an_unknown_handle_has_no_view_and_is_not_read() {
    let consenting = consenting_to_sign("XAdES", &an_invoice());
    let reads = Cell::new(0);

    let prepared = prepare_the_invoice_view(
        &consenting.live,
        "otra-asa",
        &|_: &str| {
            reads.set(reads.get() + 1);
            Ok(an_invoice())
        },
        &|_| Some(THE_HTML.to_owned()),
    );

    assert!(!prepared);
    assert_eq!(reads.get(), 0, "no se leen los bytes de un asa ajena");
    assert_eq!(the_invoice_view(&consenting.live, "otra-asa"), None);
}

#[test]
fn a_handle_without_a_prepared_view_has_nothing_to_serve() {
    let consenting = consenting_to_sign("XAdES", &an_invoice());

    assert_eq!(
        the_invoice_view(&consenting.live, &consenting.document),
        None
    );
}

#[test]
fn the_prepared_view_is_forgotten_when_the_errand_ends() {
    let consenting = consenting_to_sign("XAdES", &an_invoice());
    prepare_the_invoice_view(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        &|_| Some(THE_HTML.to_owned()),
    );

    consenting.live.end();

    assert_eq!(
        the_invoice_view(&consenting.live, &consenting.document),
        None
    );
}
