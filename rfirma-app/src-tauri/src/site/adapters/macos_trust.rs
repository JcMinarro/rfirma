//! `MacosUserTrust`, la CA local en la confianza del dominio de la persona usuaria de macOS con Security.framework, detrás del puerto `TrustStores`; solo en macOS (ADR-0040).

use std::path::{Path, PathBuf};
use std::ptr;

use core_foundation::array::{CFArray, CFArrayRef};
use core_foundation::base::{CFType, TCFType};
use security_framework::certificate::SecCertificate;
use security_framework::item::{ItemClass, ItemSearchOptions, Limit, Reference, SearchResult};
use security_framework::trust_settings::{Domain, TrustSettings, TrustSettingsForCertificate};
use security_framework_sys::base::{
    errSecDuplicateItem, errSecItemNotFound, errSecSuccess, SecCertificateRef,
};
use security_framework_sys::trust_settings::{
    kSecTrustSettingsDomainUser, SecTrustSettingsCopyTrustSettings, SecTrustSettingsDomain,
};

use super::{is_the_macos_user_trust, MACOS_USER_TRUST};
use crate::site::domain::local_ca::{has_the_local_ca_subject, COMMON_NAME};
use crate::site::domain::trust::TRUSTED_SSL_CA;
use crate::site::domain::trust_error::{Situation, TrustError};
use crate::site::ports::TrustStores;

const USER_CANCELED: i32 = -128;
const AUTHORIZATION_CANCELED: i32 = -60006;

#[link(name = "Security", kind = "framework")]
extern "C" {
    fn SecTrustSettingsRemoveTrustSettings(
        certificate: SecCertificateRef,
        domain: SecTrustSettingsDomain,
    ) -> i32;
}

/// La confianza del dominio de la persona usuaria: cambiarla pide su contraseña con el diálogo de macOS.
#[derive(Clone, Copy, Debug, Default)]
pub struct MacosUserTrust;

/// El único almacén donde se confía la CA local: Safari y Chrome lo leen, y Firefox 120 o posterior lo importa.
pub fn trust_profiles() -> Vec<PathBuf> {
    vec![PathBuf::from(MACOS_USER_TRUST)]
}

impl TrustStores for MacosUserTrust {
    fn install(
        &self,
        profile: &Path,
        certificate_der: &[u8],
        _nickname: &str,
    ) -> Result<(), TrustError> {
        let certificate = certificate_in(profile, certificate_der)?;
        match certificate.add_to_keychain(None) {
            Err(error) if error.code() != errSecDuplicateItem => {
                return Err(refused_or_failed(
                    Situation::TrustNotWritten,
                    "SecCertificateAddToKeychain",
                    error.code(),
                ))
            }
            _ => {}
        }
        TrustSettings::new(Domain::User)
            .set_trust_settings_always(&certificate)
            .map_err(|error| {
                refused_or_failed(
                    Situation::TrustNotWritten,
                    "SecTrustSettingsSetTrustSettings",
                    error.code(),
                )
            })
    }

    fn trust_of(&self, profile: &Path, certificate_der: &[u8]) -> Result<Option<u32>, TrustError> {
        let certificate = certificate_in(profile, certificate_der)?;
        match TrustSettings::new(Domain::User).tls_trust_settings_for_certificate(&certificate) {
            Err(error) if error.code() == errSecItemNotFound => Ok(None),
            Err(error) => Err(refused_or_failed(
                Situation::StoreUnreachable,
                "SecTrustSettingsCopyTrustSettings",
                error.code(),
            )),
            Ok(Some(
                TrustSettingsForCertificate::TrustRoot | TrustSettingsForCertificate::TrustAsRoot,
            )) => Ok(Some(TRUSTED_SSL_CA)),
            Ok(Some(_)) => Ok(None),
            Ok(None) => Ok(always_trusted(&certificate).then_some(TRUSTED_SSL_CA)),
        }
    }

    fn withdraw(&self, profile: &Path, certificate_der: &[u8]) -> Result<(), TrustError> {
        let certificate = certificate_in(profile, certificate_der)?;
        let status = unsafe {
            SecTrustSettingsRemoveTrustSettings(
                certificate.as_concrete_TypeRef(),
                kSecTrustSettingsDomainUser,
            )
        };
        if status != errSecSuccess && status != errSecItemNotFound {
            return Err(refused_or_failed(
                Situation::TrustNotWithdrawn,
                "SecTrustSettingsRemoveTrustSettings",
                status,
            ));
        }
        for copy in local_cas_in_the_keychain()?
            .into_iter()
            .filter(|copy| copy.to_der() == certificate_der)
        {
            copy.delete().map_err(|error| {
                refused_or_failed(Situation::TrustNotWithdrawn, "SecItemDelete", error.code())
            })?;
        }
        Ok(())
    }

    fn local_cas(&self, profile: &Path) -> Result<Vec<Vec<u8>>, TrustError> {
        the_user_trust(profile)?;
        Ok(local_cas_in_the_keychain()?
            .iter()
            .map(SecCertificate::to_der)
            .filter(|der| has_the_local_ca_subject(der))
            .collect())
    }
}

fn the_user_trust(profile: &Path) -> Result<(), TrustError> {
    if is_the_macos_user_trust(profile) {
        return Ok(());
    }
    Err(TrustError::new(
        Situation::StoreUnreachable,
        format!("«{}» no es la confianza de macOS", profile.display()),
    ))
}

fn certificate_in(profile: &Path, der: &[u8]) -> Result<SecCertificate, TrustError> {
    the_user_trust(profile)?;
    SecCertificate::from_der(der).map_err(|_| {
        TrustError::new(
            Situation::StoreUnreachable,
            "el certificado de la CA local no es DER",
        )
    })
}

/// Una configuración de confianza vacía es «confiar siempre», que el agregado por política no cuenta.
fn always_trusted(certificate: &SecCertificate) -> bool {
    let mut settings: CFArrayRef = ptr::null();
    let status = unsafe {
        SecTrustSettingsCopyTrustSettings(
            certificate.as_concrete_TypeRef(),
            kSecTrustSettingsDomainUser,
            &mut settings,
        )
    };
    if status != errSecSuccess || settings.is_null() {
        return false;
    }
    unsafe { CFArray::<CFType>::wrap_under_create_rule(settings) }.is_empty()
}

fn local_cas_in_the_keychain() -> Result<Vec<SecCertificate>, TrustError> {
    let found = ItemSearchOptions::new()
        .class(ItemClass::certificate())
        .label(COMMON_NAME)
        .load_refs(true)
        .limit(Limit::All)
        .search();
    match found {
        Err(error) if error.code() == errSecItemNotFound => Ok(Vec::new()),
        Err(error) => Err(refused_or_failed(
            Situation::StoreUnreachable,
            "SecItemCopyMatching",
            error.code(),
        )),
        Ok(results) => Ok(results
            .into_iter()
            .filter_map(|result| match result {
                SearchResult::Ref(Reference::Certificate(certificate)) => Some(certificate),
                _ => None,
            })
            .collect()),
    }
}

fn refused_or_failed(situation: Situation, step: &str, code: i32) -> TrustError {
    if code == USER_CANCELED || code == AUTHORIZATION_CANCELED {
        return TrustError::new(
            situation,
            "se ha cancelado el diálogo de contraseña de macOS",
        );
    }
    TrustError::new(
        situation,
        format!("Security.framework ha fallado en {step} (código {code})"),
    )
}

#[cfg(test)]
mod tests;
