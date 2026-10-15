//! Las fichas de las firmas previas en el panel de firmas de la sede: el formato y los recuentos atenuados, los hallazgos y una ficha por firma con quién, en nombre de quién y cuándo, sin más datos del certificado.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Card } from "../design-system/Card";
import { Icon } from "../design-system/icons";
import { Row } from "../design-system/Row";
import type {
  PreviousSignature,
  PreviousSignaturesReport,
  SignatureFormat,
  SigningDate,
  Validity,
} from "../signing/previousSignatures";
import { findingText, validityReasonText } from "../signing/validityReasons";
import "../signing/SignatureCards.css";

const FORMAT_NAMES = { pades: "PAdES", cades: "CAdES", xades: "XAdES" } as const;

/** «PAdES · 3 firmas · 1 contrafirma»: el formato, si se reconoce, y los recuentos. */
export function signaturesOverview(t: TFunction, report: PreviousSignaturesReport): string {
  const format: SignatureFormat = report.format ?? "pades";
  return [format === "unrecognized" ? null : FORMAT_NAMES[format], signaturesTally(t, report)]
    .filter((part) => part !== null)
    .join(" · ");
}

/** Cuántas firmas y contrafirmas trae, sin el formato: «2 firmas · 1 contrafirma». */
export function signaturesTally(t: TFunction, report: PreviousSignaturesReport): string {
  const countersignatures = countersignaturesIn(report.signatures);
  return [
    t("panel.signed.count", { count: report.signatures.length }),
    countersignatures === 0
      ? null
      : t("panel.signed.countersignatureCount", { count: countersignatures }),
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

function countersignaturesIn(signatures: readonly PreviousSignature[]): number {
  return signatures.reduce(
    (total, signature) =>
      total + signature.countersignatures.length + countersignaturesIn(signature.countersignatures),
    0,
  );
}

/** Los hallazgos del documento, encima, y las fichas de sus firmas apiladas. */
export function SedeSignatureCards({ report }: { report: PreviousSignaturesReport }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {report.findings.length > 0 && (
        <ul className="signature-cards__findings">
          {report.findings.map((finding) => (
            <li className="signature-cards__finding" key={finding}>
              <span className="signature-cards__finding-icon">
                <Icon name="failure" size={15} />
              </span>
              <span>{findingText(t, finding)}</span>
            </li>
          ))}
        </ul>
      )}
      <ol className="signature-cards">
        {report.signatures.map((signature, index) => (
          <Card
            as="li"
            className="signature-cards__card"
            // biome-ignore lint/suspicious/noArrayIndexKey: el orden es la identidad de la firma.
            key={index}
          >
            <CardHead
              label={t("panel.signed.signature", { number: index + 1 })}
              validity={signature.validity}
            />
            <SignatureRows signature={signature} locale={i18n.language} />
            <Countersignatures
              signature={signature}
              numbering={String(index + 1)}
              locale={i18n.language}
            />
          </Card>
        ))}
      </ol>
    </>
  );
}

function CardHead({ label, validity }: { label: string; validity: Validity }) {
  const { t } = useTranslation();
  return (
    <Row className="signature-cards__head">
      <span className="rf-label signature-cards__label">{label}</span>
      <span className={`signature-cards__validity signature-cards__validity--${validity}`}>
        <ValidityIcon validity={validity} />
        <span className="rf-body">{validityLabel(t, validity)}</span>
      </span>
    </Row>
  );
}

function ValidityIcon({ validity }: { validity: Validity }) {
  switch (validity) {
    case "valid":
      return <Icon name="success" size={14} />;
    case "expired":
      return <Icon name="warning" size={14} />;
    case "invalid":
      return <Icon name="failure" size={14} />;
  }
}

function validityLabel(t: TFunction, validity: Validity): string {
  switch (validity) {
    case "valid":
      return t("panel.signed.validity.valid");
    case "expired":
      return t("panel.signed.validity.expired");
    case "invalid":
      return t("panel.signed.validity.invalid");
  }
}

function Countersignatures({
  signature,
  numbering,
  locale,
}: {
  signature: PreviousSignature;
  numbering: string;
  locale: string;
}) {
  const { t } = useTranslation();
  return signature.countersignatures.map((countersignature, index) => {
    const path = `${numbering}.${index + 1}`;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: el orden es la identidad de la firma.
      <div className="signature-cards__countersignature" key={index}>
        <CardHead
          label={t("panel.signed.countersignature", { number: path })}
          validity={countersignature.validity}
        />
        <SignatureRows signature={countersignature} locale={locale} />
        <Countersignatures signature={countersignature} numbering={path} locale={locale} />
      </div>
    );
  });
}

function SignatureRows({ signature, locale }: { signature: PreviousSignature; locale: string }) {
  const { t } = useTranslation();
  const date = dateRow(t, signature.signingDate, locale);
  const rows: [string, string, boolean][] = [
    [t("panel.signed.field.signer"), signature.name, true],
    [t("panel.signed.field.onBehalfOf"), signature.organizationIdentifier ?? "", false],
    [t("panel.signed.field.issuer"), signature.issuer, false],
    ...(date === null ? [] : [date]),
    [
      t("panel.signed.field.reason"),
      signature.validityReason === null
        ? ""
        : validityReasonText(t, signature.validityReason, locale),
      false,
    ],
  ];

  return (
    <>
      {rows
        .filter(([, value]) => value !== "")
        .map(([label, value, strong]) => (
          <Row className="signature-cards__field" key={label}>
            <span className="rf-body rf-text-muted signature-cards__field-label">{label}</span>
            <span
              className={`rf-body signature-cards__field-value${strong ? " signature-cards__field-value--signer" : ""}`}
            >
              {value}
            </span>
          </Row>
        ))}
      {signature.closesDocument && (
        <span className="rf-body signature-cards__closes">{t("panel.signed.closesDocument")}</span>
      )}
    </>
  );
}

function dateRow(
  t: TFunction,
  date: SigningDate | null,
  locale: string,
): [string, string, boolean] | null {
  if (date === null) return null;
  const at = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date.at),
  );
  return date.kind === "declared"
    ? [t("panel.signed.field.date"), at, false]
    : [t("panel.signed.field.sealed"), at, false];
}
