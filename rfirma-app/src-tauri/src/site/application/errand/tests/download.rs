//! Pruebas de «Descargar» y «Descargar todo» en el consentimiento de una firma de sede.

use std::cell::RefCell;
use std::io::Read;
use std::path::{Path, PathBuf};

use base64::Engine as _;

use super::support::*;
use super::support_requests::*;
use crate::documents::application::documents::{opened_document, OpenedDocuments};
use crate::identity::application::tests::{a_usable_certificate, listed_from};
use crate::signing::application::tests::a_memory;
use crate::site::adapters::scratch::RealScratch;
use crate::site::application::errand::*;
use crate::site::domain::channel::ArrivalMode;
use crate::site::domain::download::Download;
use crate::site::domain::protocol::{AfirmaUrl, ChannelMessage, NegotiatedCredential};

/// Un consentimiento de firma a la espera de la persona, con lo que hace falta para descargar.
struct Consenting {
    home: tempfile::TempDir,
    opened: OpenedDocuments,
    live: LiveErrand,
    wire: tokio::sync::oneshot::Receiver<String>,
    document: String,
}

impl Consenting {
    fn read(&self) -> impl Fn(&str) -> Result<Vec<u8>, String> + '_ {
        |handle| {
            let document = opened_document(&self.opened, handle).map_err(|e| format!("{e:?}"))?;
            std::fs::read(document.reading_path()).map_err(|e| e.to_string())
        }
    }

    fn destination(&self, name: &str) -> PathBuf {
        let folder = self.home.path().join("descargas");
        std::fs::create_dir_all(&folder).expect("deberia crearse la carpeta");
        folder.join(name)
    }
}

fn consenting_to_sign(document: &[u8], name: &str) -> Consenting {
    consenting_to_sign_in("PAdES", document, name)
}

fn a_signature_named(format: &str, document: &[u8], name: &str) -> AfirmaUrl {
    let encoded = base64::engine::general_purpose::URL_SAFE.encode(document);
    let properties =
        base64::engine::general_purpose::URL_SAFE.encode(format!("filenameActualName={name}\n"));
    let text = format!(
        "afirma://sign?op=sign&idsession={CREDENTIAL}&format={format}&\
         algorithm=SHA256withRSA&dat={encoded}&properties={properties}"
    );
    let ChannelMessage::Operation { url } = ChannelMessage::read(&text) else {
        panic!("una URL del protocolo es una operacion");
    };
    url
}

fn consenting_to_sign_in(format: &str, document: &[u8], name: &str) -> Consenting {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
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
    let (reply, wire) = the_wire();

    let step = attend(
        &desk,
        a_signature_named(format, document, name),
        reply,
        &live,
    )
    .expect("hay codec");

    let ErrandStep::AskingToSign(asking) = step else {
        panic!("hay un certificado que la sede acepta: {step:?}");
    };
    let document = asking.document.handle.clone();
    drop(desk);
    drop(neighbours);
    Consenting {
        home,
        opened,
        live,
        wire,
        document,
    }
}

/// Un diálogo que elige `path` y apunta el fichero que se le propuso.
fn a_dialog_choosing(
    path: Option<PathBuf>,
    offered: &RefCell<Option<String>>,
) -> impl FnOnce(&Download) -> Result<Option<PathBuf>, String> + '_ {
    move |download| {
        *offered.borrow_mut() = Some(download.name.clone());
        Ok(path)
    }
}

fn unpacked(archive: &Path) -> Vec<(String, Vec<u8>)> {
    let bytes = std::fs::read(archive).expect("deberia haberse escrito el .zip");
    let mut zip = zip::ZipArchive::new(std::io::Cursor::new(bytes)).expect("deberia ser un .zip");
    (0..zip.len())
        .map(|index| {
            let mut entry = zip.by_index(index).expect("deberia leerse la entrada");
            let mut content = Vec::new();
            entry
                .read_to_end(&mut content)
                .expect("deberia descomprimirse");
            let name = entry.name().expect("deberia tener nombre").into_owned();
            (name, content)
        })
        .collect()
}

fn files_in(folder: &Path) -> usize {
    std::fs::read_dir(folder).map_or(0, |entries| entries.count())
}

