// El formulario de la sede de pega: arma la llamada a `AutoScript` y enseña lo que contesta el cliente.

const DOCUMENTS = ["invoice", "pdf", "signed-pdf", "xml", "document"];
const TO_SIGN = {
  CAdES: DOCUMENTS,
  "CAdES-ASiC-S": DOCUMENTS,
  XAdES: DOCUMENTS,
  "XAdES-ASiC-S": DOCUMENTS,
  PAdES: ["pdf", "signed-pdf"],
  FacturaE: ["invoice"],
  "CMS/PKCS#7": DOCUMENTS,
  NONE: DOCUMENTS,
};

/** Qué formatos admite cada operación y, en cada uno, de qué clase son las muestras que acepta. */
const FORMATS = {
  sign: TO_SIGN,
  signAndSaveToFile: TO_SIGN,
  cosign: {
    AUTO: ["cades", "cms", "xades", "asic-cades", "signed-pdf"],
    CAdES: ["cades"],
    "CMS/PKCS#7": ["cms", "cades"],
    XAdES: ["xades"],
    "CAdES-ASiC-S": ["asic-cades"],
    PAdES: ["pdf", "signed-pdf"],
  },
  counterSign: {
    AUTO: ["cades", "cms", "xades"],
    CAdES: ["cades"],
    "CMS/PKCS#7": ["cms", "cades"],
    XAdES: ["xades"],
    "CAdES-ASiC-S": ["asic-cades"],
  },
  selectCertificate: {},
};

const GROUP = {
  invoice: "FacturaE",
  pdf: "PDF",
  "signed-pdf": "PDF",
  xml: "Documentos",
  document: "Documentos",
  cades: "Firmas",
  cms: "Firmas",
  xades: "Firmas",
  "asic-cades": "Firmas",
};

const signing = (op) => op === "sign" || op === "signAndSaveToFile";
const signingOrCosigning = (op) => signing(op) || op === "cosign";

/** Cada atajo de extraParams, con cuándo tiene sentido. */
const PRESETS = [
  ["Explícita", "mode=explicit", (op, format) => signing(op) && ["CAdES", "CMS/PKCS#7"].includes(format)],
  ["Implícita", "mode=implicit", (op, format) => signing(op) && ["CAdES", "CMS/PKCS#7"].includes(format)],
  [
    "XAdES Enveloped",
    "format=XAdES Enveloped",
    (op, format, kind) => signing(op) && format === "XAdES" && ["xml", "invoice"].includes(kind),
  ],
  ["XAdES Enveloping", "format=XAdES Enveloping", (op, format) => signing(op) && format === "XAdES"],
  ["XAdES Detached", "format=XAdES Detached", (op, format) => signing(op) && format === "XAdES"],
  [
    "Política AGE",
    "expPolicy=FirmaAGE",
    (op, format) => signingOrCosigning(op) && ["CAdES", "XAdES", "PAdES"].includes(format),
  ],
  [
    "Rol y lugar",
    "signerClaimedRoles=emisor\nsignatureProductionCity=Madrid",
    (op, format) => signingOrCosigning(op) && ["XAdES", "FacturaE"].includes(format),
  ],
  [
    "PAdES visible",
    "signaturePage=1\nsignaturePositionOnPageLowerLeftX=60\nsignaturePositionOnPageLowerLeftY=60\n" +
      "signaturePositionOnPageUpperRightX=260\nsignaturePositionOnPageUpperRightY=140\n" +
      "layer2Text=Firmado por $$SUBJECTCN$$ el $$SIGNDATE=dd/MM/yyyy$$",
    (op, format) => signingOrCosigning(op) && format === "PAdES",
  ],
  ["PAdES área a elegir", "visibleSignature=want", (op, format) => signingOrCosigning(op) && format === "PAdES"],
  ["Contrafirma de hojas", "target=leafs", (op) => op === "counterSign"],
  ["Contrafirma del árbol", "target=tree", (op) => op === "counterSign"],
  ["Sin diálogos", "headless=true", () => true],
];

