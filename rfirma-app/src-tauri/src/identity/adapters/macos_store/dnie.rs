//! `DnieToken`, el DNIe leído con rdnie detrás del puerto `Token`: sus certificados y la CA intermedia, sin PIN, de la tarjeta que abre quien se le dé (ADR-0040).

use std::path::Path;

use rdnie::{PcscTransport, Session, Transport, INTERMEDIATE_CA_LABEL};

use crate::identity::domain::algorithm::SignatureAlgorithm;
use crate::identity::domain::certificate::{CertificateRef, TokenCertificate};
use crate::identity::domain::error::{Situation, TokenError};
use crate::identity::domain::protected_secret::ProtectedSecret;
use crate::identity::domain::secret::StoreSecret;
use crate::identity::domain::store::{Store, DNIE_STORE_PREFIX};
use crate::identity::ports::Token;

const TOKEN_LABEL: &str = "DNIe";

/// El almacén del DNIe: de clase tarjeta, sin módulo PKCS#11 detrás.
pub fn dnie_store() -> Store {
    Store::module(format!("{DNIE_STORE_PREFIX}pcsc"))
}

/// Si el almacén es el del DNIe.
pub fn is_the_dnie(store: &Store) -> bool {
    store
        .path()
        .to_str()
        .is_some_and(|module| module.starts_with(DNIE_STORE_PREFIX))
}

/// Quien abre la tarjeta para cada operación: el lector en producción, el emulador en las pruebas.
pub trait CardOpener: Send + Sync {
    /// Por dónde viajan las órdenes a la tarjeta.
    type Card: Transport;

    /// Una sesión nueva con el DNIe.
    fn open(&self) -> Result<Session<Self::Card>, rdnie::Error>;
}

/// El primer lector PC/SC con un DNIe, con la sesión normal de rdnie.
#[derive(Clone, Copy, Debug, Default)]
pub struct PcscCard;

impl CardOpener for PcscCard {
    type Card = PcscTransport;

    fn open(&self) -> Result<Session<PcscTransport>, rdnie::Error> {
        Session::open(PcscTransport::connect_first_dnie()?)
    }
}

/// El adaptador de [`Token`] para el almacén del DNIe.
#[derive(Clone, Copy, Debug, Default)]
pub struct DnieToken<O> {
    opener: O,
}

impl<O: CardOpener> DnieToken<O> {
    /// El DNIe que abre `opener`.
    pub fn new(opener: O) -> Self {
        Self { opener }
    }

    fn read(
        &self,
        store: &Store,
        with_the_intermediate: bool,
    ) -> Result<Vec<TokenCertificate>, TokenError> {
        let mut session = match self.opener.open() {
            Ok(session) => session,
            Err(error) if is_no_readable_dnie(&error) => return Ok(Vec::new()),
            Err(error) => return Err(token_error(&error)),
        };
        let mut found: Vec<TokenCertificate> = session
            .certificates()
            .map_err(|error| token_error(&error))?
            .into_iter()
            .map(|certificate| in_the_store(store, &certificate.label, certificate.der))
            .collect();
        if with_the_intermediate {
            let intermediate = session
                .certificate(INTERMEDIATE_CA_LABEL)
                .map_err(|error| token_error(&error))?;
            found.extend(intermediate.map(|der| in_the_store(store, INTERMEDIATE_CA_LABEL, der)));
        }
        Ok(found)
    }
}

fn in_the_store(store: &Store, label: &str, der: Vec<u8>) -> TokenCertificate {
    TokenCertificate::new(CertificateRef::new(store, TOKEN_LABEL, label, None), der)
}

fn is_no_readable_dnie(error: &rdnie::Error) -> bool {
    matches!(
        error,
        rdnie::Error::NoReader
            | rdnie::Error::NoCard
            | rdnie::Error::NotDnie
            | rdnie::Error::LegacyDnie
            | rdnie::Error::BurnedDnie
    )
}

fn token_error(error: &rdnie::Error) -> TokenError {
    let situation = match error {
        rdnie::Error::CardRemoved | rdnie::Error::CardReset => Situation::TokenAbsent,
        _ => Situation::Unknown,
    };
    TokenError::new(situation, error.to_string())
}

fn not_yet_signing() -> TokenError {
    TokenError::new(
        Situation::MechanismNotOffered,
        "el DNIe por rdnie todavia no firma",
    )
}

impl<O: CardOpener> Token for DnieToken<O> {
    fn list(&self, store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
        self.read(store, false)
    }

    fn every_certificate(&self, store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
        self.read(store, true)
    }

    fn list_authenticated(
        &self,
        store: &Store,
        _pin: &ProtectedSecret,
    ) -> Result<Vec<TokenCertificate>, TokenError> {
        self.list(store)
    }

    fn secret_of(&self, _reference: &CertificateRef) -> Result<StoreSecret, TokenError> {
        Ok(StoreSecret::TypedOnScreen)
    }

    fn offers(
        &self,
        _reference: &CertificateRef,
        _algorithm: SignatureAlgorithm,
    ) -> Result<(), TokenError> {
        Err(not_yet_signing())
    }

    fn accepts_the_secret(
        &self,
        _reference: &CertificateRef,
        _secret: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        Err(not_yet_signing())
    }

    fn sign_with_secret(
        &self,
        _reference: &CertificateRef,
        _secret: &ProtectedSecret,
        _algorithm: SignatureAlgorithm,
        _data: &[u8],
    ) -> Result<Vec<u8>, TokenError> {
        Err(not_yet_signing())
    }

    fn import_pkcs12(
        &self,
        _directory: &Path,
        _pkcs12: &[u8],
        _password: &str,
        _pin: &ProtectedSecret,
    ) -> Result<Store, TokenError> {
        Err(TokenError::new(
            Situation::Unknown,
            "un .p12 no se instala en el DNIe",
        ))
    }

    fn remove_certificate(
        &self,
        _directory: &Path,
        _reference: &CertificateRef,
        _pin: &ProtectedSecret,
    ) -> Result<(), TokenError> {
        Err(TokenError::new(
            Situation::Unknown,
            "del DNIe no se quita ningun certificado",
        ))
    }
}

#[cfg(test)]
mod tests;
