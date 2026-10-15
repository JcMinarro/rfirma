//! Lote local (`setLocalBatchProcess(true)`) sin servlets, y su parada ante un elemento ilegible.

#[allow(dead_code, unused_imports)]
mod support;

use support::*;

use std::collections::BTreeMap;

use rfirma_lib::documents::application::documents::bytes_of;
use rfirma_lib::signing::application::session::previous_signatures_in;

/// Los bytes de cada elemento del lote local leídos por su asa antes de firmar, por su `id`.
type Downloaded = Arc<Mutex<BTreeMap<String, Vec<u8>>>>;

/// El trámite atendiendo el lote local: lee cada elemento y sus firmas previas por su asa,
/// consiente con el certificado de pruebas y lo cierra con el secreto del token, firmando cada
/// elemento por el ciclo de sede sin servlets (ADR-0014).
fn the_local_batch_errand_of(
    roots: &Arc<Roots>,
    signer: &Arc<Mutex<Option<Vec<u8>>>>,
    downloaded: &Downloaded,
    items: usize,
) -> SiteOperations {
    let roots = Arc::clone(roots);
    let signer = Arc::clone(signer);
    let downloaded = Arc::clone(downloaded);

    SiteOperations::for_operations(move |url, _origin, reply: ErrandReply| {
        let neighbourhood = the_neighbourhood_of(&roots);
        let desk = the_desk_of(&roots, &neighbourhood);
        let live = &roots.site.errand;

        let answering = ErrandReply::of(move |text| reply.answer(text));
        let Some(ErrandStep::AskingToSignTheLocalBatch(consent)) =
            errand::attend(&desk, url, answering, live)
        else {
            return;
        };
        assert_eq!(consent.items.len(), items, "los elementos del guion");
        for item in &consent.items {
            let handle = &item.document.handle;
            let bytes = bytes_of(
                roots.documents.files.as_ref(),
                &roots.documents.opened,
                handle,
            )
            .unwrap_or_else(|error| {
                panic!("el elemento '{}' se lee por su asa: {error:?}", item.id)
            });
            assert_eq!(
                hex_of(&openssl::sha::sha256(&bytes)),
                item.document.sha256,
                "el SHA-256 del consentimiento es el de lo que se lee por el asa"
            );
            let document = roots
                .documents
                .opened_document(handle)
                .expect("el asa del elemento sigue abierta");
            previous_signatures_in(
                roots.signing.files.as_ref(),
                &roots.signing.isolate,
                &document,
            )
            .unwrap_or_else(|error| {
                panic!(
                    "las firmas previas de '{}' se leen por su asa: {error:?}",
                    item.id
                )
            });
            downloaded
                .lock()
                .expect("nadie envenena lo descargado")
                .insert(item.id.clone(), bytes);
        }

        let chosen = consent
            .certificates
            .iter()
            .find(|row| is_the_usable_test_certificate(row))
            .unwrap_or_else(|| {
                panic!("el token de pruebas no ofrecio {THE_TEST_CERTIFICATE}: monta `just certs install`")
            });
        let signing_certificate = roots
            .identity
            .chosen(&chosen.id)
            .expect("el certificado consentido deberia seguir en el token");
        *signer
            .lock()
            .expect("nadie envenena el apunte del firmante") =
            Some(signing_certificate.der().to_vec());

        errand::consent(&desk, &chosen.id, live).expect("el lote local deberia quedar consentido");
        tokio::task::block_in_place(|| {
            signed_with_the_secret(&roots.identity, &roots.signing, &desk, live, "")
                .expect("el lote local deberia cerrarse con el secreto del token")
        });
    })
}

/// Un elemento del resultado del lote local, por su `id`.
fn hex_of(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// Lo que se leyó por el asa del elemento `id`.
fn downloaded_item(downloaded: &Downloaded, id: &str) -> Vec<u8> {
    downloaded
        .lock()
        .expect("nadie envenena lo descargado")
        .get(id)
        .unwrap_or_else(|| panic!("el elemento '{id}' no se leyó por su asa"))
        .clone()
}

fn local_batch_item<'a>(result: &'a serde_json::Value, id: &str) -> &'a serde_json::Value {
    result["signs"]
        .as_array()
        .expect("el resultado del lote local trae 'signs'")
        .iter()
        .find(|item| item["id"] == id)
        .unwrap_or_else(|| panic!("el lote local no trae el elemento '{id}': {result}"))
}

