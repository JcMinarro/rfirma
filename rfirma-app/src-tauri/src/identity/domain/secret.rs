//! Cómo se pide el secreto de acceso a cada almacén PKCS#11: sin sesión, por pantalla o en el teclado del lector.

use std::fmt;

use crate::identity::domain::error::{Situation, TokenError};
use crate::identity::domain::store::StoreClass;

/// Cómo se llama el secreto en los términos de quien firma: el PIN de un módulo o la contraseña de un fichero.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SecretName {
    /// El PIN de un módulo PKCS#11.
    Pin,
    /// La contraseña de un almacén que es un fichero.
    Password,
    /// La contraseña que abre un PDF cifrado; no es de ningún almacén.
    DocumentPassword,
    /// La contraseña del `.p12` que se está instalando, con el nombre de su fichero.
    Pkcs12Password(String),
}

impl SecretName {
    /// La palabra que le toca a la clase de almacén.
    pub fn of(store: StoreClass) -> Self {
        match store {
            // En Windows el PIN lo pide el propio sistema, pero si hay que nombrarlo es el de la tarjeta.
            StoreClass::Card | StoreClass::Windows => Self::Pin,
            StoreClass::Browser(_)
            | StoreClass::Nssdb
            | StoreClass::Installed
            | StoreClass::Macos => Self::Password,
        }
    }
}

/// Modalidad de solicitud del secreto que desbloquea la clave privada de un almacén.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StoreSecret {
    /// El almacén no exige autenticación previa.
    NotNeeded,
    /// El secreto se introduce interactivamente por pantalla.
    TypedOnScreen,
    /// El secreto se introduce en el teclado físico del lector.
    TypedOnTheReaderKeypad,
}

impl StoreSecret {
    /// Determina la modalidad a partir de las banderas del token.
    pub fn of_token(login_required: bool, protected_authentication_path: bool) -> Self {
        match (login_required, protected_authentication_path) {
            (false, _) => Self::NotNeeded,
            (true, true) => Self::TypedOnTheReaderKeypad,
            (true, false) => Self::TypedOnScreen,
        }
    }

    /// Valida que la modalidad de secreto esté admitida para la firma.
    pub fn admitted(self) -> Result<Self, SecretOnTheReaderKeypad> {
        match self {
            Self::TypedOnTheReaderKeypad => Err(SecretOnTheReaderKeypad),
            admitted => Ok(admitted),
        }
    }
}

/// Rechazo emitido cuando el almacén requiere introducción de PIN en el lector.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SecretOnTheReaderKeypad;

impl SecretOnTheReaderKeypad {
    /// Clave identificadora de la situación en el catálogo de errores.
    pub fn situation(self) -> &'static str {
        "secretOnTheReaderKeypad"
    }
}

impl fmt::Display for SecretOnTheReaderKeypad {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(
            "el secreto de este almacen se teclea en el teclado del lector, \
             y rfirma todavia no sabe pedirlo asi",
        )
    }
}

impl std::error::Error for SecretOnTheReaderKeypad {}

/// Lo que la tarjeta deja saber de sus intentos antes de teclear el PIN (ADR-0047).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum PinWarning {
    /// La tarjeta no da ninguna señal: el diálogo de siempre.
    #[default]
    Quiet,
    /// Ya ha habido algún intento fallido (`CKF_USER_PIN_COUNT_LOW`).
    CountLow,
    /// Un PIN incorrecto bloquea la tarjeta (`CKF_USER_PIN_FINAL_TRY`).
    FinalTry,
    /// Los intentos restantes exactos, cuando la tarjeta los da.
    AttemptsLeft(u32),
}

impl PinWarning {
    /// El aviso que dan las banderas del token; el último intento manda sobre el contador bajo.
    pub fn of_token(count_low: bool, final_try: bool) -> Self {
        match (count_low, final_try) {
            (_, true) => Self::FinalTry,
            (true, false) => Self::CountLow,
            (false, false) => Self::Quiet,
        }
    }

    /// Si el aviso se resalta: el último intento, o quedan uno o dos.
    pub fn stands_out(self) -> bool {
        matches!(self, Self::FinalTry | Self::AttemptsLeft(1 | 2))
    }

    /// El aviso, salvo que no queden intentos: entonces el PIN está bloqueado y no se pide (ADR-0047).
    pub fn unless_locked(self) -> Result<Self, TokenError> {
        match self {
            Self::AttemptsLeft(0) => Err(TokenError::new(
                Situation::PinLocked,
                "la tarjeta no tiene intentos restantes",
            )),
            open => Ok(open),
        }
    }
}

#[cfg(test)]
mod tests;
