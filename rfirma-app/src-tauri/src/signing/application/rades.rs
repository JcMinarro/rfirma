//! `Rades`, el `Bridge` de CMS hecho en Rust sobre rades: prefirma y postfirma sin puente, y lo que rades no hace rechazado antes del PIN (ADR-0001, ADR-0016).

use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use ::rades::cades::{self, Certificates, Content};
use ::rades::{Certificate, DigestAlgorithm, SignatureValue, SigningTime};
use base64::Engine;
use serde::{Deserialize, Serialize};

use crate::identity::domain::algorithm::SignatureAlgorithm;
use crate::signing::domain::bridge::{
    BridgeError, Format, PostSignRequest, PreSignBlock, PreSignRequest, PreSignature,
    SignatureOperation,
};
use crate::signing::domain::SessionSeal;
use crate::signing::ports::Bridge;
use crate::site::domain::protocol::pairs_of;

const CHAIN_SEPARATOR: char = ';';
const MODE: &str = "mode";
const ONLY_THE_SIGNER: &str = "includeOnlySignningCertificate";

/// El `Bridge` de rades, con el reloj del que toma la hora de firma.
pub struct Rades {
    unix_seconds: fn() -> u64,
}

impl Rades {
    /// El de producción: la hora de firma, del reloj del sistema.
    pub fn on_the_system_clock() -> Self {
        Self {
            unix_seconds: || {
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_or(0, |since| since.as_secs())
            },
        }
    }

    /// Uno que firma siempre a la hora que da `unix_seconds`.
    pub fn at(unix_seconds: fn() -> u64) -> Self {
        Self { unix_seconds }
    }

    /// Si rades firma ese formato en lugar del puente.
    pub fn signs(format: Format) -> bool {
        format == Format::Cms
    }
}

/// Lo que la postfirma necesita para rehacer la fase 1, ya que no recibe ni `extraParams` ni algoritmo.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Session {
    signing_time: u64,
    algorithm: String,
    extra_params: String,
}

impl Bridge for Rades {
    fn presign(&self, request: PreSignRequest<'_>) -> Result<PreSignature, BridgeError> {
        if request.operation != SignatureOperation::Sign {
            return Err(BridgeError::UnsupportedOperation(
                request.format,
                request.operation,
            ));
        }
        let session = Session {
            signing_time: (self.unix_seconds)(),
            algorithm: request.algorithm.to_owned(),
            extra_params: request.extra_params.to_owned(),
        };
        let data_to_sign = phase_one(
            &session,
            request.document_b64,
            request.certificate_chain_b64,
        )?;
        let session = serde_json::to_string(&session)
            .map_err(|error| BridgeError::Failed(error.to_string()))?;
        Ok(PreSignature {
            stamp: seal_of(&session),
            session,
            blocks: vec![PreSignBlock {
                id: hex_sha256(&data_to_sign),
                pre: data_to_sign,
            }],
        })
    }

    fn postsign(&self, request: PostSignRequest<'_>) -> Result<Vec<u8>, BridgeError> {
        let sealed = request.sealed;
        if *sealed.stamp() != seal_of(sealed.session()) {
            return Err(BridgeError::Failed(
                "la sesión no es la que selló la prefirma".to_owned(),
            ));
        }
        let session: Session = serde_json::from_str(sealed.session())
            .map_err(|error| BridgeError::MalformedResponse(error.to_string()))?;
        let pending = pending_of(
            &session,
            request.document_b64,
            request.certificate_chain_b64,
        )?;
        let [signed] = sealed.signed() else {
            return Err(BridgeError::MalformedResponse(format!(
                "una firma CMS lleva un PKCS#1, y llegaron {}",
                sealed.signed().len()
            )));
        };
        let [data_to_sign] = pending.data_to_sign() else {
            return Err(BridgeError::Failed(
                "rades pide más de un bloque".to_owned(),
            ));
        };
        if signed.id() != hex_sha256(data_to_sign.bytes()) {
            return Err(BridgeError::Failed(
                "los datos a firmar no son los que firmó el token".to_owned(),
            ));
        }
        let value = decoded(signed.pkcs1_b64(), "el PKCS#1")?;
        pending
            .complete(&[SignatureValue::new(value)])
            .map_err(rades_failed)
    }
}

