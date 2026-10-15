use super::*;

const AN_INVOICE: &[u8] = b"<?xml version=\"1.0\"?>\
<fe:Facturae xmlns:fe=\"http://www.facturae.es/Facturae/2009/v3.2/Facturae\">\
<FileHeader><SchemaVersion>3.2</SchemaVersion></FileHeader>\
<Parties><SellerParty/></Parties>\
<Invoices><Invoice/></Invoices>\
</fe:Facturae>";

#[test]
fn a_pdf_header_is_a_pdf() {
    assert_eq!(shape_of(b"%PDF-1.7\n%obj..."), DetectedShape::Pdf);
}

#[test]
fn an_xml_prolog_is_xml() {
    assert_eq!(
        shape_of(b"<?xml version=\"1.0\"?><documento>hola</documento>"),
        DetectedShape::Xml
    );
}

#[test]
fn a_leading_angle_bracket_without_a_prolog_is_xml() {
    assert_eq!(shape_of(b"   <documento/>"), DetectedShape::Xml);
}

#[test]
fn anything_else_is_binary() {
    assert_eq!(shape_of(&[0x00, 0x01, 0x02, 0x03]), DetectedShape::Binary);
}

#[test]
fn a_facturae_root_with_its_three_children_is_an_invoice() {
    assert_eq!(shape_of(AN_INVOICE), DetectedShape::Invoice);
}

#[test]
fn the_reference_invoice_of_the_kit_is_an_invoice() {
    assert_eq!(
        shape_of(include_bytes!(
            "../../../../../../../testdata/reference/invoice.xml"
        )),
        DetectedShape::Invoice
    );
}

#[test]
fn a_root_that_is_not_facturae_is_plain_xml_however_many_children_it_has() {
    assert_eq!(
        shape_of(b"<Factura><FileHeader/><Parties/><Invoices/></Factura>"),
        DetectedShape::Xml
    );
}

#[test]
fn a_facturae_root_missing_one_of_the_three_children_is_plain_xml() {
    assert_eq!(
        shape_of(b"<Facturae><FileHeader/><Parties/></Facturae>"),
        DetectedShape::Xml
    );
}

#[test]
fn the_three_children_have_to_hang_from_the_root_and_not_from_a_grandchild() {
    assert_eq!(
        shape_of(b"<Facturae><FileHeader/><Wrapper><Parties/><Invoices/></Wrapper></Facturae>"),
        DetectedShape::Xml
    );
}

#[test]
fn what_starts_like_xml_but_does_not_parse_is_plain_xml_and_not_an_invoice() {
    assert_eq!(
        shape_of(b"<Facturae><FileHeader></Parties>"),
        DetectedShape::Xml
    );
}

#[test]
fn a_pdf_with_byterange_or_type_sig_is_detected_as_pdf_signature() {
    assert_eq!(
        detect_signature(b"%PDF-1.7\n/ByteRange [0 10 20 30]\n"),
        Some(DetectedSignature::Pdf)
    );
    assert_eq!(
        detect_signature(b"%PDF-1.7\n<< /Type /Sig >>\n"),
        Some(DetectedSignature::Pdf)
    );
    assert_eq!(
        detect_signature(b"%PDF-1.7\n<< /Type/Sig >>\n"),
        Some(DetectedSignature::Pdf)
    );
    assert_eq!(detect_signature(b"%PDF-1.7\nsin firma"), None);
}

#[test]
fn a_signed_xml_is_detected_as_xml_signature() {
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/xades-enveloping.xml"
        )),
        Some(DetectedSignature::Xml)
    );
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/document.xml"
        )),
        None
    );
}

const SIGNING_CERTIFICATE_V1: &[u8] = &[
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x02, 0x0c,
];
const SIGNING_CERTIFICATE_V2: &[u8] = &[
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x02, 0x2f,
];
const CONTENT_TYPE: &[u8] = &[0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x03];
const DATA: &[u8] = &[0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01];

fn tlv(tag: u8, content: &[u8]) -> Vec<u8> {
    let length = content.len();
    let mut encoded = vec![tag];
    match length {
        0..=0x7f => encoded.push(length as u8),
        0x80..=0xff => encoded.extend([0x81, length as u8]),
        _ => encoded.extend([0x82, (length >> 8) as u8, length as u8]),
    }
    encoded.extend_from_slice(content);
    encoded
}

fn an_attribute_of(oid: &[u8]) -> Vec<u8> {
    tlv(0x30, &[tlv(0x06, oid), tlv(0x31, &tlv(0x05, &[]))].concat())
}

fn a_signer_with_signed_attributes(attribute_types: Option<&[&[u8]]>) -> Vec<u8> {
    a_signer_with_encoded_attributes(
        attribute_types.map(|types| types.iter().flat_map(|oid| an_attribute_of(oid)).collect()),
    )
}

