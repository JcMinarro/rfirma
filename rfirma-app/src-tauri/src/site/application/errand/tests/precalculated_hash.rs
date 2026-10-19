//! Pruebas de la marca de huella precalculada en el consentimiento de la firma suelta.

use super::support::*;
use super::support_requests::*;
use crate::documents::application::documents::OpenedDocuments;
use crate::identity::application::tests::{a_usable_certificate, listed_from};
use crate::signing::application::tests::a_memory;
use crate::site::application::errand::*;
use base64::Engine as _;

fn consent_declaring(properties: &str) -> Moment {
    let extra = format!(
        "&properties={}",
        base64::engine::general_purpose::URL_SAFE.encode(properties.as_bytes())
    );
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let live = a_live();
    let engine = AnEngine::answering(&[&[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");

    let step = consent_to_sign(
        &a_desk(
            &engine,
            &policies,
            &a_neighbourhood(home.path(), &listed, &opened, &memory),
            &scratch,
        ),
        &signature_requested(&a_signature_over(A_PDF, "sign", &extra)),
        ours,
        &live,
    );
    let ErrandStep::AskingToSign(consent) = step else {
        panic!("hay un certificado que la sede acepta: {step:?}");
    };
    consent.consenting()
}

fn is_marked_as_a_hash(moment: &Moment) -> bool {
    let Moment::AskingToSign {
        precalculated_hash, ..
    } = moment
    else {
        panic!("es el consentimiento de firma: {moment:?}");
    };
    *precalculated_hash
}

#[test]
fn a_signature_declaring_a_precalculated_hash_algorithm_reaches_the_consent_marked() {
    for declared in [
        "precalculatedHashAlgorithm=SHA-256\n",
        "precalculatedHashAlgorithm=\n",
        "precalculatedHashAlgorithm=nonsense\n",
    ] {
        assert!(
            is_marked_as_a_hash(&consent_declaring(declared)),
            "{declared}"
        );
    }
}

#[test]
fn a_signature_without_a_precalculated_hash_algorithm_reaches_the_consent_unmarked() {
    assert!(!is_marked_as_a_hash(&consent_declaring("")));
    assert!(!is_marked_as_a_hash(&consent_declaring("mode=implicit\n")));
}

#[test]
fn the_mark_of_a_precalculated_hash_crosses_to_the_window() {
    for (declared, expected) in [("precalculatedHashAlgorithm=SHA-256\n", true), ("", false)] {
        let view = crate::site::adapters::views::SiteErrandView::from(&consent_declaring(declared));

        assert_eq!(
            serde_json::to_value(&view).expect("serializa")["stage"]["precalculatedHash"],
            serde_json::json!(expected)
        );
    }
}
