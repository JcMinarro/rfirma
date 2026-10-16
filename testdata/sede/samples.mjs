// Los documentos que la sede de pega ofrece para firmar, sacados del banco de pruebas sin copiarlos.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  aCertifiedPdf,
  aPasswordProtectedPdf,
  theCmsSignatureOfTheSite,
  theInvoice,
  theReferenceSignature,
} from "../site-driver/lib/fixtures.mjs";

const testdata = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromTestdata = (path) => () => readFileSync(join(testdata, path));
const ofTheSede = (file) => fromTestdata(`sede/samples/${file}`);

const THE_REFERENCE_NAMESPACE = "http://www.facturae.es/Facturae/2009/v3.2/Facturae";

/** La factura de referencia, que es 3.2, pasada a otra versión por su espacio de nombres. */
function theInvoiceIn(namespace, version) {
  return () =>
    Buffer.from(
      theInvoice()
        .toString("utf8")
        .replace(THE_REFERENCE_NAMESPACE, namespace)
        .replace("<SchemaVersion>3.2</SchemaVersion>", `<SchemaVersion>${version}</SchemaVersion>`),
      "utf8",
    );
}

const aSample = (id, kind, label, file, bytes) => ({ id, kind, label, file, bytes });

export const SAMPLES = [
  aSample("facturae-3.2", "invoice", "FacturaE 3.2", "factura-3.2.xml", theInvoice),
  aSample(
    "facturae-3.2.1",
    "invoice",
    "FacturaE 3.2.1",
    "factura-3.2.1.xml",
    theInvoiceIn("http://www.facturae.es/Facturae/2014/v3.2.1/Facturae", "3.2.1"),
  ),
  aSample(
    "facturae-3.2.2",
    "invoice",
    "FacturaE 3.2.2",
    "factura-3.2.2.xml",
    theInvoiceIn("http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml", "3.2.2"),
  ),
  aSample(
    "facturae-3.1",
    "invoice",
    "FacturaE 3.1",
    "factura-3.1.xml",
    theInvoiceIn("http://www.facturae.es/Facturae/2007/v3.1/Facturae", "3.1"),
  ),
  aSample("contrato-pdf", "pdf", "Contrato (PDF)", "contrato.pdf", ofTheSede("contrato.pdf")),
  aSample("pdf-certified", "pdf", "PDF certificado", "certificado.pdf", aCertifiedPdf),
  aSample("pdf-password", "pdf", "PDF cifrado (1234)", "cifrado.pdf", aPasswordProtectedPdf),
  aSample(
    "pdf-signed",
    "signed-pdf",
    "PDF firmado",
    "firmado.pdf",
    fromTestdata("previous-signatures/pades-two-signatures-oldest-listed-first.pdf"),
  ),
  aSample("solicitud", "xml", "Solicitud (XML)", "solicitud.xml", ofTheSede("solicitud.xml")),
  aSample("contrato-odt", "document", "Contrato (ODT)", "contrato.odt", ofTheSede("contrato.odt")),
  aSample("contrato-docx", "document", "Contrato (DOCX)", "contrato.docx", ofTheSede("contrato.docx")),
  aSample("presupuesto-ods", "document", "Presupuesto (ODS)", "presupuesto.ods", ofTheSede("presupuesto.ods")),
  aSample(
    "presupuesto-xlsx",
    "document",
    "Presupuesto (XLSX)",
    "presupuesto.xlsx",
    ofTheSede("presupuesto.xlsx"),
  ),
  aSample("justificante", "document", "Justificante (JPEG)", "justificante.jpg", ofTheSede("justificante.jpg")),
  aSample("grafica", "document", "Gráfica (PNG)", "ejecucion.png", ofTheSede("ejecucion.png")),
  aSample("declaracion", "document", "Declaración (TXT)", "declaracion.txt", ofTheSede("declaracion.txt")),
  aSample("expediente", "document", "Expediente (ZIP)", "expediente.zip", ofTheSede("expediente.zip")),
  aSample("cades", "cades", "CAdES implícita", "firma.csig", () =>
    theReferenceSignature("cades-implicit.p7s"),
  ),
  aSample("cms", "cms", "CMS implícita", "firma.p7s", theCmsSignatureOfTheSite),
  aSample("xades", "xades", "XAdES Enveloping", "firma.xsig", () =>
    theReferenceSignature("xades-enveloping.xml"),
  ),
  aSample(
    "cades-asics",
    "asic-cades",
    "CAdES-ASiC-S",
    "firma.asics",
    fromTestdata("site-driver/test/samples/cades-asics.zip"),
  ),
];
