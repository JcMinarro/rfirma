use std::cell::RefCell;
use std::path::{Path, PathBuf};

use super::super::{
    install_pkcs12, remove_installed, InstallError, ListedCertificates, RemovalListing,
};
use crate::identity::application::tests::NoToken;
use crate::identity::domain::algorithm::SignatureAlgorithm;
use crate::identity::domain::certificate::{CertificateRef, TokenCertificate};
use crate::identity::domain::error::{Situation, TokenError};
use crate::identity::domain::keyring::KeyringError;
use crate::identity::domain::protected_secret::ProtectedSecret;
use crate::identity::domain::secret::StoreSecret;
use crate::identity::domain::store::Store;
use crate::identity::ports::{CertificateMemory as _, InstalledFolder, Keyring, Token};
use crate::signing::application::tests::a_memory;

/// Un token que instala en el sistema y apunta lo que le piden.
struct SystemToken {
    imported: RefCell<Vec<String>>,
    removed: RefCell<Vec<CertificateRef>>,
    outcome: Result<(), TokenError>,
    installed: Vec<CertificateRef>,
}

impl SystemToken {
    fn answering(outcome: Result<(), TokenError>) -> Self {
        Self {
            imported: RefCell::new(Vec::new()),
            removed: RefCell::new(Vec::new()),
            outcome,
            installed: Vec::new(),
        }
    }

    fn having_installed(mut self, reference: &CertificateRef) -> Self {
        self.installed.push(reference.clone());
        self
    }
}

impl Token for SystemToken {
    fn installs_in_the_system(&self) -> bool {
        true
    }

    fn installed_in_the_system(&self, _directory: &Path, reference: &CertificateRef) -> bool {
        self.installed.contains(reference)
    }

    fn list(&self, store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
        NoToken.list(store)
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
        NoToken.secret_of(reference)
    }

    fn offers(
        &self,
        reference: &CertificateRef,
        algorithm: SignatureAlgorithm,
    ) -> Result<(), TokenError> {
        NoToken.offers(reference, algorithm)
    }

    fn accepts_the_secret(
        &self,
        reference: &CertificateRef,
        secret: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        NoToken.accepts_the_secret(reference, secret)
    }

    fn sign_with_secret(
        &self,
        reference: &CertificateRef,
        secret: &ProtectedSecret,
        algorithm: SignatureAlgorithm,
        data: &[u8],
    ) -> Result<Vec<u8>, TokenError> {
        NoToken.sign_with_secret(reference, secret, algorithm, data)
    }

    fn import_pkcs12(
        &self,
        _directory: &Path,
        _pkcs12: &[u8],
        password: &str,
        _pin: &ProtectedSecret,
    ) -> Result<Store, TokenError> {
        self.imported.borrow_mut().push(password.to_owned());
        self.outcome
            .clone()
            .map(|()| Store::module("keychain:search-list"))
    }

    fn remove_certificate(
        &self,
        _directory: &Path,
        reference: &CertificateRef,
        _pin: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        self.removed.borrow_mut().push(reference.clone());
        self.outcome.clone()
    }
}

/// Un llavero que no existe: en macOS el PIN del Almacén de rFirma no se usa.
struct NoKeyring;

impl Keyring for NoKeyring {
    fn pin(&self) -> Result<ProtectedSecret, KeyringError> {
        Err(KeyringError::NoKeyring)
    }

    fn create_pin(&self) -> Result<ProtectedSecret, KeyringError> {
        Err(KeyringError::NoKeyring)
    }
}

/// Una carpeta a la que instalar en el sistema no debe llegar.
struct UntouchedFolder;

impl InstalledFolder for UntouchedFolder {
    fn make(&self, _directory: &Path) -> Result<(), String> {
        panic!("instalar en el sistema no crea carpetas")
    }

    fn restrict_to_owner(&self, _path: &Path) {
        panic!("instalar en el sistema no toca permisos")
    }

    fn remove(&self, _directory: &Path) -> Result<(), String> {
        panic!("instalar en el sistema no borra carpetas")
    }

    fn remove_file(&self, _path: &Path) {
        panic!("instalar en el sistema no borra ficheros")
    }

    fn staging_directory(&self) -> PathBuf {
        panic!("instalar en el sistema no prepara un directorio de prueba")
    }
}

fn in_the_macos_store() -> CertificateRef {
    CertificateRef::new(
        Store::module("keychain:search-list"),
        "Keychain",
        "FIRMA",
        vec![0x01],
    )
}

#[test]
fn installing_in_the_system_needs_neither_the_rfirma_keyring_nor_its_folder() {
    let token = SystemToken::answering(Ok(()));

    let installed = install_pkcs12(
        &token,
        &UntouchedFolder,
        &NoKeyring,
        Path::new("/nada/certificates"),
        b"p12",
        "clave",
    );

    assert_eq!(installed, Ok(()));
    assert_eq!(*token.imported.borrow(), vec!["clave".to_owned()]);
}

#[test]
fn a_wrong_password_installing_in_the_system_is_the_tokens_refusal() {
    let token = SystemToken::answering(Err(TokenError::new(
        Situation::IncorrectPkcs12Password,
        "contrasena",
    )));

    let failure = install_pkcs12(
        &token,
        &UntouchedFolder,
        &NoKeyring,
        Path::new("/nada/certificates"),
        b"p12",
        "mala",
    )
    .expect_err("la contrasena es incorrecta");

    assert!(matches!(
        failure,
        InstallError::Token(token) if token.situation() == Situation::IncorrectPkcs12Password
    ));
}

#[test]
fn removing_a_macos_store_certificate_asks_the_system_and_forgets_it() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let memory = a_memory(home.path());
    let reference = in_the_macos_store();
    super::super::remember_the_certificate(&memory, &reference);
    let listed = ListedCertificates::new();
    let handle = listed.mint(reference.clone());
    let token = SystemToken::answering(Ok(())).having_installed(&reference);

    let removed = remove_installed(
        &token,
        &NoKeyring,
        &memory,
        &home.path().join("certificates"),
        &handle,
        RemovalListing {
            listed: &listed,
            installed_copies: &ListedCertificates::new(),
            last: &crate::identity::application::readers::LastListing::default(),
        },
    );

    assert_eq!(removed, Ok(()));
    assert_eq!(*token.removed.borrow(), vec![reference]);
    assert!(memory.remembered_certificate().is_none());
}

#[test]
fn a_macos_store_certificate_rfirma_did_not_install_is_not_removed() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let listed = ListedCertificates::new();
    let handle = listed.mint(in_the_macos_store());
    let token = SystemToken::answering(Ok(()));

    let failure = remove_installed(
        &token,
        &NoKeyring,
        &a_memory(home.path()),
        &home.path().join("certificates"),
        &handle,
        RemovalListing {
            listed: &listed,
            installed_copies: &ListedCertificates::new(),
            last: &crate::identity::application::readers::LastListing::default(),
        },
    )
    .expect_err("no lo instalo rFirma");

    assert!(matches!(
        failure,
        InstallError::Token(token) if token.situation() == Situation::CertificateNotFound
    ));
    assert!(token.removed.borrow().is_empty());
}