#[test]
fn downloading_a_document_writes_exactly_its_bytes_where_the_person_chose() {
    let consenting = consenting_to_sign(A_PDF, "acta.pdf");
    let destination = consenting.destination("elegido.pdf");
    let offered = RefCell::new(None);

    let written = download_one(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        a_dialog_choosing(Some(destination.clone()), &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(true));
    assert_eq!(std::fs::read(&destination).ok().as_deref(), Some(A_PDF));
    assert_eq!(offered.into_inner().as_deref(), Some("acta.pdf"));
}

#[test]
fn the_download_is_offered_with_the_extension_of_the_detected_type() {
    let consenting = consenting_to_sign_in("CAdES", b"\x00\x01binario", "acta.pdf");
    let offered = RefCell::new(None);

    let _ = download_one(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        a_dialog_choosing(None, &offered),
        &RealScratch,
    );

    assert_eq!(offered.into_inner().as_deref(), Some("acta.bin"));
}

#[test]
fn cancelling_the_dialog_writes_nothing_and_leaves_the_errand_waiting() {
    let mut consenting = consenting_to_sign(A_PDF, "acta.pdf");
    let folder = consenting.destination("x").parent().map(Path::to_path_buf);
    let offered = RefCell::new(None);

    let written = download_one(
        &consenting.live,
        &consenting.document,
        &consenting.read(),
        a_dialog_choosing(None, &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(false));
    assert_eq!(files_in(&folder.expect("hay carpeta")), 0);
    assert!(
        matches!(consenting.live.moment(), Some(Moment::AskingToSign { .. })),
        "{:?}",
        consenting.live.moment()
    );
    assert_eq!(what_the_site_received(&mut consenting.wire), None);
}

#[test]
fn a_handle_the_consent_does_not_show_is_not_downloaded() {
    let consenting = consenting_to_sign(A_PDF, "acta.pdf");
    let offered = RefCell::new(None);

    let written = download_one(
        &consenting.live,
        "otra-asa",
        &consenting.read(),
        a_dialog_choosing(Some(consenting.destination("x.pdf")), &offered),
        &RealScratch,
    );

    assert_eq!(
        written,
        Err(DownloadError::NotReceived("otra-asa".to_owned()))
    );
    assert_eq!(offered.into_inner(), None);
}

#[test]
fn downloading_everything_writes_a_zip_with_the_documents_and_their_sums() {
    let consenting = consenting_to_sign(A_PDF, "acta.pdf");
    let destination = consenting.destination("todo.zip");
    let offered = RefCell::new(None);

    let written = download_all(
        &consenting.live,
        &consenting.read(),
        a_dialog_choosing(Some(destination.clone()), &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(true));
    assert_eq!(offered.into_inner().as_deref(), Some("documentos.zip"));
    let entries = unpacked(&destination);
    assert_eq!(entries[0], ("acta.pdf".to_owned(), A_PDF.to_vec()));
    assert_eq!(entries[1].0, "SHA256SUMS");
    let sha256: String = openssl::sha::sha256(A_PDF)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    assert_eq!(entries[1].1, format!("{sha256}  acta.pdf\n").into_bytes());
}

#[test]
fn cancelling_the_dialog_of_everything_writes_nothing() {
    let consenting = consenting_to_sign(A_PDF, "acta.pdf");
    let folder = consenting.destination("x").parent().map(Path::to_path_buf);
    let offered = RefCell::new(None);

    let written = download_all(
        &consenting.live,
        &consenting.read(),
        a_dialog_choosing(None, &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(false));
    assert_eq!(files_in(&folder.expect("hay carpeta")), 0);
}

/// El consentimiento de un lote local de tres elementos, con las asas de sus documentos.
fn consenting_to_sign_the_local_batch() -> (Consenting, Vec<String>) {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let live = a_live();
    let (reply, wire) = the_wire();
    live.answer_through(reply);
    let engine = AnEngine::answering(&[&[0], &[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let neighbours = neighbours_for_the_local_batch(home.path(), &listed, &opened, &memory, &ours);
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);

    let url = a_local_batch("");
    let step = attend_operation(&desk, &url, decoded(&url), &live);
    let ErrandStep::AskingToSignTheLocalBatch(asked) = remembered(&live, step) else {
        panic!("un lote local pide consentimiento");
    };
    let handles = asked
        .items
        .iter()
        .map(|item| item.document.handle.clone())
        .collect::<Vec<_>>();
    drop(desk);
    drop(neighbours);
    let consenting = Consenting {
        home,
        opened,
        live,
        wire,
        document: handles[0].clone(),
    };
    (consenting, handles)
}

#[test]
fn an_item_of_the_local_batch_is_downloaded_as_it_is() {
    let (consenting, handles) = consenting_to_sign_the_local_batch();
    let destination = consenting.destination("elegido.pdf");
    let offered = RefCell::new(None);

    let written = download_one(
        &consenting.live,
        &handles[0],
        &consenting.read(),
        a_dialog_choosing(Some(destination.clone()), &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(true));
    assert_eq!(
        std::fs::read(&destination).ok().as_deref(),
        Some(A_LOCAL_PDF)
    );
    assert_eq!(offered.into_inner().as_deref(), Some("001.pdf"));
}

#[test]
fn downloading_everything_of_the_local_batch_writes_every_item_in_the_zip() {
    let (consenting, _) = consenting_to_sign_the_local_batch();
    let destination = consenting.destination("todo.zip");
    let offered = RefCell::new(None);

    let written = download_all(
        &consenting.live,
        &consenting.read(),
        a_dialog_choosing(Some(destination.clone()), &offered),
        &RealScratch,
    );

    assert_eq!(written, Ok(true));
    let entries = unpacked(&destination);
    assert_eq!(entries.len(), 4, "tres elementos y su SHA256SUMS");
    assert_eq!(entries[0].1, A_LOCAL_PDF.to_vec());
    assert_eq!(entries[1].1, A_LOCAL_BINARY.to_vec());
    assert_eq!(entries[2].1, A_LOCAL_XML.to_vec());
    assert_eq!(entries[3].0, "SHA256SUMS");
}

#[test]
fn without_a_consent_on_screen_there_is_nothing_to_download() {
    let live = a_live();
    let offered = RefCell::new(None);

    let written = download_all(
        &live,
        &|_: &str| Ok(Vec::new()),
        a_dialog_choosing(None, &offered),
        &RealScratch,
    );

    assert_eq!(written, Err(DownloadError::NothingReceived));
    assert_eq!(offered.into_inner(), None);
}
