//! 1, 3 y el guardar o cargar, con el esqueleto del consentimiento compacto: la cabecera de quién lo pide, el título a la izquierda y las salidas en el pie.

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Admonition } from "../design-system/Admonition";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { ProgressBar } from "../design-system/ProgressBar";
import { Row } from "../design-system/Row";
import { Stack } from "../design-system/Stack";
import { Tab, Tabs } from "../design-system/Tabs";
import { useDefaultButton } from "../design-system/useDefaultButton";
import { CHROME_LOCAL_NETWORK_SETTINGS, type SigningPhase } from "./errand";
import { SedeBody } from "./SedeFrame";
import { SedeOrigin } from "./SedeOrigin";
import "./SedeWindow.css";
import "./SedeEnding.css";
import "./SedePassing.css";

type Asks = "signature" | "identity";

interface SedeAwaitingProps {
  origin: string | null;
  asks?: Asks;
  moment: "waiting" | "unreachable";
  localCaMissing?: boolean;
  onInstallLocalCa: () => void;
  onCancel: () => void;
}

/** La espera del canal y, cuando no llega, las recetas del navegador y, si falta la CA local, su aviso. */
export function SedeAwaiting({
  origin,
  asks = "signature",
  moment,
  localCaMissing = false,
  onInstallLocalCa,
  onCancel,
}: SedeAwaitingProps) {
  const { t } = useTranslation();
  const [browser, setBrowser] = useState<Browser>("chrome");
  const repairing = moment === "unreachable";
  const installing = repairing && localCaMissing;
  const closing = repairing && !localCaMissing;
  const installButton = useDefaultButton(installing);
  const closeButton = useDefaultButton(closing);

  const localCa = installing && (
    <Admonition
      tone="warning"
      className="sede-ending__detail"
      title={t("sede.repair.caMissing")}
      action={
        <Button ref={installButton} variant="primary" onClick={onInstallLocalCa}>
          {t("status.actions.install")}
        </Button>
      }
    />
  );

  return (
    <SedeBody
      flush
      steadyFooter
      primary={installing ? installButton : closing ? closeButton : undefined}
      onEscape={onCancel}
      footer={
        repairing ? (
          <>
            <p className="rf-hint sede-passing__retry">{t("sede.repair.retry")}</p>
            <Button
              ref={closeButton}
              variant={closing ? "primary" : "ghost"}
              className="sede-passing__steady"
              onClick={onCancel}
            >
              {t("actions.close")}
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="sede-passing__steady" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        )
      }
    >
      <div className="sede-ending">
        <SedeOrigin origin={origin} asks={asks} />
        <div className="sede-ending__body">
          <p className="rf-title sede-ending__title">
            {repairing ? t("sede.unreachable.title") : t("sede.waiting.title")}
          </p>
          {repairing && (
            <>
              {localCa}
              <BrowserRecipes browser={browser} onChoose={setBrowser} />
            </>
          )}
        </div>
      </div>
    </SedeBody>
  );
}

const BROWSERS: readonly Browser[] = ["chrome", "firefox"];
const BROWSER_NAMES: Record<Browser, string> = { chrome: "Chrome", firefox: "Firefox" };

/** Las pestañas de Chrome y Firefox con la receta de la elegida como panel. */
function BrowserRecipes({
  browser,
  onChoose,
}: {
  browser: Browser;
  onChoose: (browser: Browser) => void;
}) {
  const id = useId();
  const tabId = (each: Browser) => `${id}-${each}`;
  const panelId = `${id}-panel`;

  return (
    <>
      <Tabs variant="underline" className="sede-passing__tabs">
        {BROWSERS.map((each) => (
          <Tab
            key={each}
            id={tabId(each)}
            selected={each === browser}
            aria-controls={panelId}
            onClick={() => onChoose(each)}
          >
            {BROWSER_NAMES[each]}
          </Tab>
        ))}
      </Tabs>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(browser)}
        className="sede-passing__recipe"
      >
        {browser === "chrome" ? <ChromeRecipe /> : <FirefoxRecipe />}
      </div>
    </>
  );
}

