// La sede de pega: una página por HTTPS en `sede.localhost` que manda firmar a rFirma con el `autoscript.js` publicado.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:https";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SAMPLES } from "./samples.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const theDesignSystem = join(root, "rfirma-app/src/design-system/bundle");
const port = Number(process.env.RFIRMA_SEDE_PORT ?? "8443");
const HOST = "sede.localhost";
const theLocalCa = join(dataDirectory(), "rfirma");
const autoscript = process.env.RFIRMA_AUTOSCRIPT;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

const PAGES = {
  "/": join(here, "index.html"),
  "/sede.js": join(here, "sede.js"),
  "/sede.css": join(here, "sede.css"),
  "/logo.svg": join(root, "packaging/repo/site/public/favicon.svg"),
  "/autoscript.js": autoscript,
};

/** La carpeta de datos donde rFirma guarda su CA local, la misma que resuelve `desktop/adapters/paths.rs`. */
function dataDirectory() {
  switch (process.platform) {
    case "win32":
      return process.env.APPDATA;
    case "darwin":
      return join(homedir(), "Library/Application Support");
    default:
      return process.env.XDG_DATA_HOME || join(homedir(), ".local/share");
  }
}

/** El fichero del sistema de diseño que pide `path`, sin salir de su carpeta. */
function inTheDesignSystem(path) {
  const file = resolve(theDesignSystem, `.${path.slice("/ds".length)}`);
  return relative(theDesignSystem, file).startsWith("..") ? null : file;
}

function answer(response, status, type, body) {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(body);
}

function serving(request, response) {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/muestras.json") {
    const catalogue = SAMPLES.map(({ id, kind, label, file }) => ({ id, kind, label, file }));
    return answer(response, 200, TYPES[".json"], JSON.stringify(catalogue));
  }
  if (path.startsWith("/muestras/")) {
    const sample = SAMPLES.find(({ id }) => id === path.slice("/muestras/".length));
    if (!sample) return answer(response, 404, "text/plain", "no hay esa muestra");
    return answer(response, 200, "application/octet-stream", sample.bytes());
  }
  const file = path.startsWith("/ds/") ? inTheDesignSystem(path) : PAGES[path];
  try {
    return answer(response, 200, TYPES[extname(file)] ?? "application/octet-stream", readFileSync(file));
  } catch {
    return answer(response, 404, "text/plain", "no está");
  }
}

/** Un certificado de servidor de un día para `HOST`, emitido por la CA local de rFirma, en la que ya confían los navegadores. */
function aCertificateOfTheLocalCa() {
  const folder = mkdtempSync(join(tmpdir(), "rfirma-sede-"));
  const at = (name) => join(folder, name);
  const openssl = (...args) => execFileSync("openssl", args, { stdio: ["ignore", "ignore", "pipe"] });
  try {
    writeFileSync(
      at("server.ext"),
      `subjectAltName=DNS:${HOST},DNS:localhost,IP:127.0.0.1,IP:::1\n` +
        "extendedKeyUsage=serverAuth\nkeyUsage=critical,digitalSignature\nbasicConstraints=critical,CA:FALSE\n",
    );
    openssl("genpkey", "-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256", "-out", at("server.key"));
    openssl("req", "-new", "-key", at("server.key"), "-subj", `/CN=${HOST}`, "-out", at("server.csr"));
    openssl(
      "x509", "-req", "-in", at("server.csr"), "-days", "1", "-sha256",
      "-CA", join(theLocalCa, "local-ca.crt.pem"), "-CAkey", join(theLocalCa, "local-ca.key.pem"),
      "-set_serial", `0x${Date.now().toString(16)}`, "-extfile", at("server.ext"), "-out", at("server.crt"),
    );
    return { key: readFileSync(at("server.key")), cert: readFileSync(at("server.crt")) };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

if (!autoscript) {
  process.stderr.write("falta RFIRMA_AUTOSCRIPT: corre `just sede`\n");
  process.exit(2);
}

let tls;
try {
  tls = aCertificateOfTheLocalCa();
} catch {
  process.stderr.write(`no se ha podido emitir el certificado con la CA local de ${theLocalCa}: arranca rFirma una vez\n`);
  process.exit(2);
}
for (const address of ["127.0.0.1", "::1"]) {
  createServer(tls, serving).listen(port, address);
}
process.stdout.write(`Sede de pega en https://${HOST}:${port}/ (Ctrl+C para pararla)\n`);
