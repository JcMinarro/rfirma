//! Pruebas de la copia temporal que «Abrir con…» entrega al sistema operativo.

use super::support::*;
use super::support_requests::A_PDF;
use crate::documents::application::documents::OpenedDocuments;
use crate::identity::application::certificates::ListedCertificates;
use crate::signing::application::tests::a_memory;
use crate::site::application::errand::*;

#[test]
fn a_recognised_document_is_copied_with_the_extension_of_its_detected_type() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let listed = ListedCertificates::new();
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();

    let copy = copy_to_open(&desk, &live, A_PDF).expect("un PDF se reconoce");

    assert_eq!(copy.extension().and_then(|e| e.to_str()), Some("pdf"));
    assert_eq!(std::fs::read(&copy).expect("la copia existe"), A_PDF);
}

#[test]
fn a_document_of_no_recognised_type_is_not_copied() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let listed = ListedCertificates::new();
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();

    let refused = copy_to_open(&desk, &live, &[0x00, 0x01, 0x02, 0xff]);

    assert_eq!(refused, Err(CopyToOpenError::Unrecognised));
    assert!(!scratch.exists(), "no se ha escrito nada");
}

#[test]
fn the_copy_is_erased_when_the_errand_ends() {
    let home = tempfile::tempdir().expect("hay directorio temporal");
    let memory = a_memory(home.path());
    let listed = ListedCertificates::new();
    let opened = OpenedDocuments::new();
    let engine = AnEngine::answering(&[]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let neighbours = a_neighbourhood(home.path(), &listed, &opened, &memory);
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);
    let live = a_live();
    let copy = copy_to_open(&desk, &live, A_PDF).expect("un PDF se reconoce");

    live.end();

    assert!(!copy.exists(), "la copia se borra con el trámite");
}
