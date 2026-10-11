//! La mano de la suite: pulsa por AT-SPI, en el rFirma del perfil aislado, lo que haría la persona.

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread::{spawn, JoinHandle};
use std::time::Instant;

use crate::catalogue::{Act, Assistance, Check};
use crate::client::{ClientKind, Store};
use crate::livelog::{LiveLogSink, Provenance};

/// Las que pasan por un diálogo de fichero, que la mano no sabe llevar.
const THROUGH_A_FILE_DIALOGUE: &[&str] = &[
    "load_cancelled_answers_cancel",
    "multiload_without_files_answers_a_cancellation",
    "save_cancelled_answers_cancel",
    "save_confirms_before_writing_over_a_file_that_already_exists",
    "a_save_that_cannot_write_asks_for_another_destination",
    "signandsave_cancelled_at_the_save_dialogue_answers_a_cancellation",
];

/// Las que piden elegir un certificado concreto entre varios.
const CHOOSING_AMONG_SEVERAL: &[&str] = &["a_batch_honours_the_certificate_filters_of_its_request"];

/// El plan de la mano para `check` en el cliente `kind`; `None` si la necesita a la persona.
pub(crate) fn the_plan_for(kind: ClientKind, check: &Check) -> Option<&'static str> {
    if kind != ClientKind::Rfirma || check.store() == Store::Dnie {
        return None;
    }
    let id = check.id.as_str();
    if THROUGH_A_FILE_DIALOGUE.contains(&id) || CHOOSING_AMONG_SEVERAL.contains(&id) {
        return None;
    }
    match &check.trial()?.act {
        Act::None => Some("close"),
        Act::Consent(_) if id == "active_waiting_announces_wait_every_ten_seconds" => {
            Some("wait_then_consent")
        }
        Act::Consent(_)
            if id
                == "a_wanted_visible_signature_with_its_area_is_placed_where_the_request_says" =>
        {
            Some("cancel_once_then_consent")
        }
        Act::Consent(_) | Act::TypePassword(_) => Some("consent"),
        Act::Cancel(_) => Some(the_cancellation_plan_of(id)),
        _ => None,
    }
}

fn the_cancellation_plan_of(id: &str) -> &'static str {
    match id {
        "an_optional_visible_signature_cancelled_signs_without_it" => "cancel_once_then_consent",
        "a_protected_pdf_without_a_password_is_asked_to_the_person" => "cancel_after_consent",
        _ => "cancel_first",
    }
}

/// Lo que necesita `check` de la persona con el cliente `kind`, contando con la mano.
pub(crate) fn the_assistance_of(check: &Check, kind: ClientKind) -> Assistance {
    if the_plan_for(kind, check).is_some() {
        Assistance::None
    } else {
        check.assistance()
    }
}

/// La mano en marcha mientras dura un trámite; se para al soltarla.
pub(crate) struct Hand {
    child: Child,
    drain: Option<JoinHandle<()>>,
}

impl Hand {
    pub(crate) fn spawn(
        plan: &str,
        home: &Path,
        log_sink: LiveLogSink,
        start: Instant,
    ) -> std::io::Result<Self> {
        let mut child = Command::new("python3")
            .arg(the_script())
            .arg("--plan")
            .arg(plan)
            .arg("--home")
            .arg(home)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let drain = spawn(move || {
            let lines = stdout
                .into_iter()
                .flat_map(|out| BufReader::new(out).lines().map_while(Result::ok))
                .chain(
                    stderr
                        .into_iter()
                        .flat_map(|err| BufReader::new(err).lines().map_while(Result::ok)),
                );
            for line in lines {
                log_sink.push(Provenance::Suite, start.elapsed(), &line);
            }
        });
        Ok(Self {
            child,
            drain: Some(drain),
        })
    }
}

impl Drop for Hand {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        if let Some(drain) = self.drain.take() {
            let _ = drain.join();
        }
    }
}

fn the_script() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("hand/rfirma.py")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::catalogue::the_catalogue_in;

    fn a_check(act: &str, store: &str) -> Check {
        the_catalogue_in(&format!(
            r#"
[[check]]
id = "a_check"
set = "firma"
citation = "X.java:1"
statement = "Algo."

[check.drive]
mode = "v4"
script = "signcades"
store = "{store}"
{act}
expects.code = "CANCEL"
"#
        ))
        .unwrap()
        .remove(0)
    }

    #[test]
    fn rfirma_needs_no_one_for_a_consent_or_a_cancellation() {
        for act in ["act.consent = \"Elige.\"", "act.cancel = \"Cancela.\""] {
            let check = a_check(act, "rsa");

            assert_eq!(
                the_assistance_of(&check, ClientKind::Rfirma),
                Assistance::None,
                "{act}"
            );
        }
    }

    #[test]
    fn rfirma_closes_the_outcome_of_a_check_that_asks_nothing() {
        let check = a_check("", "rsa");

        assert_eq!(the_plan_for(ClientKind::Rfirma, &check), Some("close"));
        assert_eq!(the_plan_for(ClientKind::Autofirma, &check), None);
    }

    #[test]
    fn autofirma_keeps_the_person() {
        let check = a_check("act.consent = \"Elige.\"", "rsa");

        assert_eq!(
            the_assistance_of(&check, ClientKind::Autofirma),
            Assistance::Click
        );
    }

    #[test]
    fn the_dnie_and_the_file_dialogues_stay_with_the_person() {
        let dnie = a_check("act.type_password = \"Teclea.\"", "dnie");
        let file = a_check("act.pick_file = \"Elige.\"", "rsa");

        assert_eq!(the_plan_for(ClientKind::Rfirma, &dnie), None);
        assert_eq!(the_plan_for(ClientKind::Rfirma, &file), None);
    }
}