const EXTENSION = {
  CAdES: "csig",
  "CAdES-ASiC-S": "asics",
  XAdES: "xsig",
  "XAdES-ASiC-S": "asics",
  PAdES: "pdf",
  FacturaE: "xsig",
  "CMS/PKCS#7": "p7s",
  NONE: "sig",
};

const $ = (id) => document.getElementById(id);
let samples = [];

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToBlob(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes]);
}

function theSource() {
  return document.querySelector("input[name=source]:checked").value;
}

async function theData() {
  const source = theSource();
  if (source === "none") return { base64: null, name: "elegido en el cliente" };
  if (source === "file") {
    const file = $("file").files[0];
    if (!file) throw new Error("No has elegido ningún fichero.");
    return { base64: bytesToBase64(new Uint8Array(await file.arrayBuffer())), name: file.name };
  }
  const sample = samples.find(({ id }) => id === $("sample").value);
  const response = await fetch(`/muestras/${sample.id}`);
  return { base64: bytesToBase64(new Uint8Array(await response.arrayBuffer())), name: sample.file };
}

function theParams() {
  return $("params").value.trim();
}

function aDownload(label, base64, fileName) {
  const link = document.createElement("a");
  link.className = "rf-btn rf-btn--secondary rf-btn--pill";
  link.textContent = label;
  link.download = fileName;
  link.href = URL.createObjectURL(base64ToBlob(base64));
  return link;
}

function showing(kind, title, lines, downloads = []) {
  const result = $("result");
  result.className = `result ${kind}`;
  result.replaceChildren();
  const heading = document.createElement("p");
  heading.className = "result-title";
  heading.textContent = title;
  result.append(heading);
  for (const [name, value] of lines) {
    const row = document.createElement("div");
    row.className = "result-row";
    const dt = document.createElement("span");
    dt.textContent = name;
    const dd = document.createElement("code");
    dd.textContent = value;
    row.append(dt, dd);
    result.append(row);
  }
  if (downloads.length) {
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(...downloads);
    result.append(actions);
  }
}

function remembering(kind, summary) {
  const item = document.createElement("li");
  item.className = kind;
  item.textContent = `${new Date().toLocaleTimeString("es-ES")} · ${summary}`;
  $("history").prepend(item);
}

const sizeOf = (base64) => `${Math.round((base64.length * 3) / 4).toLocaleString("es-ES")} bytes`;

function onSuccess(request) {
  return (first, second, third) => {
    const { op, format, algorithm, name } = request;
    const summary = `${op} ${format ?? ""} ${algorithm ?? ""} sobre ${name}: correcto`;
    if (op === "selectCertificate") {
      showing("ok", "Certificado", [["Certificado", sizeOf(String(first))]], [
        aDownload("Descargar certificado", String(first), "certificado.cer"),
      ]);
    } else if (op === "signAndSaveToFile") {
      showing("ok", "Guardado", [
        ["Firma", first ? sizeOf(String(first)) : "no la devuelve"],
        ["Información extra", third ? String(third) : "ninguna"],
      ]);
    } else {
      const extension = EXTENSION[format] ?? "sig";
      showing(
        "ok",
        "Firmado",
        [
          ["Firma", sizeOf(String(first))],
          ["Certificado", second ? sizeOf(String(second)) : "no lo devuelve"],
        ],
        [
          aDownload("Descargar firma", String(first), `firma.${extension}`),
          ...(second ? [aDownload("Descargar certificado", String(second), "certificado.cer")] : []),
        ],
      );
    }
    remembering("ok", summary);
  };
}

function onError(request) {
  return (type, message) => {
    showing("error", "Error", [
      ["Tipo", String(type)],
      ["Mensaje", String(message)],
    ]);
    remembering("error", `${request.op} ${request.format ?? ""} sobre ${request.name}: ${type}`);
  };
}

