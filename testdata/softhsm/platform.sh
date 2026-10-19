# Módulo de SoftHSM y órdenes de instalación de cada sistema; se carga con `source`.

if [ "$(uname -s)" = Darwin ]; then
    softhsm_module="${HOMEBREW_PREFIX:-/opt/homebrew}/lib/softhsm/libsofthsm2.so"
    install_tools="brew install softhsm opensc openssl"
    install_softhsm="brew install softhsm"
else
    softhsm_module="/usr/lib/softhsm/libsofthsm2.so"
    install_tools="sudo apt install -y softhsm2 opensc openssl"
    install_softhsm="sudo apt install -y softhsm2"
fi
module="${RFIRMA_PKCS11_MODULE:-$softhsm_module}"
