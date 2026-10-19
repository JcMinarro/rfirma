//! Pruebas de la marca de huella precalculada en cada elemento del lote local.

use super::support::*;
use super::support_requests::*;
use crate::documents::application::documents::OpenedDocuments;
use crate::identity::application::tests::{a_usable_certificate, listed_from};
use crate::signing::application::tests::a_memory;
use crate::site::application::errand::*;
use crate::site::domain::protocol::{AfirmaUrl, ChannelMessage};
use base64::engine::general_purpose::{STANDARD, URL_SAFE};
use base64::Engine as _;

const HASH: &str = "precalculatedHashAlgorithm=SHA-256";

pub(super) fn extraparams(properties: &str) -> String {
    format!("\"extraparams\":\"{}\"", STANDARD.encode(properties))
}

pub(super) fn batch_with(batch_extra: &str, item_extras: [&str; 3]) -> AfirmaUrl {
    let [first, second, third] = item_extras;
    let lote = format!(
        "{{\"algorithm\":\"SHA256\",\"format\":\"auto\",\"stoponerror\":false,{batch_extra}\
         \"singlesigns\":[\
         {{\"id\":\"001\",\"datareference\":\"{}\"{first}}},\
         {{\"id\":\"002\",\"datareference\":\"{}\"{second}}},\
         {{\"id\":\"003\",\"datareference\":\"{}\"{third}}}]}}",
        in_the_batch(A_LOCAL_PDF),
        in_the_batch(A_LOCAL_BINARY),
        in_the_batch(A_LOCAL_XML),
    );
    let text = format!(
        "afirma://batch?op=batch&idsession={CREDENTIAL}&jsonbatch=true&\
         localBatchProcess=true&dat={}",
        URL_SAFE.encode(&lote)
    );
    let ChannelMessage::Operation { url } = ChannelMessage::read(&text) else {
        panic!("una URL del protocolo es una operacion");
    };
    url
}

fn marks_of(url: &AfirmaUrl) -> Vec<bool> {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let memory = a_memory(home.path());
    let ours = vec![a_usable_certificate("FIRMA")];
    let (listed, _) = listed_from(&ours);
    let opened = OpenedDocuments::new();
    let live = a_live();
    let engine = AnEngine::answering(&[&[0], &[0]]);
    let policies = APolicyEngine::answering("");
    let scratch = home.path().join("errand");
    let neighbours = neighbours_for_the_local_batch(home.path(), &listed, &opened, &memory, &ours);
    let desk = a_desk(&engine, &policies, &neighbours, &scratch);

    let step = attend_operation(&desk, url, decoded(url), &live);
    let ErrandStep::AskingToSignTheLocalBatch(asked) = remembered(&live, step) else {
        panic!("un lote local pide consentimiento");
    };
    asked
        .items
        .iter()
        .map(|item| item.precalculated_hash)
        .collect()
}

#[test]
fn an_item_declaring_a_precalculated_hash_is_marked_and_the_others_are_not() {
    let own = format!(",{}", extraparams(HASH));

    assert_eq!(
        marks_of(&batch_with("", [&own, "", ""])),
        [true, false, false]
    );
}

#[test]
fn items_inherit_the_precalculated_hash_of_the_batch() {
    let batch = format!("{},", extraparams(HASH));

    assert_eq!(
        marks_of(&batch_with(&batch, ["", "", ""])),
        [true, true, true]
    );
}

#[test]
fn own_extraparams_replace_the_batch_ones_without_mixing() {
    let batch = format!("{},", extraparams(HASH));
    let without = format!(",{}", extraparams("mode=implicit"));

    assert_eq!(
        marks_of(&batch_with(&batch, [&without, "", ""])),
        [false, true, true]
    );
}
