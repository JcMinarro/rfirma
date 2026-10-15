//! Pruebas de la copia temporal que «Abrir con…» entrega al sistema operativo.

use std::cell::Cell;

use super::support::*;
use super::support_requests::{a_signature_asking_for, A_PDF};
use crate::documents::application::documents::{opened_document, OpenedDocuments};
use crate::identity::application::tests::{a_usable_certificate, listed_from};
use crate::signing::application::tests::a_memory;
use crate::site::application::errand::*;
use crate::site::domain::channel::ArrivalMode;
use crate::site::domain::protocol::NegotiatedCredential;

/// Lleva el trámite al consentimiento de una firma sobre `document` y devuelve el asa que enseña.
fn asked_to_sign(
    desk: &ErrandDesk<'_, AnEngine, APolicyEngine>,
    live: &LiveErrand,
    format: &str,
    document: &[u8],
) -> String {
    assert!(live.begin(Errand::of(
        NegotiatedCredential::Required(a_credential()),
        ArrivalMode::Awaited,
        a_codec()
    )));
    let (reply, _wire) = the_wire();
    let step =
        attend(desk, a_signature_asking_for(format, document), reply, live).expect("hay codec");
    let ErrandStep::AskingToSign(asking) = step else {
        panic!("hay un certificado que la sede acepta: {step:?}");
    };
    asking.document.handle
}

fn read_from(opened: &OpenedDocuments) -> impl Fn(&str) -> Result<Vec<u8>, String> + '_ {
    |handle| {
        let document = opened_document(opened, handle).map_err(|e| format!("{e:?}"))?;
        std::fs::read(document.reading_path()).map_err(|e| e.to_string())
    }
}

#[test]
fn a_recognised_document_is_copied_with_the_extension_of_its_detected_type() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let mut neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    neighbours.ours = ours;
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();
    let handle = asked_to_sign(&desk, &live, "PAdES", A_PDF);

    let copy =
        copy_to_open(&desk, &live, &handle, &read_from(&opened)).expect("un PDF se reconoce");

    assert_eq!(copy.extension().and_then(|e| e.to_str()), Some("pdf"));
    assert_eq!(std::fs::read(&copy).expect("la copia existe"), A_PDF);
}

#[test]
fn a_document_of_no_recognised_type_is_not_copied() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let mut neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    neighbours.ours = ours;
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();
    let handle = asked_to_sign(&desk, &live, "CAdES", &[0x00, 0x01, 0x02, 0xff]);
    let copies_before = std::fs::read_dir(&scratch).map_or(0, |entries| entries.count());

    let refused = copy_to_open(&desk, &live, &handle, &read_from(&opened));

    assert_eq!(refused, Err(CopyToOpenError::Unrecognised));
    assert_eq!(
        std::fs::read_dir(&scratch).map_or(0, |entries| entries.count()),
        copies_before,
        "no se ha escrito nada"
    );
}

#[test]
fn a_handle_the_consent_does_not_show_is_not_read_nor_copied() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let mut neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    neighbours.ours = ours;
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();
    let _ = asked_to_sign(&desk, &live, "PAdES", A_PDF);
    let reads = Cell::new(0);

    let refused = copy_to_open(&desk, &live, "otra-asa", &|_: &str| {
        reads.set(reads.get() + 1);
        Ok(A_PDF.to_vec())
    });

    assert_eq!(
        refused,
        Err(CopyToOpenError::NotReceived("otra-asa".to_owned()))
    );
    assert_eq!(reads.get(), 0, "no se leen los bytes de un asa ajena");
}

#[test]
fn the_copy_is_erased_when_the_errand_ends() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let mut neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    neighbours.ours = ours;
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();
    let handle = asked_to_sign(&desk, &live, "PAdES", A_PDF);
    let copy =
        copy_to_open(&desk, &live, &handle, &read_from(&opened)).expect("un PDF se reconoce");

    live.end();

    assert!(!copy.exists(), "la copia se borra con el trámite");
}
