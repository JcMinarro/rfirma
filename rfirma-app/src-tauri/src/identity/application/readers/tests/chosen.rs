use super::*;

pub(super) fn chosen_by(
    arranged: &Arranged,
    last: &LastListing,
    handle: &str,
) -> Result<TokenCertificate, TokenError> {
    chosen_from_the_last_listing(
        &arranged.token,
        &arranged.stores,
        last,
        &arranged.listed,
        handle,
    )
}

fn some_handle(arranged: &Arranged) -> String {
    arranged.listed_in_full()[0].id.clone()
}

#[test]
fn after_a_full_listing_the_chosen_certificate_is_resolved_without_opening_a_store() {
    let arranged = Arranged::new();
    let handle = some_handle(&arranged);
    arranged.token.asked();

    chosen_by(&arranged, &arranged.last, &handle).expect("esta en el último listado");

    assert_eq!(arranged.token.asked(), Vec::<Store>::new());
}

#[test]
fn with_no_listing_yet_the_chosen_certificate_lists_once_and_the_next_does_not() {
    let arranged = Arranged::new();
    let handle = some_handle(&arranged);
    let nothing_listed_yet = LastListing::default();
    arranged.token.asked();

    chosen_by(&arranged, &nothing_listed_yet, &handle).expect("lista y lo encuentra");
    assert!(!arranged.token.asked().is_empty());

    chosen_by(&arranged, &nothing_listed_yet, &handle).expect("ya está guardado");
    assert_eq!(arranged.token.asked(), Vec::<Store>::new());
}

#[test]
fn a_card_that_came_in_through_the_readers_resolves_without_listing_and_fails_by_name_once_out() {
    let (card, token) = WindowsWithACard::with_the_dnie();
    let arranged = Arranged::over(token, vec![the_windows_store()]);
    let heard = followed(&arranged, &card, &[true]);
    let handle = heard
        .iter()
        .filter_map(|news| news.certificates.as_ref())
        .flatten()
        .find(|row| row.label.contains(ON_THE_DNIE))
        .expect("la tarjeta tiene fila")
        .id
        .clone();
    arranged.token.asked();

    chosen_by(&arranged, &arranged.last, &handle).expect("entró por la lista en caliente");
    assert_eq!(arranged.token.asked(), Vec::<Store>::new());

    followed(&arranged, &card, &[true, false]);
    arranged.token.asked();
    let failure = chosen_by(&arranged, &arranged.last, &handle).expect_err("la tarjeta se fue");

    assert_eq!(failure.situation(), Situation::CertificateNotFound);
    assert_eq!(arranged.token.asked(), Vec::<Store>::new());
}

#[test]
fn a_forgotten_certificate_is_no_longer_resolved_and_nothing_is_listed() {
    let arranged = Arranged::new();
    let handle = some_handle(&arranged);
    let reference = arranged.listed.get(&handle).expect("asa");
    arranged.token.asked();

    arranged.last.forget(&reference);

    let failure = chosen_by(&arranged, &arranged.last, &handle).expect_err("ya no está");
    assert_eq!(failure.situation(), Situation::CertificateNotFound);
    assert_eq!(arranged.token.asked(), Vec::<Store>::new());
}

#[test]
fn a_card_put_in_while_the_focus_lists_is_still_resolved_afterwards() {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::{Arc, Barrier};

    let card_in = Arc::new(AtomicBool::new(false));
    let hold_the_nss = Arc::new(AtomicBool::new(false));
    let (inside, release) = (Arc::new(Barrier::new(2)), Arc::new(Barrier::new(2)));
    let token = {
        let (card_in, hold_the_nss) = (card_in.clone(), hold_the_nss.clone());
        let (inside, release) = (inside.clone(), release.clone());
        Counting::showing(move |store| {
            if *store == Store::module(CARD) {
                if !card_in.load(Ordering::SeqCst) {
                    return Vec::new();
                }
                return vec![TokenCertificate::new(
                    CertificateRef::new(store.clone(), "token", "FIRMA", vec![0x02]),
                    TestAuthority::root("Firmante de la tarjeta").der(),
                )];
            } else if hold_the_nss.swap(false, Ordering::SeqCst) {
                inside.wait();
                release.wait();
            }
            vec![a_certificate_in(store)]
        })
    };
    let arranged = Arranged::over(
        token,
        vec![
            Store::module(CARD),
            Store::nss(
                SOFTOKEN,
                Path::new("/casa/ada/.mozilla/firefox/ada.default"),
            ),
        ],
    );
    arranged.listed_in_full();
    hold_the_nss.store(true, Ordering::SeqCst);

    let handle = std::thread::scope(|scope| {
        let focus = scope.spawn(|| arranged.card_listing().relisted_other_than_cards());
        inside.wait();
        card_in.store(true, Ordering::SeqCst);
        let (rows, _) = arranged.card_listing().relisted();
        release.wait();
        focus.join().unwrap().expect("deberia listar");
        rows.expect("la lista del lector")
            .into_iter()
            .find(|row| row.holder_name == "Firmante de la tarjeta")
            .expect("la tarjeta tiene fila")
            .id
    });

    chosen_by(&arranged, &arranged.last, &handle).expect("la tarjeta sigue en el último listado");
}
