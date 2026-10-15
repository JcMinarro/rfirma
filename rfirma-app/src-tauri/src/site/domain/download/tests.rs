use std::io::Read;

use super::*;

fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::Digest;
    sha2::Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn a_file(name: &str, bytes: &[u8]) -> Download {
    Download {
        name: name.to_owned(),
        bytes: bytes.to_vec(),
    }
}

/// Cada entrada del `.zip`, con su nombre y sus bytes, en el orden en que se escribió.
fn unpacked(archive: &[u8]) -> Vec<(String, Vec<u8>)> {
    let mut zip =
        zip::ZipArchive::new(std::io::Cursor::new(archive)).expect("deberia ser un .zip legible");
    (0..zip.len())
        .map(|index| {
            let mut entry = zip.by_index(index).expect("deberia leerse la entrada");
            let mut bytes = Vec::new();
            entry
                .read_to_end(&mut bytes)
                .expect("deberia descomprimirse la entrada");
            let name = entry
                .name()
                .expect("deberia tener nombre la entrada")
                .into_owned();
            (name, bytes)
        })
        .collect()
}

#[test]
fn the_name_the_site_proposes_keeps_the_extension_of_its_detected_type() {
    assert_eq!(
        file_name(Some("factura.pdf"), DocumentType::Pdf),
        "factura.pdf"
    );
}

#[test]
fn the_extension_comes_from_the_detected_type_and_not_from_the_name() {
    assert_eq!(
        file_name(Some("factura.pdf"), DocumentType::Unknown),
        "factura.bin"
    );
    assert_eq!(file_name(Some("acta.PDF"), DocumentType::Xml), "acta.xml");
}

#[test]
fn a_name_without_extension_takes_the_one_of_its_type() {
    assert_eq!(file_name(Some("informe"), DocumentType::Xml), "informe.xml");
}

#[test]
fn a_document_without_a_name_gets_a_default_one_with_its_type() {
    assert_eq!(file_name(None, DocumentType::Png), "documento.png");
    assert_eq!(file_name(Some("  "), DocumentType::Pdf), "documento.pdf");
    assert_eq!(file_name(Some(".pdf"), DocumentType::Pdf), "documento.pdf");
}

#[test]
fn a_name_the_site_proposes_never_climbs_out_of_the_chosen_folder() {
    for proposed in [
        "../../.bashrc",
        "a/b\\c.txt",
        "/etc/passwd",
        "..",
        "linea\nnueva.txt",
    ] {
        let name = file_name(Some(proposed), DocumentType::Text);

        assert!(
            !name.contains('/') && !name.contains('\\') && !name.starts_with('.'),
            "{proposed:?} da {name:?}"
        );
        assert!(
            !name.chars().any(char::is_control),
            "{proposed:?} da {name:?}"
        );
        assert!(name.ends_with(".txt"), "{proposed:?} da {name:?}");
    }
}

#[test]
fn the_archive_carries_every_document_with_its_name_and_its_bytes() {
    let archive = archive_of(&[
        a_file("acta.pdf", b"%PDF-1.7\nuno"),
        a_file("anexo.xml", b"<?xml version=\"1.0\"?><a/>"),
    ])
    .expect("deberia escribirse el .zip");

    let entries = unpacked(&archive);

    assert_eq!(
        entries[0],
        ("acta.pdf".to_owned(), b"%PDF-1.7\nuno".to_vec())
    );
    assert_eq!(
        entries[1],
        (
            "anexo.xml".to_owned(),
            b"<?xml version=\"1.0\"?><a/>".to_vec()
        )
    );
}

#[test]
fn the_archive_closes_with_a_sha256sums_whose_sums_match_each_file() {
    let archive = archive_of(&[
        a_file("acta.pdf", b"%PDF-1.7\nuno"),
        a_file("anexo.xml", b"<?xml version=\"1.0\"?><a/>"),
    ])
    .expect("deberia escribirse el .zip");

    let entries = unpacked(&archive);
    let (name, sums) = entries.last().expect("deberia haber entradas");

    assert_eq!(name, "SHA256SUMS");
    let sums = String::from_utf8(sums.clone()).expect("SHA256SUMS es texto");
    let documents = &entries[..entries.len() - 1];
    let expected: String = documents
        .iter()
        .map(|(name, bytes)| format!("{}  {name}\n", sha256_hex(bytes)))
        .collect();
    assert_eq!(sums, expected);
}

#[test]
fn the_sums_are_those_of_sha256sum_over_the_same_bytes() {
    let sums = checksums_of(&[a_file("vacio.txt", b"")]);

    assert_eq!(
        sums,
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  vacio.txt\n"
    );
}

#[test]
fn two_documents_with_the_same_name_do_not_overwrite_each_other_in_the_archive() {
    let archive = archive_of(&[
        a_file("acta.pdf", b"%PDF-1.7\nuno"),
        a_file("acta.pdf", b"%PDF-1.7\ndos"),
    ])
    .expect("deberia escribirse el .zip");

    let names: Vec<String> = unpacked(&archive)
        .into_iter()
        .map(|(name, _)| name)
        .collect();

    assert_eq!(names, ["acta.pdf", "acta (2).pdf", "SHA256SUMS"]);
}
