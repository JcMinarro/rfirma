# El DNIe y las tarjetas en macOS

Mediciones con tarjetas reales en macOS, contraparte de
[`dnie-en-windows.md`](dnie-en-windows.md), para el
[spec de macOS](https://github.com/sgomez/rfirma/issues/2000). Las sondas las ejecuta el
titular con las reglas de ID-485, y su salida no trae certificados, nombres ni números de
serie.

## Una app con firma ad hoc y las identidades de un token del sistema

Si un binario firmado ad hoc, sin equipo, sin entitlements y sin perfil de
aprovisionamiento —como rFirma sin cuenta de Apple Developer— puede listar las
identidades de un token del sistema y firmar con ellas. Sin el DNIe: una tarjeta PIV o una
YubiKey, que macOS lee con su `pivtoken`. De esto depende ID-532 (ID-540).

La sonda es [`card-probes/keychain_token_probe.swift`](card-probes/keychain_token_probe.swift):
tres consultas de identidades (llavero clásico, grupo `com.apple.token` y este con el
llavero de protección de datos) y una sola firma de un resumen SHA-256 con
`SecKeyCreateSignature`, verificada con la clave pública del certificado. El PIN lo pide
macOS; la sonda no reintenta.

### Resultado

**No se ha medido.** El titular no tiene una tarjeta PIV ni una YubiKey: su llave FIDO
no ofrece PIV y macOS no crea ningún token con ella, y el DNIe no lo reconoce macOS sin un
controlador de terceros, que el spec deja fuera de esta sonda. Las alternativas sin
tarjeta —una PIV emulada con `vsmartcard` y jCardSim, una JavaCard con un applet PIV o un
token propio de CryptoTokenKit— cuestan más que lo que ID-532 aporta: una tarjeta que no
es el DNIe, que entre los usuarios de rFirma es marginal.

### Conclusión para ID-532

**ID-532 cae por decisión, no por medición.** Las tarjetas entran solo por PKCS#11 y el
Almacén de macOS se queda con los certificados de software. Quien tenga una tarjeta PIV
puede reabrirlo ejecutando la sonda, primero con `--list-only`.
