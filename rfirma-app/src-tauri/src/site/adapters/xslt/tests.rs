use super::transform;

const GREETING: &[u8] = br#"<?xml version="1.0" encoding="UTF-8"?>
<greeting><to>Ana</to></greeting>"#;

const STYLESHEET: &[u8] = br#"<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="/greeting">
    <html><body><p>Hola, <xsl:value-of select="to"/></p></body></html>
  </xsl:template>
</xsl:stylesheet>"#;

#[test]
fn transforms_a_document_into_html_with_an_xslt_stylesheet() {
    let html = transform(GREETING, STYLESHEET).expect("la hoja transforma el documento");

    assert!(html.contains("<p>Hola, Ana</p>"), "HTML inesperado: {html}");
}

#[test]
fn a_malformed_document_has_no_transformation() {
    assert_eq!(transform(b"<greeting><to>Ana</greeting>", STYLESHEET), None);
}

#[test]
fn a_malformed_stylesheet_has_no_transformation() {
    assert_eq!(transform(GREETING, b"<xsl:stylesheet"), None);
}

#[test]
fn a_document_that_is_not_a_stylesheet_has_no_transformation() {
    assert_eq!(transform(GREETING, GREETING), None);
}