/// El lote local de tres elementos (PDF/`PAdES`, binario/`CAdES`, XML/`XAdES`) firmado con
/// `setLocalBatchProcess(true)` y sin presigner ni postsigner: las tres firmas validan con la
/// herramienta de su formato.
#[expect(clippy::too_many_lines)]
async fn the_local_batch_of(mode: BenchMode) {
    if !the_bench_can_be_mounted() {
        return;
    }

    let material = ChannelMaterial::fresh();
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let roots = Arc::new(tokio::task::block_in_place(|| {
        a_running_rfirma(home.path())
    }));
    let signer = Arc::new(Mutex::new(None));
    let downloaded = Downloaded::default();
    let pdf_file = a_temp_file(".pdf", &a_one_page_pdf());
    let client = PublishedClient::running_the_script_over_the_pdf(
        &material,
        mode,
        THE_LOCAL_BATCH,
        pdf_file.path(),
    );

    let channel = the_errand_channel(
        &client,
        &material,
        &roots,
        the_local_batch_errand_of(&roots, &signer, &downloaded, 3),
    )
    .await;

    let verdict = client.next_event();
    assert_eq!(
        verdict.name(),
        "success",
        "el lote local tenia que acabar en el successCallback, y acabo en {}: {}",
        verdict.name(),
        verdict.field("message")
    );

    let result: serde_json::Value = serde_json::from_slice(
        &STANDARD
            .decode(verdict.field("result"))
            .expect("el resultado del lote local llega en base64"),
    )
    .expect("el resultado del lote local es JSON");

    for id in ["pdf", "bin", "xml"] {
        assert_eq!(
            local_batch_item(&result, id)["result"],
            "DONE_AND_SAVED",
            "el elemento '{id}' tenia que firmarse: {result}"
        );
    }

    let pdf_signed = STANDARD
        .decode(
            local_batch_item(&result, "pdf")["signature"]
                .as_str()
                .expect("el PDF firmado llega en base64"),
        )
        .expect("el PDF firmado es base64 valido");
    let pdf_signed_file = a_temp_file(".pdf", &pdf_signed);
    validated_by_pdfsig(pdf_signed_file.path());

    let cms = STANDARD
        .decode(
            local_batch_item(&result, "bin")["signature"]
                .as_str()
                .expect("el CAdES del binario llega en base64"),
        )
        .expect("el CAdES del binario es base64 valido");
    let bin = downloaded_item(&downloaded, "bin");
    assert_eq!(
        bin, THE_LOCAL_BATCH_BINARY,
        "lo que se descarga es lo que mandó la sede"
    );
    let binary_file = a_temp_file(".bin", &bin);
    verified_by_openssl(&cms, binary_file.path());
    validated_by_the_reference_tool(&cms);

    let xml = STANDARD
        .decode(
            local_batch_item(&result, "xml")["signature"]
                .as_str()
                .expect("el XAdES del XML llega en base64"),
        )
        .expect("el XAdES del XML es base64 valido");
    let xml_file = an_xml_file(&xml);
    well_formed_according_to_xmllint(xml_file.path());
    carries_a_xmldsig_signature(&xml);

    assert_eq!(
        verdict.field("certificate"),
        STANDARD.encode(
            signer
                .lock()
                .expect("nadie envenena el apunte del firmante")
                .as_ref()
                .expect("el tramite tenia que haber consentido con un certificado")
        ),
        "con needcert el successCallback recibe tambien el DER del firmante"
    );

    channel.close();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "grada C: necesita la libreria nativa (RFIRMA_LIB_DIR) y el token de pruebas"]
async fn the_published_client_signs_a_local_batch() {
    the_local_batch_of(BenchMode::Fourth).await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "grada C: necesita la libreria nativa (RFIRMA_LIB_DIR) y el token de pruebas"]
async fn the_published_client_signs_a_local_batch_also_over_the_third_protocol() {
    the_local_batch_of(BenchMode::Third).await;
}

