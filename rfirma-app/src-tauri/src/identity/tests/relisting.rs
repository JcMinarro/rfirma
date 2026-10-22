use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use super::*;
use crate::identity::application::tests::{NoMemory, NoToken, TestAuthority};
use crate::identity::domain::error::Situation;
use crate::identity::domain::secret::StoreSecret;

const CHOSEN: &str = "/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so";
const OTHER: &str = "/usr/lib/softhsm/libsofthsm2.so";

type Answer = Box<dyn Fn(usize) -> Result<Vec<TokenCertificate>, TokenError> + Send + Sync>;

/// Un token de dos almacenes: cada uno responde lo que diga su respuesta según cuántas veces se le ha listado ya.
struct TwoStores {
    chosen: Answer,
    other: Answer,
    chosen_lists: AtomicUsize,
    other_lists: AtomicUsize,
}

impl TwoStores {
    fn new(
        chosen: impl Fn(usize) -> Result<Vec<TokenCertificate>, TokenError> + Send + Sync + 'static,
        other: impl Fn(usize) -> Result<Vec<TokenCertificate>, TokenError> + Send + Sync + 'static,
    ) -> Self {
        Self {
            chosen: Box::new(chosen),
            other: Box::new(other),
            chosen_lists: AtomicUsize::new(0),
            other_lists: AtomicUsize::new(0),
        }
    }
}

impl Token for TwoStores {
    fn list(&self, store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
        if *store == Store::module(CHOSEN) {
            (self.chosen)(self.chosen_lists.fetch_add(1, Ordering::SeqCst))
        } else {
            (self.other)(self.other_lists.fetch_add(1, Ordering::SeqCst))
        }
    }

    fn every_certificate(&self, store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
        NoToken.every_certificate(store)
    }

    fn list_authenticated(
        &self,
        store: &Store,
        pin: &ProtectedSecret,
    ) -> Result<Vec<TokenCertificate>, TokenError> {
        NoToken.list_authenticated(store, pin)
    }

    fn secret_of(&self, reference: &CertificateRef) -> Result<StoreSecret, TokenError> {
        Token::secret_of(&NoToken, reference)
    }

    fn offers(
        &self,
        reference: &CertificateRef,
        algorithm: SignatureAlgorithm,
    ) -> Result<(), TokenError> {
        Token::offers(&NoToken, reference, algorithm)
    }

    fn accepts_the_secret(
        &self,
        reference: &CertificateRef,
        secret: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        Token::accepts_the_secret(&NoToken, reference, secret)
    }

    fn sign_with_secret(
        &self,
        reference: &CertificateRef,
        secret: &ProtectedSecret,
        algorithm: SignatureAlgorithm,
        data: &[u8],
    ) -> Result<Vec<u8>, TokenError> {
        Token::sign_with_secret(&NoToken, reference, secret, algorithm, data)
    }

    fn import_pkcs12(
        &self,
        directory: &Path,
        pkcs12: &[u8],
        password: &str,
        pin: &ProtectedSecret,
    ) -> Result<Store, TokenError> {
        NoToken.import_pkcs12(directory, pkcs12, password, pin)
    }

    fn remove_certificate(
        &self,
        directory: &Path,
        reference: &CertificateRef,
        pin: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        NoToken.remove_certificate(directory, reference, pin)
    }
}

fn in_the_chosen_store() -> TokenCertificate {
    TokenCertificate::new(
        CertificateRef::new(
            Store::module(CHOSEN),
            "DNIe",
            "CertFirmaDigital",
            vec![0x01],
        ),
        TestAuthority::root("Firmante de la tarjeta").der(),
    )
}

fn in_the_other_store() -> TokenCertificate {
    TokenCertificate::new(
        CertificateRef::new(Store::module(OTHER), "rfirma-test", "OTRO", vec![0x02]),
        TestAuthority::root("Firmante del otro almacen").der(),
    )
}

fn shown_once_then(
    then: impl Fn() -> Result<Vec<TokenCertificate>, TokenError> + Send + Sync + 'static,
) -> impl Fn(usize) -> Result<Vec<TokenCertificate>, TokenError> + Send + Sync + 'static {
    move |listed_before| match listed_before {
        0 => Ok(vec![in_the_chosen_store()]),
        _ => then(),
    }
}

fn always_showing_the_other(_: usize) -> Result<Vec<TokenCertificate>, TokenError> {
    Ok(vec![in_the_other_store()])
}

fn over(token: TwoStores, installed: &Path) -> IdentityRoot {
    IdentityRoot {
        token: Box::new(token),
        stores: vec![Store::module(CHOSEN), Store::module(OTHER)],
        installed_certificates: installed.to_path_buf(),
        listed: ListedCertificates::new(),
        installed_copies: ListedCertificates::new(),
        last_listing: LastListing::default(),
        reader_now: ReaderNow::default(),
        memory: Arc::new(NoMemory),
        folder: Arc::new(adapters::folder::RealInstalledFolder),
        prompter: Arc::new(UnreachablePrompter),
        keyring: factory_of(CountingKeyring::with_pin("pin").0),
    }
}

