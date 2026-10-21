//! Lo que se ve de un DNIe sin leer nada de su titular.

/// ATR, versión y juego de claves de un DNIe.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SeenDnie {
    /// ATR en hexadecimal.
    pub atr: String,
    /// «3.0» o «4.0», según el chip.
    pub version: String,
    /// «primero» o «segundo», el juego de claves del canal seguro.
    pub key_set: String,
}
