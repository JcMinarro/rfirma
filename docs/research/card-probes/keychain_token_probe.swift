// Mide si un binario con firma ad hoc y sin perfil de aprovisionamiento lista y usa las identidades de un token del sistema de macOS (#2002, ID-540).
//
// Uso:
//   swiftc -O keychain_token_probe.swift -o keychain_token_probe
//   codesign --force --sign - keychain_token_probe
//   ./keychain_token_probe [--list-only] [--index N]
// Empieza con la tarjeta PIV o la YubiKey dentro. Firma un resumen SHA-256 una sola vez, con la identidad N del token (0 por defecto);
// el PIN lo pide macOS y la sonda no reintenta nunca. No imprime certificados, nombres, números de serie ni el sufijo del token.

import CryptoKit
import Foundation
import Security

struct Query {
    let name: String
    let extra: [CFString: Any]
}

let queries = [
    Query(name: "llavero clásico", extra: [:]),
    Query(name: "grupo de tokens", extra: [kSecAttrAccessGroup: kSecAttrAccessGroupToken]),
    Query(name: "grupo de tokens + llavero de protección de datos",
          extra: [kSecAttrAccessGroup: kSecAttrAccessGroupToken, kSecUseDataProtectionKeychain: true]),
]

func describe(_ status: OSStatus) -> String {
    let message = SecCopyErrorMessageString(status, nil) as String? ?? "?"
    return "\(status) (\(message))"
}

func tokenKind(_ tokenID: String) -> String {
    String(tokenID.split(separator: ":").first ?? "")
}

func printSigningInfo() {
    var code: SecCode?
    var staticCode: SecStaticCode?
    var info: CFDictionary?
    guard SecCodeCopySelf([], &code) == errSecSuccess, let code,
          SecCodeCopyStaticCode(code, [], &staticCode) == errSecSuccess, let staticCode,
          SecCodeCopySigningInformation(staticCode, SecCSFlags(rawValue: kSecCSSigningInformation), &info) == errSecSuccess,
          let info = info as? [CFString: Any]
    else {
        print("firma del binario: no se pudo leer")
        return
    }
    let flags = (info[kSecCodeInfoFlags] as? UInt32) ?? 0
    let adhoc = flags & SecCodeSignatureFlags.adhoc.rawValue != 0
    let entitlements = (info[kSecCodeInfoEntitlementsDict] as? [String: Any])?.keys.sorted() ?? []
    print("firma del binario: ad hoc=\(adhoc), equipo=\(info[kSecCodeInfoTeamIdentifier] as? String ?? "ninguno"), "
        + "entitlements=\(entitlements.isEmpty ? "ninguno" : entitlements.joined(separator: ","))")
}

func tokenIdentities(_ query: Query) -> [[CFString: Any]] {
    var attributes: [CFString: Any] = [
        kSecClass: kSecClassIdentity,
        kSecMatchLimit: kSecMatchLimitAll,
        kSecReturnRef: true,
        kSecReturnAttributes: true,
    ]
    attributes.merge(query.extra) { _, new in new }
    var result: CFTypeRef?
    let started = Date()
    let status = SecItemCopyMatching(attributes as CFDictionary, &result)
    let elapsed = String(format: "%.2f", Date().timeIntervalSince(started))
    let items = (result as? [[CFString: Any]]) ?? []
    let fromToken = items.filter { $0[kSecAttrTokenID] != nil }
    let kinds = Set(fromToken.compactMap { ($0[kSecAttrTokenID] as? String).map(tokenKind) }).sorted()
    print("consulta «\(query.name)»: estado=\(describe(status)), identidades=\(items.count), "
        + "de token=\(fromToken.count) \(kinds), \(elapsed)s")
    return fromToken
}

func algorithm(for key: SecKey) -> SecKeyAlgorithm? {
    let attributes = SecKeyCopyAttributes(key) as? [CFString: Any] ?? [:]
    let type = attributes[kSecAttrKeyType] as? String
    let bits = attributes[kSecAttrKeySizeInBits] as? Int ?? 0
    print("clave: tipo=\(type == (kSecAttrKeyTypeRSA as String) ? "RSA" : type == (kSecAttrKeyTypeECSECPrimeRandom as String) ? "EC" : type ?? "?"), bits=\(bits)")
    if type == (kSecAttrKeyTypeRSA as String) { return .rsaSignatureDigestPKCS1v15SHA256 }
    if type == (kSecAttrKeyTypeECSECPrimeRandom as String) { return .ecdsaSignatureDigestX962SHA256 }
    return nil
}

func signOnce(with item: [CFString: Any]) -> Int32 {
    guard let ref = item[kSecValueRef] else { print("la identidad no trae referencia"); return 2 }
    let identity = ref as! SecIdentity
    var privateKey: SecKey?
    var certificate: SecCertificate?
    let keyStatus = SecIdentityCopyPrivateKey(identity, &privateKey)
    let certStatus = SecIdentityCopyCertificate(identity, &certificate)
    print("clave privada: \(describe(keyStatus)); certificado: \(describe(certStatus))")
    guard let privateKey, let certificate, let publicKey = SecCertificateCopyKey(certificate) else { return 2 }
    guard let algorithm = algorithm(for: privateKey) else { print("tipo de clave no previsto"); return 2 }
    print("admite el algoritmo: \(SecKeyIsAlgorithmSupported(privateKey, .sign, algorithm))")

    let digest = Data(SHA256.hash(data: Data("rfirma #2002".utf8)))
    var error: Unmanaged<CFError>?
    print("firmando: macOS pedirá el PIN")
    let started = Date()
    let signature = SecKeyCreateSignature(privateKey, algorithm, digest as CFData, &error) as Data?
    let elapsed = String(format: "%.2f", Date().timeIntervalSince(started))
    guard let signature else {
        let cfError = error!.takeRetainedValue()
        print("firma: fallo dominio=\(CFErrorGetDomain(cfError)!) código=\(CFErrorGetCode(cfError)), \(elapsed)s")
        return 1
    }
    let verified = SecKeyVerifySignature(publicKey, algorithm, digest as CFData, signature as CFData, nil)
    print("firma: \(signature.count) bytes, verifica con el certificado=\(verified), \(elapsed)s")
    return verified ? 0 : 1
}

let arguments = CommandLine.arguments
let listOnly = arguments.contains("--list-only")
let index = arguments.firstIndex(of: "--index").flatMap { Int(arguments[safe: $0 + 1] ?? "") } ?? 0

extension Array {
    subscript(safe position: Int) -> Element? { indices.contains(position) ? self[position] : nil }
}

print("macOS \(ProcessInfo.processInfo.operatingSystemVersionString)")
printSigningInfo()
let found = queries.map(tokenIdentities)
guard !listOnly else { exit(0) }
guard let candidates = found.first(where: { !$0.isEmpty }), let chosen = candidates[safe: index] else {
    print("ninguna consulta devuelve la identidad \(index) de un token: no se firma")
    exit(1)
}
exit(signOnce(with: chosen))