/// El mismo lote local, con el binario declarado `format=PAdES` —y por tanto ilegible, al no ser
/// un PDF— y `stoponerror=true`: el PDF que iba antes se salta también, como el original.
async fn the_local_batch_with_an_illegible_item_of(mode: BenchMode) {
    if !the_bench_can_be_mounted() {
        return;
    }

    let material = ChannelMaterial::fresh();
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let roots = Arc::new(tokio::task::block_in_place(|| {
        a_running_rfirma(home.path())
    }));
    let signer = Arc::new(Mutex::new(None));
    let downloaded = Downloaded::default();
    let pdf_file = a_temp_file(".pdf", &a_one_page_pdf());
    let client = PublishedClient::running_the_script_over_the_pdf(
        &material,
        mode,
        THE_LOCAL_BATCH_WITH_AN_ILLEGIBLE_ITEM,
        pdf_file.path(),
    );

    let channel = the_errand_channel(
        &client,
        &material,
        &roots,
        the_local_batch_errand_of(&roots, &signer, &downloaded, 3),
    )
    .await;

    let verdict = client.next_event();
    assert_eq!(
        verdict.name(),
        "success",
        "el lote local tenia que acabar en el successCallback aunque un elemento fallase, y \
         acabo en {}: {}",
        verdict.name(),
        verdict.field("message")
    );

    let result: serde_json::Value = serde_json::from_slice(
        &STANDARD
            .decode(verdict.field("result"))
            .expect("el resultado del lote local llega en base64"),
    )
    .expect("el resultado del lote local es JSON");

    assert_eq!(
        local_batch_item(&result, "pdf")["result"],
        "SKIPPED",
        "el elemento anterior al que falla tambien se salta: {result}"
    );
    assert_eq!(
        local_batch_item(&result, "bin")["result"],
        "ERROR_PRE",
        "el binario declarado PAdES es ilegible: {result}"
    );
    assert_eq!(
        local_batch_item(&result, "xml")["result"],
        "SKIPPED",
        "el elemento posterior al que falla se salta: {result}"
    );

    channel.close();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "grada C: necesita la libreria nativa (RFIRMA_LIB_DIR) y el token de pruebas"]
async fn the_published_client_stops_a_local_batch_on_an_illegible_item() {
    the_local_batch_with_an_illegible_item_of(BenchMode::Fourth).await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "grada C: necesita la libreria nativa (RFIRMA_LIB_DIR) y el token de pruebas"]
async fn the_published_client_stops_a_local_batch_on_an_illegible_item_also_over_the_third_protocol(
) {
    the_local_batch_with_an_illegible_item_of(BenchMode::Third).await;
}

/// Un lote local en `format=NONE`: el binario vuelve con el PKCS#1 de sus datos, sin CMS alrededor.
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "grada C: necesita la libreria nativa (RFIRMA_LIB_DIR) y el token de pruebas"]
async fn the_published_client_signs_a_local_batch_in_format_none_as_bare_pkcs1() {
    if !the_bench_can_be_mounted() {
        return;
    }

    let material = ChannelMaterial::fresh();
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let roots = Arc::new(tokio::task::block_in_place(|| {
        a_running_rfirma(home.path())
    }));
    let signer = Arc::new(Mutex::new(None));
    let downloaded = Downloaded::default();
    let client = PublishedClient::running_the_script(
        &material,
        BenchMode::Fourth,
        THE_LOCAL_BATCH_IN_FORMAT_NONE,
    );

    let channel = the_errand_channel(
        &client,
        &material,
        &roots,
        the_local_batch_errand_of(&roots, &signer, &downloaded, 1),
    )
    .await;

    let verdict = client.next_event();
    assert_eq!(
        verdict.name(),
        "success",
        "el lote local en NONE tenia que acabar en el successCallback, y acabo en {}: {}",
        verdict.name(),
        verdict.field("message")
    );
    let result: serde_json::Value = serde_json::from_slice(
        &STANDARD
            .decode(verdict.field("result"))
            .expect("el resultado del lote local llega en base64"),
    )
    .expect("el resultado del lote local es JSON");
    let item = local_batch_item(&result, "bin");
    assert_eq!(item["result"], "DONE_AND_SAVED", "{result}");

    let pkcs1 = STANDARD
        .decode(
            item["signature"]
                .as_str()
                .expect("la firma llega en base64"),
        )
        .expect("la firma es base64 valido");
    let signer_der = signer
        .lock()
        .expect("nadie envenena el apunte del firmante")
        .clone()
        .expect("el tramite tenia que haber consentido con un certificado");
    let bin = downloaded_item(&downloaded, "bin");
    assert_eq!(
        bin, THE_LOCAL_BATCH_BINARY,
        "lo que se descarga es lo que mandó la sede"
    );
    verified_as_a_bare_pkcs1(&pkcs1, &bin, &signer_der);

    channel.close();
}