fn a_signer_with_encoded_attributes(attributes: Option<Vec<u8>>) -> Vec<u8> {
    let mut fields = [tlv(0x02, &[1]), tlv(0x30, &[]), tlv(0x30, &[])].concat();
    if let Some(attributes) = attributes {
        fields.extend(tlv(0xa0, &attributes));
    }
    fields.extend(tlv(0x30, &[]));
    fields.extend(tlv(0x04, b"firma"));
    tlv(0x30, &fields)
}

const NON_CANONICAL_INTEGER: &[u8] = &[0x02, 0x81, 0x05, 1, 2, 3, 4, 5];

/// Un `ContentInfo` de `SignedData` mínimo, en DER, con los firmantes dados.
pub(crate) fn a_signed_data_with(signers: &[Vec<u8>]) -> Vec<u8> {
    let signed_data = tlv(
        0x30,
        &[
            tlv(0x02, &[1]),
            tlv(0x31, &[]),
            tlv(0x30, &tlv(0x06, DATA)),
            tlv(0x31, &signers.concat()),
        ]
        .concat(),
    );
    tlv(
        0x30,
        &[OID_SIGNED_DATA.to_vec(), tlv(0xa0, &signed_data)].concat(),
    )
}

/// Un `SignedData` cuyo único firmante no lleva signingCertificate: CMS y no CAdES.
pub(crate) fn a_cms_signature() -> Vec<u8> {
    a_signed_data_with(&[a_signer_with_signed_attributes(Some(&[CONTENT_TYPE]))])
}

#[test]
fn a_signed_data_whose_every_signer_carries_its_signing_certificate_is_cades() {
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/cades-implicit.p7s"
        )),
        Some(DetectedSignature::Cades)
    );
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/cades-explicit.p7s"
        )),
        Some(DetectedSignature::Cades)
    );
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/cades-implicit.cosign.p7s"
        )),
        Some(DetectedSignature::Cades)
    );
    assert_eq!(
        detect_signature(&a_signed_data_with(&[
            a_signer_with_signed_attributes(Some(&[CONTENT_TYPE, SIGNING_CERTIFICATE_V1])),
            a_signer_with_signed_attributes(Some(&[SIGNING_CERTIFICATE_V2])),
        ])),
        Some(DetectedSignature::Cades)
    );
}

#[test]
fn a_signed_data_with_a_signer_without_signing_certificate_is_cms() {
    for signers in [
        vec![a_signer_with_signed_attributes(None)],
        vec![a_signer_with_signed_attributes(Some(&[CONTENT_TYPE]))],
        vec![
            a_signer_with_signed_attributes(Some(&[SIGNING_CERTIFICATE_V2])),
            a_signer_with_signed_attributes(Some(&[CONTENT_TYPE])),
        ],
    ] {
        assert_eq!(
            detect_signature(&a_signed_data_with(&signers)),
            Some(DetectedSignature::Cms)
        );
    }
}

#[test]
fn a_signer_whose_interior_cannot_be_read_falls_back_to_cades() {
    for signer in [
        tlv(0x30, NON_CANONICAL_INTEGER),
        a_signer_with_encoded_attributes(Some(
            [
                an_attribute_of(CONTENT_TYPE),
                tlv(0x30, NON_CANONICAL_INTEGER),
            ]
            .concat(),
        )),
    ] {
        assert_eq!(
            detect_signature(&a_signed_data_with(&[signer])),
            Some(DetectedSignature::Cades)
        );
    }
}

#[test]
fn neither_cms_nor_cades_is_read_out_of_a_binary_that_is_not_signed_data() {
    assert_eq!(
        detect_signature(include_bytes!(
            "../../../../../../../testdata/reference/challenge.bin"
        )),
        None
    );
}

#[test]
fn an_invoice_is_detected_as_invoice_signature() {
    assert_eq!(
        detect_signature(AN_INVOICE),
        Some(DetectedSignature::Invoice)
    );
}

fn an_invoice_in(namespace: &str) -> Vec<u8> {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<fe:Facturae xmlns:fe=\"{namespace}\" xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\">\
<FileHeader><SchemaVersion>3.2.x</SchemaVersion></FileHeader>\
<Parties><SellerParty><TaxIdentification><TaxIdentificationNumber>A00000000</TaxIdentificationNumber>\
</TaxIdentification></SellerParty></Parties>\
<Invoices><Invoice/></Invoices>\
</fe:Facturae>"
    )
    .into_bytes()
}

const NAMESPACE_3_2_1: &str = "http://www.facturae.es/Facturae/2014/v3.2.1/Facturae";
const NAMESPACE_3_2_2: &str = "http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml";

