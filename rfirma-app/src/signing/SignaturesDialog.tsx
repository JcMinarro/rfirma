//! El diálogo «Ver firmas»: las firmas que ya trae el documento, con su validez, que se mira y se cierra.

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Dialog } from "../design-system/Dialog";
import { Row } from "../design-system/Row";
import type { PreviousSignaturesReport } from "./previousSignatures";
import { SignatureCards, signaturesOverview } from "./SignatureCards";
import "./SignaturesDialog.css";

interface SignaturesDialogProps {
  report: PreviousSignaturesReport;
  onClose: () => void;
}

/** El diálogo «Ver firmas» (docs/design/dialogo-ver-firmas.md), con una sola salida. */
export function SignaturesDialog({ report, onClose }: SignaturesDialogProps) {
  const { t } = useTranslation();
  const closeButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      label={t("panel.signed.title")}
      onClose={onClose}
      primary={closeButton}
      className="signatures-dialog"
      scrimClassName="signatures-dialog__scrim"
    >
      <div className="signatures-dialog__head">
        <p className="rf-title">{t("panel.signed.title")}</p>
        <p className="rf-body rf-text-muted">{signaturesOverview(t, report)}</p>
      </div>

      <div className="signatures-dialog__scroll">
        <SignatureCards signatures={report.signatures} findings={report.findings} />
      </div>

      <hr className="rf-divider" />

      <Row className="signatures-dialog__actions">
        <Button variant="primary" ref={closeButton} onClick={onClose}>
          {t("actions.close")}
        </Button>
      </Row>
    </Dialog>
  );
}
