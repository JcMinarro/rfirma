//! El llavero de macOS leído con Security.framework: las identidades con su certificado y el token de su clave, sin abrirla (ADR-0001).

use core_foundation::base::{CFType, TCFType};
use core_foundation::string::CFString;
use openssl::hash::{hash, MessageDigest};
use security_framework::certificate::SecCertificate;
use security_framework::identity::SecIdentity;
use security_framework::item::{ItemClass, ItemSearchOptions, Limit, Reference, SearchResult};
use security_framework::key::SecKey;
use security_framework::os::macos::keychain::SecKeychain;
use security_framework_sys::item::kSecAttrTokenID;

use super::SEARCH_LIST;
use crate::identity::domain::certificate::{CertificateRef, TokenCertificate};
use crate::identity::domain::error::{Situation, TokenError};
use crate::identity::domain::store::{Store, MACOS_STORE_PREFIX};

/// La etiqueta de «token» de los certificados del llavero.
pub const TOKEN_LABEL: &str = "Keychain";

const SYSTEM_ROOTS: &str = "/System/Library/Keychains/SystemRootCertificates.keychain";

const ITEM_NOT_FOUND: i32 = -25300;

/// Las identidades del llavero: los certificados con su clave privada.
pub fn signable_certificates(store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
    let _no_prompt = SecKeychain::disable_user_interaction().map_err(|error| failure(&error))?;
    Ok(found(ItemClass::identity(), &scope_of(store)?)?
        .into_iter()
        .filter_map(|reference| match reference {
            Reference::Identity(identity) => certificate_of_identity(store, &identity),
            _ => None,
        })
        .collect())
}

/// Todos los certificados del llavero y las raíces del sistema: con ellos se completa la cadena.
pub fn every_certificate(store: &Store) -> Result<Vec<TokenCertificate>, TokenError> {
    let _no_prompt = SecKeychain::disable_user_interaction().map_err(|error| failure(&error))?;
    let scope = scope_of(store)?;
    let mut certificates = found(ItemClass::certificate(), &scope)?;
    if scope.is_none() {
        if let Ok(roots) = SecKeychain::open(SYSTEM_ROOTS) {
            certificates
                .extend(found(ItemClass::certificate(), &Some(vec![roots])).unwrap_or_default());
        }
    }
    Ok(certificates
        .into_iter()
        .filter_map(|reference| match reference {
            Reference::Certificate(certificate) => {
                Some(certificate_in(store, &certificate.to_der(), None))
            }
            _ => None,
        })
        .collect())
}

/// Los llaveros donde se busca: ninguno en concreto es la lista de búsqueda de la persona usuaria.
fn scope_of(store: &Store) -> Result<Option<Vec<SecKeychain>>, TokenError> {
    let named = store
        .path()
        .to_str()
        .and_then(|path| path.strip_prefix(MACOS_STORE_PREFIX))
        .unwrap_or(SEARCH_LIST);
    if named == SEARCH_LIST {
        return Ok(None);
    }
    SecKeychain::open(named)
        .map(|keychain| Some(vec![keychain]))
        .map_err(|error| failure(&error))
}

fn found(class: ItemClass, scope: &Option<Vec<SecKeychain>>) -> Result<Vec<Reference>, TokenError> {
    let mut search = ItemSearchOptions::new();
    search.class(class).load_refs(true).limit(Limit::All);
    if let Some(keychains) = scope {
        search.keychains(keychains);
    }
    match search.search() {
        Ok(results) => Ok(results
            .into_iter()
            .filter_map(|result| match result {
                SearchResult::Ref(reference) => Some(reference),
                _ => None,
            })
            .collect()),
        Err(error) if error.code() == ITEM_NOT_FOUND => Ok(Vec::new()),
        Err(error) => Err(failure(&error)),
    }
}

fn certificate_of_identity(store: &Store, identity: &SecIdentity) -> Option<TokenCertificate> {
    let certificate = identity.certificate().ok()?;
    let token = identity
        .private_key()
        .ok()
        .and_then(|key| token_holding(&key));
    Some(certificate_in(store, &certificate.to_der(), token))
}

fn certificate_in(store: &Store, der: &[u8], token: Option<String>) -> TokenCertificate {
    let thumbprint = hash(MessageDigest::sha1(), der)
        .map(|digest| digest.to_vec())
        .unwrap_or_default();
    let label = SecCertificate::from_der(der)
        .map(|certificate| certificate.subject_summary())
        .ok()
        .filter(|summary| !summary.is_empty())
        .unwrap_or_else(|| hex(&thumbprint));
    let reference = CertificateRef::new(store.clone(), TOKEN_LABEL, label, thumbprint);
    let reference = match token {
        Some(token) => reference.with_key_provider(token),
        None => reference,
    };
    TokenCertificate::new(reference, der.to_vec())
}

/// El token del sistema que guarda la clave, leído de sus atributos; una clave de software no tiene.
fn token_holding(key: &SecKey) -> Option<String> {
    let attributes = key.attributes();
    let value = attributes.find(unsafe { kSecAttrTokenID }.cast())?;
    let value = unsafe { CFType::wrap_under_get_rule(*value) };
    value.downcast::<CFString>().map(|token| token.to_string())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02X}")).collect()
}

fn failure(error: &security_framework::base::Error) -> TokenError {
    TokenError::new(
        Situation::Unknown,
        format!("el llavero de macOS ha fallado ({}): {error}", error.code()),
    )
}