interface SedeSigningProgressProps {
  origin: string | null;
  asks?: Asks;
  terminal?: boolean;
  phase: SigningPhase;
  onCancel: () => void;
}

const PROGRESS: Record<SigningPhase, number> = { signing: 45, returning: 88 };

/** Los dos tramos de la firma con su barra: «Cancelar» mientras se firma y el pie vacío mientras se envía. */
export function SedeSigningProgress({
  origin,
  asks = "signature",
  terminal = false,
  phase,
  onCancel,
}: SedeSigningProgressProps) {
  const { t } = useTranslation();
  const returning = phase === "returning";

  return (
    <SedeBody
      flush
      steadyFooter
      onEscape={returning ? undefined : onCancel}
      footer={
        returning ? null : (
          <Button variant="ghost" className="sede-passing__steady" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        )
      }
    >
      <div className="sede-ending">
        <SedeOrigin origin={origin} asks={asks} terminal={terminal} />
        <div className="sede-ending__body">
          <p className="rf-title sede-ending__title">
            {returning ? t("sede.returning.titleUnknownOrigin") : t("panel.footer.signing")}
          </p>
          <ProgressBar
            variant="framed"
            className="sede-passing__progress"
            value={PROGRESS[phase]}
            aria-label={t("panel.footer.signing")}
          />
        </div>
      </div>
    </SedeBody>
  );
}

interface SedeFileTransferProps {
  origin: string | null;
  transfer:
    | { kind: "saving"; filename: string | null; unwritable?: boolean }
    | { kind: "loading"; multiple: boolean };
}

/** El fichero que va o que viene mientras el diálogo del portal está encima: solo el título, sin acciones. */
export function SedeFileTransfer({ origin, transfer }: SedeFileTransferProps) {
  const { t } = useTranslation();
  const unwritable = transfer.kind === "saving" && transfer.unwritable === true;
  const title =
    transfer.kind === "loading"
      ? transfer.multiple
        ? t("sede.loading.titleMany")
        : t("sede.loading.title")
      : transfer.filename === null
        ? t("sede.saving.titleUnnamed")
        : t("sede.saving.title", { filename: transfer.filename });

  return (
    <SedeBody flush steadyFooter footer={null}>
      <div className="sede-ending">
        <SedeOrigin origin={origin} asks={null} />
        <div className="sede-ending__body">
          <p className="rf-title sede-ending__title sede-passing__file">{title}</p>
          {unwritable && (
            <Admonition tone="error" className="sede-ending__detail">
              {t("sede.saving.leadUnwritable")}
            </Admonition>
          )}
        </div>
      </div>
    </SedeBody>
  );
}

/** Cuál de las dos recetas se está leyendo. */
type Browser = "chrome" | "firefox";

/** Los dos pasos para permitir la red local en Chrome. */
function ChromeRecipe() {
  const { t } = useTranslation();
  return (
    <Stack as="ol" className="sede-waiting__steps">
      <li className="rf-prose">{t("sede.repair.chromeAllow")}</li>
      <li className="rf-prose">
        {t("sede.repair.chromeGone")}
        <Row as="span" gap="xs" className="sede-waiting__address">
          {/* Un `chrome://` no es navegable desde fuera: se copia, no se pulsa. */}
          <code className="rf-body">{CHROME_LOCAL_NETWORK_SETTINGS}</code>
          <Button
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(CHROME_LOCAL_NETWORK_SETTINGS)}
          >
            <Icon name="copy" size={14} />
            {t("actions.copy")}
          </Button>
        </Row>
        <span className="rf-hint">{t("sede.repair.chromePadlock")}</span>
      </li>
    </Stack>
  );
}

/** Los dos pasos para permitir la red local en Firefox. */
function FirefoxRecipe() {
  const { t } = useTranslation();
  return (
    <Stack as="ol" className="sede-waiting__steps">
      <li className="rf-prose">{t("sede.repair.firefoxAllow")}</li>
      <li className="rf-prose">{t("sede.repair.firefoxGone")}</li>
    </Stack>
  );
}