fn the_handle_of(identity: &IdentityRoot, label: &str) -> String {
    let found = identity.certificates().expect("deberia listar");
    identity
        .rows_of(found)
        .into_iter()
        .find(|row| row.label.contains(label))
        .expect("tiene fila")
        .id
}

#[test]
fn the_chosen_certificate_fails_with_the_error_of_its_store_when_it_no_longer_lists() {
    let installed = tempfile::tempdir().expect("directorio temporal");
    let identity = over(
        TwoStores::new(
            shown_once_then(|| {
                Err(TokenError::new(
                    Situation::TokenAbsent,
                    "el lector no tiene tarjeta",
                ))
            }),
            always_showing_the_other,
        ),
        installed.path(),
    );
    let handle = the_handle_of(&identity, "CertFirmaDigital");

    let failure = identity.chosen(&handle).expect_err("su almacén ha fallado");

    assert_eq!(failure.situation(), Situation::TokenAbsent);
    assert_eq!(failure.detail(), "el lector no tiene tarjeta");
}

#[test]
fn the_site_resolving_a_handle_gets_the_error_of_its_store_when_it_no_longer_lists() {
    let installed = tempfile::tempdir().expect("directorio temporal");
    let identity = over(
        TwoStores::new(
            shown_once_then(|| {
                Err(TokenError::new(
                    Situation::Unknown,
                    "Transport(\"The smart card is not responding to a reset\")",
                ))
            }),
            always_showing_the_other,
        ),
        installed.path(),
    );
    let handle = the_handle_of(&identity, "CertFirmaDigital");

    let found = identity.certificates().expect("el otro almacén carga");
    let failure = identity
        .usable(&found, &handle)
        .expect_err("su almacén ha fallado");

    assert_eq!(failure.situation(), Situation::Unknown);
    assert!(
        failure.detail().contains("not responding to a reset"),
        "{}",
        failure.detail()
    );
}

#[test]
fn a_store_that_answers_without_the_chosen_certificate_says_it_is_no_longer_there() {
    let installed = tempfile::tempdir().expect("directorio temporal");
    let identity = over(
        TwoStores::new(shown_once_then(|| Ok(Vec::new())), always_showing_the_other),
        installed.path(),
    );
    let handle = the_handle_of(&identity, "CertFirmaDigital");

    let failure = identity.chosen(&handle).expect_err("ya no está");

    assert_eq!(failure.situation(), Situation::CertificateNotFound);
    assert!(
        failure.detail().contains("ya no tiene CertFirmaDigital"),
        "{}",
        failure.detail()
    );
}

#[test]
fn another_store_failing_leaves_the_chosen_certificate_resolved() {
    let installed = tempfile::tempdir().expect("directorio temporal");
    let identity = over(
        TwoStores::new(
            |_| Ok(vec![in_the_chosen_store()]),
            shown_once_then_other_fails,
        ),
        installed.path(),
    );
    let handle = the_handle_of(&identity, "CertFirmaDigital");

    let chosen = identity.chosen(&handle).expect("su almacén responde");

    assert_eq!(chosen.reference(), in_the_chosen_store().reference());
}

fn shown_once_then_other_fails(listed_before: usize) -> Result<Vec<TokenCertificate>, TokenError> {
    match listed_before {
        0 => Ok(vec![in_the_other_store()]),
        _ => Err(TokenError::new(
            Situation::TokenAbsent,
            "el otro no responde",
        )),
    }
}

#[test]
fn a_handle_not_from_the_last_listing_is_refused_as_such_even_if_a_store_failed() {
    let installed = tempfile::tempdir().expect("directorio temporal");
    let identity = over(
        TwoStores::new(
            |_| Err(TokenError::new(Situation::TokenAbsent, "sin tarjeta")),
            always_showing_the_other,
        ),
        installed.path(),
    );

    let failure = identity
        .chosen("00000000000000000000000000000000")
        .expect_err("no es de la última búsqueda");

    assert_eq!(failure.situation(), Situation::CertificateNotFound);
    assert!(
        failure.detail().contains("no es de la ultima busqueda"),
        "{}",
        failure.detail()
    );
}

#[test]
fn the_desktop_listing_still_shows_the_stores_that_load_and_fails_only_if_none_does() {
    let one_fails = TwoStores::new(
        |_| Err(TokenError::new(Situation::TokenAbsent, "sin tarjeta")),
        always_showing_the_other,
    );
    let both_fail = TwoStores::new(
        |_| Err(TokenError::new(Situation::TokenAbsent, "el primero")),
        |_| Err(TokenError::new(Situation::Unknown, "el segundo")),
    );
    let stores = [Store::module(CHOSEN), Store::module(OTHER)];

    let shown = one_fails.list_across(&stores).expect("el otro carga");
    let failure = both_fail.list_across(&stores).expect_err("ninguno carga");

    let shown: Vec<CertificateRef> = shown
        .iter()
        .map(|found| found.reference().clone())
        .collect();
    assert_eq!(shown, vec![in_the_other_store().reference().clone()]);
    assert_eq!(failure.detail(), "el primero");
}
