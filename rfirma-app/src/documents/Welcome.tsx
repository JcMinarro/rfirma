//! La bienvenida del arranque sin documento: las acciones de «Empezar» con la zona de soltar, los recientes y la casilla que decide si se vuelve a mostrar.

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Checkbox } from "../design-system/Checkbox";
import { Icon } from "../design-system/icons";
import { DropZone } from "./DropZone";
import { RecentsSection } from "./RecentRows";
import type { RecentDocument } from "./recents";
import "./Welcome.css";

interface WelcomeProps {
  recents: readonly RecentDocument[];
  /** Sin actividad recordada la columna de recientes queda vacía, sin prometer nada. */
  rememberActivity: boolean;
  showWelcome: boolean;
  onShowWelcomeChange: (show: boolean) => void;
  onOpen: () => void;
  onOpenStatus: () => void;
  onSelectRecent: (row: RecentDocument) => void;
  onClearRecents: () => void;
}

export function Welcome({
  recents,
  rememberActivity,
  showWelcome,
  onShowWelcomeChange,
  onOpen,
  onOpenStatus,
  onSelectRecent,
  onClearRecents,
}: WelcomeProps) {
  const { t } = useTranslation();
  const startId = useId();
  return (
    <div className="welcome">
      <div className="welcome__body">
        <header className="welcome__header">
          <h1 className="rf-title welcome__heading">{t("app.name")}</h1>
          <p className="rf-body rf-text-muted welcome__text">{t("welcome.subtitle")}</p>
        </header>

        <div className="welcome__columns">
          <section className="welcome__start" aria-labelledby={startId}>
            <div className="welcome__actions">
              <h2 id={startId} className="rf-title welcome__heading">
                {t("welcome.start")}
              </h2>
              <div className="welcome__buttons">
                <Button variant="ghost" onClick={onOpen}>
                  <Icon name="folder" />
                  {t("tabs.openPdf")}
                </Button>
                <Button variant="ghost" onClick={onOpenStatus}>
                  <Icon name="info" />
                  {t("status.title")}
                </Button>
              </div>
            </div>
            <DropZone onOpen={onOpen} />
          </section>

          <div className="welcome__recents">
            {rememberActivity && (
              <RecentsSection
                recents={recents}
                onSelect={onSelectRecent}
                onClear={onClearRecents}
                keepWhenEmpty
              />
            )}
          </div>
        </div>

        <footer className="welcome__footer">
          <Checkbox
            label={t("welcome.showOnStartup")}
            textRole="body"
            className="rf-text-muted"
            checked={showWelcome}
            onChange={onShowWelcomeChange}
          />
        </footer>
      </div>
    </div>
  );
}
