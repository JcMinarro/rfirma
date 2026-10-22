use super::chosen::chosen_by;
use super::*;

#[test]
fn regaining_the_focus_opens_only_the_stores_that_are_not_cards_and_keeps_handles_and_listing() {
    let arranged = Arranged::new();
    let before = arranged.listed_in_full();
    arranged.token.asked();

    let rows = arranged
        .card_listing()
        .relisted_other_than_cards()
        .expect("deberia listar");

    assert_eq!(
        arranged.token.asked(),
        vec![Store::nss(
            SOFTOKEN,
            Path::new("/casa/ada/.mozilla/firefox/ada.default"),
        )]
    );
    let mut ids: Vec<_> = rows.iter().map(|row| row.id.clone()).collect();
    let mut kept: Vec<_> = before.iter().map(|row| row.id.clone()).collect();
    ids.sort();
    kept.sort();
    assert_eq!(ids, kept);
    chosen_by(&arranged, &arranged.last, &kept[0]).expect("sigue en el último listado");
    assert_eq!(arranged.token.asked(), Vec::<Store>::new());
}

#[test]
fn regaining_the_focus_lists_the_windows_store_with_the_others() {
    let (_, token) = WindowsWithACard::with_the_dnie();
    let arranged = Arranged::over(token, vec![the_windows_store()]);
    arranged.listed_in_full();
    arranged.token.asked();

    arranged
        .card_listing()
        .relisted_other_than_cards()
        .expect("deberia listar");

    assert_eq!(arranged.token.asked(), vec![the_windows_store()]);
}

#[test]
fn regaining_the_focus_with_no_listing_yet_lists_every_store() {
    let arranged = Arranged::new();

    let rows = arranged
        .card_listing()
        .relisted_other_than_cards()
        .expect("deberia listar");

    assert_eq!(arranged.token.asked().len(), 2);
    assert_eq!(rows.len(), 2);
}