fn phase_one(
    session: &Session,
    document_b64: &str,
    chain_b64: &str,
) -> Result<Vec<u8>, BridgeError> {
    let pending = pending_of(session, document_b64, chain_b64)?;
    match pending.data_to_sign() {
        [only] => Ok(only.bytes().to_vec()),
        blocks => Err(BridgeError::Failed(format!(
            "rades pide {} bloques y el CMS firma uno",
            blocks.len()
        ))),
    }
}

fn pending_of(
    session: &Session,
    document_b64: &str,
    chain_b64: &str,
) -> Result<cades::PendingSignature, BridgeError> {
    let algorithm = rades_algorithm(&session.algorithm)?;
    let parameters = admitted(&session.extra_params)?;
    let document = decoded(document_b64, "el documento")?;
    let mut chain = chain_of(chain_b64)?;
    if chain.is_empty() {
        return Err(BridgeError::InvalidArgument("la cadena de certificados"));
    }
    let signer = chain.remove(0);
    let content = match parameters.get(MODE).map(String::as_str) {
        None | Some("implicit") => Content::Attached(&document),
        Some("explicit") => Content::Detached(&document),
        Some(other) => {
            return Err(BridgeError::NotSupported(format!("{MODE}={other}")));
        }
    };
    let certificates = if parameters
        .get(ONLY_THE_SIGNER)
        .is_some_and(|value| value.eq_ignore_ascii_case("true"))
    {
        Certificates::Signer
    } else {
        Certificates::Chain(chain)
    };
    let signing_time =
        SigningTime::from_unix_seconds(session.signing_time).map_err(rades_failed)?;
    cades::sign_bare(content, &signer, algorithm, signing_time, &certificates).map_err(rades_failed)
}

fn admitted(extra_params: &str) -> Result<BTreeMap<String, String>, BridgeError> {
    let parameters: BTreeMap<String, String> = pairs_of(extra_params).into_iter().collect();
    match parameters
        .keys()
        .find(|key| ![MODE, ONLY_THE_SIGNER].contains(&key.as_str()))
    {
        Some(unknown) => Err(BridgeError::NotSupported(unknown.clone())),
        None => Ok(parameters),
    }
}

fn rades_algorithm(name: &str) -> Result<::rades::SignatureAlgorithm, BridgeError> {
    use ::rades::SignatureAlgorithm::{Ecdsa, RsaPkcs1v15, RsaPss};
    use DigestAlgorithm::{Sha256, Sha384, Sha512};
    let not_supported = || BridgeError::NotSupported(name.to_owned());
    Ok(
        match SignatureAlgorithm::from_name(name).ok_or_else(not_supported)? {
            SignatureAlgorithm::Sha1Rsa | SignatureAlgorithm::Sha1Ecdsa => {
                return Err(not_supported())
            }
            SignatureAlgorithm::Sha256Rsa => RsaPkcs1v15(Sha256),
            SignatureAlgorithm::Sha384Rsa => RsaPkcs1v15(Sha384),
            SignatureAlgorithm::Sha512Rsa => RsaPkcs1v15(Sha512),
            SignatureAlgorithm::Sha256RsaPss => RsaPss(Sha256),
            SignatureAlgorithm::Sha384RsaPss => RsaPss(Sha384),
            SignatureAlgorithm::Sha512RsaPss => RsaPss(Sha512),
            SignatureAlgorithm::Sha256Ecdsa => Ecdsa(Sha256),
            SignatureAlgorithm::Sha384Ecdsa => Ecdsa(Sha384),
            SignatureAlgorithm::Sha512Ecdsa => Ecdsa(Sha512),
        },
    )
}

fn chain_of(chain_b64: &str) -> Result<Vec<Certificate>, BridgeError> {
    chain_b64
        .split(CHAIN_SEPARATOR)
        .filter(|one| !one.is_empty())
        .map(|one| {
            Certificate::from_der(&decoded(one, "un certificado de la cadena")?)
                .map_err(rades_failed)
        })
        .collect()
}

/// El sello se deriva de la sesión, así que alterarla entre las dos fases lo rompe (ADR-0016).
fn seal_of(session: &str) -> SessionSeal {
    SessionSeal::from_bridge(hex_sha256(session.as_bytes()))
}

fn hex_sha256(bytes: &[u8]) -> String {
    openssl::sha::sha256(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn decoded(b64: &str, what: &'static str) -> Result<Vec<u8>, BridgeError> {
    base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|_| BridgeError::InvalidArgument(what))
}

fn rades_failed(error: ::rades::Error) -> BridgeError {
    BridgeError::Failed(error.to_string())
}

#[cfg(test)]
mod tests;
