//! La franja de firmas que ya trae el documento, sobre el visor que envuelve, y su panel flotante y modal con las fichas, que Escape cierra sin cancelar el trámite.

import type { TFunction } from "i18next";
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import type { PreviousSignaturesReport, Validity } from "../signing/previousSignatures";
import { SignatureCards, signaturesOverview, signaturesTally } from "../signing/SignatureCards";
import { allSignaturesOf } from "./received";
import "./SignaturesStrip.css";

const VALIDITIES: readonly Validity[] = ["valid", "expired", "invalid"];

/** El visor con la franja de sus firmas encima; sin firmas, el visor solo. */
export function SignaturesStrip({
  report,
  defaultOpen = false,
  children,
}: {
  report: PreviousSignaturesReport;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useRef<HTMLButtonElement>(null);
  const signatures = allSignaturesOf(report.signatures);

  if (signatures.length === 0) return <div className="signatures-strip">{children}</div>;

  return (
    <div className="signatures-strip">
      <section className="signatures-strip__bar" aria-label={t("sede.signatures.region")}>
        <span className="rf-body">{signaturesTally(t, report)}</span>
        {VALIDITIES.map((validity) => {
          const count = signatures.filter((signature) => signature.validity === validity).length;
          return (
            count > 0 && (
              <span
                key={validity}
                className={`signatures-strip__validity signatures-strip__validity--${validity}`}
              >
                <ValidityIcon validity={validity} />
                <span className="rf-body">{validityCount(t, validity, count)}</span>
              </span>
            )
          );
        })}
        <Button
          ref={toggle}
          variant="ghost"
          className="signatures-strip__toggle"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
        >
          {open ? t("sede.signatures.hide") : t("sede.signatures.show")}
        </Button>
      </section>
      <div className="signatures-strip__stage">
        {children}
        {open && <SignaturesSheet report={report} toggle={toggle} onClose={() => setOpen(false)} />}
      </div>
    </div>
  );
}

function ValidityIcon({ validity }: { validity: Validity }) {
  switch (validity) {
    case "valid":
      return <Icon name="success" size={16} />;
    case "expired":
      return <Icon name="warning" size={16} />;
    case "invalid":
      return <Icon name="failure" size={16} />;
  }
}

function validityCount(t: TFunction, validity: Validity, count: number): string {
  switch (validity) {
    case "valid":
      return t("sede.signatures.valid", { count });
    case "expired":
      return t("sede.signatures.expired", { count });
    case "invalid":
      return t("sede.signatures.invalid", { count });
  }
}

function SignaturesSheet({
  report,
  toggle,
  onClose,
}: {
  report: PreviousSignaturesReport;
  toggle: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const latestClose = useRef(onClose);
  latestClose.current = onClose;

  useEffect(() => {
    sheet.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      latestClose.current();
      toggle.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sheet.current?.contains(target) || toggle.current?.contains(target)) return;
      latestClose.current();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [toggle]);

  return (
    <div
      ref={sheet}
      className="signatures-strip__sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="signatures-strip__sheet-head">
        <p className="signatures-strip__sheet-title" id={titleId}>
          <Icon name="document" size={16} />
          <span>{t("panel.signed.title")}</span>
        </p>
        <p className="rf-caption rf-text-muted">{signaturesOverview(t, report)}</p>
      </div>
      <SignatureCards signatures={report.signatures} findings={report.findings} />
    </div>
  );
}
