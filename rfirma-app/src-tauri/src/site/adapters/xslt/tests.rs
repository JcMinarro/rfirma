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

const SECRET: &str = "SECRETO-DE-PRUEBA";

fn file_url(path: &std::path::Path) -> String {
    let path = path.display().to_string().replace('\\', "/");
    format!("file:///{}", path.trim_start_matches('/'))
}

fn a_stylesheet_that_greets_with(expression: &str) -> Vec<u8> {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html"/>
  <xsl:template match="/greeting">
    <html><body><p>Hola, <xsl:value-of select="{expression}"/></p></body></html>
  </xsl:template>
</xsl:stylesheet>"#
    )
    .into_bytes()
}

#[test]
fn a_stylesheet_cannot_read_a_local_file_with_the_document_function() {
    let folder = tempfile::tempdir().expect("carpeta temporal");
    let secret = folder.path().join("secreto.xml");
    std::fs::write(&secret, format!("<secret>{SECRET}</secret>")).expect("fichero secreto");
    let stylesheet = a_stylesheet_that_greets_with(&format!("document('{}')", file_url(&secret)));

    let html = transform(GREETING, &stylesheet).unwrap_or_default();

    assert!(!html.contains(SECRET), "la hoja leyó el fichero: {html}");
}

#[test]
fn a_stylesheet_cannot_reach_a_url_with_the_document_function() {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("puerto local");
    let address = listener.local_addr().expect("dirección local");
    let reached = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let witness = std::sync::Arc::clone(&reached);
    std::thread::spawn(move || {
        if let Ok((mut connection, _)) = listener.accept() {
            witness.store(true, std::sync::atomic::Ordering::SeqCst);
            let _ = std::io::Write::write_all(
                &mut connection,
                format!("HTTP/1.0 200 OK\r\n\r\n<secret>{SECRET}</secret>").as_bytes(),
            );
        }
    });
    let stylesheet = a_stylesheet_that_greets_with(&format!("document('http://{address}/')"));

    let html = transform(GREETING, &stylesheet).unwrap_or_default();

    assert!(!html.contains(SECRET), "la hoja leyó la URL: {html}");
    assert!(
        !reached.load(std::sync::atomic::Ordering::SeqCst),
        "la hoja llamó a {address}"
    );
}

#[test]
fn a_stylesheet_cannot_write_a_file() {
    let folder = tempfile::tempdir().expect("carpeta temporal");
    let written = folder.path().join("escrito.html");
    let stylesheet = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <xsl:document href="{}" method="html"><p>{SECRET}</p></xsl:document>
    <html/>
  </xsl:template>
</xsl:stylesheet>"#,
        file_url(&written)
    );

    let _ = transform(GREETING, stylesheet.as_bytes());

    assert!(!written.exists(), "la hoja escribió {}", written.display());
}
