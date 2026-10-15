use super::*;
use crate::signing::domain::bridge::XadesVariant;

const AN_XML: &[u8] = b"<?xml version=\"1.0\"?><raiz>datos</raiz>";
const A_BINARY: &[u8] = b"\x00\x01 no es un PDF ni un XML";
const AN_INVOICE: &[u8] =
    b"<?xml version=\"1.0\"?><fe:Facturae><FileHeader/><Parties/><Invoices/></fe:Facturae>";

fn format_asked_for(words: &[&str]) -> SignatureFormat {
    let files = FilesInMemory::with("entrada", AN_INVOICE);
    let signer = RecordingSigner::default();
    let mut all = vec!["sign", "-i", "entrada", "-o", "salida", "-alias", "yo"];
    all.extend_from_slice(words);

    let outcome = signed_over(&all, &files, &signer);

    assert_eq!(outcome.exit_code, SUCCEEDED, "{}", said(&outcome));
    let asked = signer.asked.borrow();
    asked[0].2
}

#[test]
fn sign_facturae_signs_an_invoice_in_facturae_in_any_case() {
    for name in ["facturae", "FacturaE", "FACTURAE"] {
        assert_eq!(
            format_asked_for(&["-format", name]),
            SignatureFormat::FacturaE
        );
    }
}

#[test]
fn sign_auto_keeps_signing_an_invoice_in_xades_enveloping() {
    assert_eq!(
        format_asked_for(&["-format", "auto"]),
        SignatureFormat::Xades(XadesVariant::Enveloping)
    );
}

#[test]
fn sign_facturae_refuses_what_is_not_an_invoice_before_choosing_the_certificate() {
    for input in [AN_XML, A_PDF, A_BINARY] {
        let files = FilesInMemory::with("entrada", input);
        let signer = RecordingSigner::default();

        let outcome = signed_over(
            &[
                "sign", "-i", "entrada", "-o", "salida", "-alias", "yo", "-format", "facturae",
            ],
            &files,
            &signer,
        );

        assert_eq!(outcome.exit_code, REFUSED, "{}", said(&outcome));
        assert!(said(&outcome).contains("factura"), "{}", said(&outcome));
        assert!(signer.asked.borrow().is_empty());
        assert!(signer.remembered.borrow().is_empty());
        assert_eq!(files.at("salida"), None);
    }
}

#[test]
fn cosign_refuses_an_invoice_whatever_the_format_before_choosing_the_certificate() {
    for format in [
        &["-format", "facturae"][..],
        &["-format", "auto"][..],
        &[][..],
    ] {
        let files = FilesInMemory::with("entrada", AN_INVOICE);
        let signer = RecordingSigner::default();
        let mut words = vec!["cosign", "-i", "entrada", "-o", "salida", "-alias", "yo"];
        words.extend_from_slice(format);

        let outcome = signed_over(&words, &files, &signer);

        assert_eq!(outcome.exit_code, REFUSED, "{format:?}: {}", said(&outcome));
        assert!(
            said(&outcome).contains("FacturaE no admite cofirma ni contrafirma"),
            "{}",
            said(&outcome)
        );
        assert!(signer.asked.borrow().is_empty());
        assert_eq!(files.at("salida"), None);
    }
}
