//! Los hallazgos del documento y una ficha por firma con su validez, las mismas en el resumen y en el diálogo «Ver firmas».

import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";
import { Icon } from "../design-system/icons";
import { Row } from "../design-system/Row";
import type {
  DocumentFinding,
  PreviousSignature,
  PreviousSignaturesReport,
  SignatureFormat,
  SigningDate,
  Validity,
} from "./previousSignatures";
import { findingText, validityReasonText } from "./validityReasons";
import "./SignatureCards.css";

const FORMAT_NAMES = { pades: "PAdES", cades: "CAdES", xades: "XAdES" } as const;

/** «PAdES · 3 firmas · 1 contrafirma»: el formato, si se reconoce, y los recuentos. */
export function signaturesOverview(
  t: TFunction,
  report: Pick<PreviousSignaturesReport, "signatures"> & { format?: SignatureFormat },
): string {
  const format: SignatureFormat = report.format ?? "pades";
  return [format === "unrecognized" ? null : FORMAT_NAMES[format], signaturesTally(t, report)]
    .filter((part) => part !== null)
    .join(" · ");
}

/** Cuántas firmas y contrafirmas trae, sin el formato: «2 firmas · 1 contrafirma». */
export function signaturesTally(
  t: TFunction,
  report: Pick<PreviousSignaturesReport, "signatures">,
): string {
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

interface SignatureCardsProps {
  signatures: readonly PreviousSignature[];
  findings: readonly DocumentFinding[];
  /** Es el resumen de lo que se acaba de firmar: la última ficha es la propia y el cambio es anterior a ella. */
  justSigned?: boolean;
}

/** Los hallazgos del documento, encima, y las fichas de sus firmas apiladas. */
export function SignatureCards({ signatures, findings, justSigned = false }: SignatureCardsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  return (
    <>
      {findings.length > 0 && (
        <ul className="signature-cards__findings">
          {findings.map((finding) => (
            <li className="signature-cards__finding" key={finding}>
              <span className="signature-cards__finding-icon">
                <Icon name="failure" size={15} />
              </span>
              <span>{findingLabel(t, finding, justSigned)}</span>
            </li>
          ))}
        </ul>
      )}
      <ol className="signature-cards">
        {signatures.map((signature, index) => (
          <Card
            as="li"
            className="signature-cards__card"
            // biome-ignore lint/suspicious/noArrayIndexKey: el orden es la identidad de la firma.
            key={index}
          >
            <CardHead
              label={t("panel.signed.signature", { number: index + 1 })}
              signature={signature}
              isNew={justSigned && index === signatures.length - 1}
            />
            <SignatureRows signature={signature} locale={locale} />
            <Countersignatures
              signature={signature}
              numbering={String(index + 1)}
              locale={locale}
            />
          </Card>
        ))}
      </ol>
    </>
  );
}

function findingLabel(t: TFunction, finding: DocumentFinding, justSigned: boolean): string {
  return justSigned && finding === "modifiedAfterLastSignature"
    ? t("documentFinding.modifiedBeforeYourSignature")
    : findingText(t, finding);
}

function CardHead({
  label,
  signature,
  isNew,
}: {
  label: string;
  signature: PreviousSignature;
  isNew: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Row className="signature-cards__head">
      <span className="rf-label signature-cards__label">{label}</span>
      {isNew && <Badge variant="primary">{t("panel.signed.new")}</Badge>}
      <span
        className={`signature-cards__validity signature-cards__validity--${signature.validity}`}
      >
        {validityIcon(signature.validity)}
        <span className="rf-body">{validityLabel(t, signature.validity)}</span>
      </span>
    </Row>
  );
}

function validityIcon(validity: Validity): ReactNode {
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
          signature={countersignature}
          isNew={false}
        />
        <SignatureRows signature={countersignature} locale={locale} />
        <Countersignatures signature={countersignature} numbering={path} locale={locale} />
      </div>
    );
  });
}

function SignatureRows({ signature, locale }: { signature: PreviousSignature; locale: string }) {
  const { t } = useTranslation();
  const rows: [string, string, boolean][] = [
    [t("panel.signed.field.signer"), signature.name, true],
    [
      t("panel.signed.field.onBehalfOf"),
      signature.entityName ?? signature.organizationIdentifier ?? "",
      false,
    ],
    [t("panel.signed.field.issuer"), signature.issuer, false],
    ...dateRows(t, signature.signingDate, locale),
  ];
  const reason =
    signature.validityReason === null
      ? ""
      : validityReasonText(t, signature.validityReason, locale);

  return (
    <>
      {rows
        .filter(([, value]) => value !== "")
        .map(([label, value, strong]) => (
          <SignatureField key={label} label={label} value={value} strong={strong} />
        ))}
      {reason !== "" && (
        <SignatureField label={t("panel.signed.field.reason")} value={reason} strong={false} />
      )}
      {signature.closesDocument && (
        <span className="rf-body signature-cards__closes">{t("panel.signed.closesDocument")}</span>
      )}
    </>
  );
}

function SignatureField({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong: boolean;
}) {
  return (
    <Row className="signature-cards__field">
      <span className="rf-body rf-text-muted signature-cards__field-label">{label}</span>
      <span
        className={`rf-body signature-cards__field-value${strong ? " signature-cards__field-value--signer" : ""}`}
      >
        {value}
      </span>
    </Row>
  );
}

function dateRows(
  t: TFunction,
  date: SigningDate | null,
  locale: string,
): [string, string, boolean][] {
  if (date === null) return [];
  const at = formatCardDate(date.at, locale);
  return date.kind === "declared"
    ? [[t("panel.signed.field.date"), at, false]]
    : [[t("panel.signed.field.sealed"), at, false]];
}

function formatCardDate(instant: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(instant),
  );
}