async function sending(event) {
  event.preventDefault();
  const op = $("op").value;
  const format = $("format").value;
  const algorithm = $("algorithm").value;
  const params = theParams();
  let data;
  try {
    data = op === "selectCertificate" ? { base64: null, name: "—" } : await theData();
  } catch (error) {
    showing("error", "No enviado", [["Motivo", error.message]]);
    return;
  }
  const request = { op, format, algorithm, name: data.name };
  showing("waiting", "Esperando…", [
    ["Operación", op],
    ["Formato", format],
    ["Algoritmo", algorithm],
    ["Documento", data.name],
  ]);
  AutoScript.setKeyStore($("keystore").value || null);
  const ok = onSuccess(request);
  const ko = onError(request);
  switch (op) {
    case "sign":
      return AutoScript.sign(data.base64, algorithm, format, params, ok, ko);
    case "cosign":
      return AutoScript.cosign(data.base64, algorithm, format, params, ok, ko);
    case "counterSign":
      return AutoScript.counterSign(data.base64, algorithm, format, params, ok, ko);
    case "signAndSaveToFile":
      return AutoScript.signAndSaveToFile("sign", data.base64, algorithm, format, params, data.name, ok, ko);
    default:
      return AutoScript.selectCertificate(params, ok, ko);
  }
}

function theSample() {
  return samples.find(({ id }) => id === $("sample").value);
}

/** Deja en `select` las opciones dadas, conservando la elegida si sigue entre ellas. */
function offering(select, options) {
  const chosen = select.value;
  select.replaceChildren(...options);
  if ([...select.options].some((option) => option.value === chosen)) select.value = chosen;
}

function offeringTheFormats(op) {
  offering(
    $("format"),
    Object.keys(FORMATS[op]).map((format) => new Option(format)),
  );
}

function offeringTheSamples(op, format) {
  const kinds = FORMATS[op][format] ?? [];
  const groups = new Map();
  for (const sample of samples.filter(({ kind }) => kinds.includes(kind))) {
    const label = GROUP[sample.kind];
    if (!groups.has(label)) {
      const group = document.createElement("optgroup");
      group.label = label;
      groups.set(label, group);
    }
    groups.get(label).append(new Option(sample.label, sample.id));
  }
  offering($("sample"), [...groups.values()]);
}

/** Los atajos que tienen sentido ahora; los que no, se quitan también de extraParams. */
function offeringThePresets(op, format, kind) {
  const stale = new Set();
  for (const chip of $("presets").children) {
    const [, text, fits] = PRESETS[chip.dataset.index];
    chip.hidden = !fits(op, format, kind);
    if (chip.hidden) for (const line of text.split("\n")) stale.add(line);
  }
  $("params").value = $("params")
    .value.split("\n")
    .filter((line) => !stale.has(line.trim()))
    .join("\n");
}

function adjustingTheForm() {
  const op = $("op").value;
  for (const element of document.querySelectorAll("[data-needs]")) {
    element.hidden = op === "selectCertificate";
  }
  offeringTheFormats(op);
  const format = $("format").value;
  offeringTheSamples(op, format);
  offeringThePresets(op, format, theSample()?.kind);
  $("sample").disabled = theSource() !== "sample";
  $("file").disabled = theSource() !== "file";
}

async function loadingTheSamples() {
  samples = await (await fetch("/muestras.json")).json();
  adjustingTheForm();
}

function drawingThePresets() {
  PRESETS.forEach(([label, text], index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "rf-badge chip";
    chip.textContent = label;
    chip.title = text;
    chip.dataset.index = String(index);
    chip.addEventListener("click", () => {
      const current = $("params").value.trimEnd();
      $("params").value = current ? `${current}\n${text}` : text;
    });
    $("presets").append(chip);
  });
}

drawingThePresets();
loadingTheSamples();
adjustingTheForm();
$("operation").addEventListener("submit", sending);
$("operation").addEventListener("change", adjustingTheForm);
$("clear").addEventListener("click", () => {
  $("params").value = "";
});
AutoScript.cargarAppAfirma();
