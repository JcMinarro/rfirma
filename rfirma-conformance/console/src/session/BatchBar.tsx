import { useEffect } from "react";
import { useLive } from "../suite/live";
import { Elapsed } from "../ui/Elapsed";
import { ActivityIcon, SkipIcon, StopIcon } from "../ui/icons";
import { notify } from "../ui/notify";
import { useShortcuts } from "../ui/shortcuts";
import type { Batch } from "./progress";

/** La tanda en curso, única dueña de saltar y detener. */
export function BatchBar({ batch, instructions }: { batch: Batch; instructions: string | null }) {
  const { suite, complain } = useLive();
  const skip = () => void suite.skip().catch(complain("No se pudo saltar"));
  const stop = () => void suite.stop().catch(complain("No se pudo detener"));

  useEffect(() => {
    if (instructions) notify(instructions);
  }, [instructions]);

  useShortcuts({
    x: skip,
    X: stop,
  });

  return (
    <section className="batch-bar" aria-label="En curso">
      <div className="batch-line">
        <ActivityIcon activity="running" />
        <div className="batch-what">
          <span className="batch-set">{batch.set ?? "…"}</span>
          <span className="batch-sep" aria-hidden="true">
            /
          </span>
          <code className="batch-check">{batch.current}</code>
        </div>
        <div className="batch-progress">
          <progress
            className="meter"
            value={batch.done}
            max={Math.max(1, batch.total)}
            aria-label={`${batch.done} de ${batch.total} terminadas`}
          />
          <span className="batch-count">
            {batch.done}/{batch.total}
          </span>
        </div>
        <span className="batch-time" title="Tiempo desde que empezó">
          <Elapsed since={batch.startedAt} />
        </span>
        <div className="batch-actions">
          <button type="button" className="button small" onClick={skip} aria-keyshortcuts="x">
            <SkipIcon /> Saltar esta <kbd>x</kbd>
          </button>
          <button
            type="button"
            className="button small danger"
            onClick={stop}
            aria-keyshortcuts="Shift+X"
          >
            <StopIcon /> Detener <kbd>⇧X</kbd>
          </button>
        </div>
      </div>
      {instructions && (
        <div className="call">
          <div className="call-text">
            <span className="call-kind">Lo que te toca</span>
            <p className="call-prompt">{instructions}</p>
          </div>
        </div>
      )}
    </section>
  );
}
