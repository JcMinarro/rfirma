//! Las pruebas de `sign -format facturae` y del rechazo de `cosign` sobre una factura, con el token de pruebas.

use super::*;

const AN_INVOICE: &[u8] = include_bytes!("../../../../testdata/reference/invoice.xml");
const A_SIGNED_INVOICE: &[u8] = include_bytes!("../../../../testdata/reference/facturae.xsig");
const FACTURAE_POLICY: &str = "politica_de_firma_formato_facturae_v3_1.pdf";

struct Run {
    _home: tempfile::TempDir,
    roots: Roots,
    outcome: Outcome,
    output: PathBuf,
}

fn ran_with_the_bridge(command: &str, input: &[u8], extra: &[&str]) -> Run {
    let (home, alias) = a_home_with_an_installed_certificate();
    let roots = the_roots_under(home.path());
    ran_in(home, alias, roots, command, input, extra)
}

fn ran_without_a_bridge(command: &str, input: &[u8], extra: &[&str]) -> Run {
    let (home, alias) = a_home_with_an_installed_certificate();
    let mut roots = the_roots_under(home.path());
    roots.signing.isolate = Isolate::start_with(|| {
        Err(BridgeError::Failed(
            "el puente no debe llegar a usarse".to_owned(),
        ))
    });
    ran_in(home, alias, roots, command, input, extra)
}

fn ran_in(
    home: tempfile::TempDir,
    alias: String,
    roots: Roots,
    command: &str,
    input: &[u8],
    extra: &[&str],
) -> Run {
    let input_path = home.path().join("factura.xml");
    std::fs::write(&input_path, input).expect("la factura deberia escribirse");
    let output = home.path().join("salida");
    let mut words = vec![
        command,
        "-i",
        input_path.to_str().expect("ruta UTF-8"),
        "-o",
        output.to_str().expect("ruta UTF-8"),
        "-alias",
        &alias,
    ];
    words.extend_from_slice(extra);
    let outcome = attended_with_the_roots(&words, &roots, &ScriptedTerminal::without_a_tty());
    Run {
        _home: home,
        roots,
        outcome,
        output,
    }
}

fn assert_refused_before_signing(run: &Run, reason: &str) {
    assert_eq!(run.outcome.exit_code, REFUSED, "{:?}", run.outcome.stderr);
    assert!(
        run.outcome.stderr.concat().contains(reason),
        "{:?}",
        run.outcome.stderr
    );
    assert!(run.outcome.stdout.is_empty());
    assert!(!run.output.exists());
    assert_eq!(run.roots.identity.remembered_certificate(), None);
}

fn the_signed_text_of(run: &Run, format: Format) -> String {
    assert_eq!(run.outcome.exit_code, SUCCEEDED, "{:?}", run.outcome.stderr);
    let signed = std::fs::read(&run.output).expect("la firma deberia estar en -o");
    assert_eq!(
        super::formats::verdict_in(&run.roots, &signed, format),
        SignatureVerdict::Valid
    );
    String::from_utf8_lossy(&signed).into_owned()
}

#[test]
#[ignore = "grada C: necesita librfirma_crypto.so (just test-native)"]
fn sign_facturae_signs_the_invoice_with_a_valid_facturae_signature_and_its_policy() {
    let run = ran_with_the_bridge("sign", AN_INVOICE, &["-format", "facturae"]);

    let signed = the_signed_text_of(&run, Format::FacturaE);

    assert!(signed.contains(FACTURAE_POLICY), "{signed}");
}

#[test]
#[ignore = "grada C: necesita librfirma_crypto.so (just test-native)"]
fn sign_facturae_carries_the_production_place_and_the_role_declared_in_config() {
    let run = ran_with_the_bridge(
        "sign",
        AN_INVOICE,
        &[
            "-format",
            "facturae",
            "-config",
            "signatureProductionCity=Córdoba\\nsignerClaimedRoles=tercero",
        ],
    );

    let signed = the_signed_text_of(&run, Format::FacturaE);

    assert!(signed.contains("Córdoba"), "{signed}");
    assert!(signed.contains("tercero"), "{signed}");
}

#[test]
#[ignore = "grada C: necesita librfirma_crypto.so (just test-native)"]
fn sign_auto_keeps_signing_an_invoice_in_xades_enveloping() {
    let run = ran_with_the_bridge("sign", AN_INVOICE, &["-format", "auto"]);

    let signed = the_signed_text_of(
        &run,
        Format::Xades(rfirma_lib::signing::domain::bridge::XadesVariant::Enveloping),
    );

    assert!(!signed.contains(FACTURAE_POLICY), "{signed}");
}

#[test]
fn sign_facturae_on_an_xml_that_is_not_an_invoice_is_refused_before_the_card() {
    let run = ran_without_a_bridge(
        "sign",
        b"<?xml version=\"1.0\"?><documento/>",
        &["-format", "facturae"],
    );

    assert_refused_before_signing(&run, "no es una factura");
}

#[test]
fn sign_facturae_on_a_pdf_is_refused_before_the_card() {
    let run = ran_without_a_bridge("sign", &a_one_page_pdf(), &["-format", "facturae"]);

    assert_refused_before_signing(&run, "no es una factura");
}

#[test]
fn cosign_on_a_signed_invoice_is_refused_before_the_card_with_facturae_and_with_auto() {
    for extra in [&["-format", "facturae"][..], &["-format", "auto"][..]] {
        let run = ran_without_a_bridge("cosign", A_SIGNED_INVOICE, extra);

        assert_refused_before_signing(&run, "FacturaE no admite cofirma ni contrafirma");
    }
}