#[test]
fn an_invoice_of_a_version_with_stylesheet_has_the_invoice_type_and_the_xml_extension() {
    for namespace in [NAMESPACE_3_2_1, NAMESPACE_3_2_2] {
        let kind = type_of(&an_invoice_in(namespace));
        assert_eq!(kind, DocumentType::Invoice, "{namespace}");
        assert_eq!(kind.extension(), "xml");
    }
}

#[test]
fn an_invoice_of_another_namespace_is_plain_xml() {
    for namespace in [
        "http://www.facturae.es/Facturae/2009/v3.2/Facturae",
        "http://example.invalid/Facturae",
    ] {
        assert_eq!(type_of(&an_invoice_in(namespace)), DocumentType::Xml);
    }
}

#[test]
fn an_invoice_without_namespace_is_plain_xml() {
    let document = b"<Facturae><FileHeader/><Parties/><Invoices/></Facturae>";
    assert_eq!(shape_of(document), DetectedShape::Invoice);
    assert_eq!(type_of(document), DocumentType::Xml);
}

#[test]
fn an_invoice_with_a_default_namespace_is_told_by_it() {
    let document = format!(
        "<Facturae xmlns=\"{NAMESPACE_3_2_2}\"><FileHeader/><Parties/><Invoices/></Facturae>"
    );
    assert_eq!(type_of(document.as_bytes()), DocumentType::Invoice);
}

#[test]
fn the_root_namespace_tells_the_version_of_an_invoice_with_stylesheet() {
    assert_eq!(
        invoice_version(&an_invoice_in(NAMESPACE_3_2_1)),
        Some(InvoiceVersion::V3_2_1)
    );
    assert_eq!(
        invoice_version(&an_invoice_in(NAMESPACE_3_2_2)),
        Some(InvoiceVersion::V3_2_2)
    );
}

#[test]
fn an_invoice_without_stylesheet_or_a_document_that_is_no_invoice_has_no_version() {
    let not_an_invoice = format!(
        "<Factura xmlns=\"{NAMESPACE_3_2_2}\"><FileHeader/><Parties/><Invoices/></Factura>"
    );
    for document in [
        an_invoice_in("http://www.facturae.es/Facturae/2009/v3.2/Facturae"),
        not_an_invoice.into_bytes(),
    ] {
        assert_eq!(invoice_version(&document), None);
    }
}

macro_rules! received {
    ($file:literal) => {
        include_bytes!(concat!("../../../../../../../testdata/", $file)).as_slice()
    };
}

#[test]
fn the_type_of_a_document_comes_from_its_bytes_and_carries_its_extension() {
    let cases: [(&[u8], DocumentType, &str); 14] = [
        (
            received!("site-driver/test/samples/pades-rsa.pdf"),
            DocumentType::Pdf,
            "pdf",
        ),
        (
            received!("reference/document.xml"),
            DocumentType::Xml,
            "xml",
        ),
        (received!("reference/invoice.xml"), DocumentType::Xml, "xml"),
        (
            received!("received-types/image.png"),
            DocumentType::Png,
            "png",
        ),
        (
            received!("received-types/image.jpg"),
            DocumentType::Jpeg,
            "jpg",
        ),
        (
            received!("received-types/image.gif"),
            DocumentType::Gif,
            "gif",
        ),
        (
            received!("received-types/image.webp"),
            DocumentType::Webp,
            "webp",
        ),
        (
            received!("received-types/document.odt"),
            DocumentType::Odt,
            "odt",
        ),
        (
            received!("received-types/spreadsheet.ods"),
            DocumentType::Ods,
            "ods",
        ),
        (
            received!("received-types/document.docx"),
            DocumentType::Docx,
            "docx",
        ),
        (
            received!("received-types/spreadsheet.xlsx"),
            DocumentType::Xlsx,
            "xlsx",
        ),
        (
            received!("received-types/archive.zip"),
            DocumentType::Zip,
            "zip",
        ),
        (
            received!("received-types/notes.txt"),
            DocumentType::Text,
            "txt",
        ),
        (
            received!("reference/challenge.bin"),
            DocumentType::Unknown,
            "bin",
        ),
    ];
    for (bytes, expected, extension) in cases {
        let detected = type_of(bytes);
        assert_eq!(detected, expected);
        assert_eq!(detected.extension(), extension, "{expected:?}");
    }
}

#[test]
fn only_an_unknown_type_is_not_recognised() {
    assert!(!DocumentType::Unknown.is_recognised());
    assert!(type_of(received!("received-types/document.odt")).is_recognised());
}

#[test]
fn a_signature_container_or_nothing_at_all_is_unknown() {
    assert_eq!(
        type_of(received!("reference/cades-implicit.p7s")),
        DocumentType::Unknown
    );
    assert_eq!(type_of(b""), DocumentType::Unknown);
}
