use super::*;
use crate::signing::domain::bridge::Format;
use crate::site::application::errand::ReceivedDocument;
use crate::site::domain::protocol::SignatureRound;

fn asking_to_sign() -> Moment {
    Moment::AskingToSign {
        document: ReceivedDocument::kept_as("asa".to_owned(), None, b"%PDF-1.7\n"),
        format: Format::Pades,
        round: SignatureRound::First,
        certificates: Vec::new(),
        not_accepted: 0,
        already_chosen: None,
        without_asking: false,
        sha1_allowed: false,
        sha1_to_allow: false,
        through_the_site_server: false,
    }
}

#[test]
fn a_consent_to_sign_stays_compact_until_the_person_expands_it() {
    assert_eq!(size_for(&asking_to_sign(), false), (520.0, 420.0));
    assert_eq!(size_for(&asking_to_sign(), true), (1080.0, 660.0));
}

#[test]
fn marking_the_area_is_always_expanded() {
    let marking = Moment::MarkingTheArea {
        document: "asa".to_owned(),
    };

    assert_eq!(size_for(&marking, false), (1080.0, 660.0));
}

#[test]
fn a_moment_that_is_not_a_consent_ignores_the_expansion() {
    assert_eq!(size_for(&Moment::Waiting, true), (520.0, 420.0));
}
