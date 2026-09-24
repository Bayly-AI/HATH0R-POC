import type { ApiState } from "../../shared/contracts/api-envelope.js";
import type { CapabilityState } from "../../shared/contracts/capability.js";

type BadgeState = ApiState | CapabilityState | "loading";

const LABELS: Record<BadgeState, string> = {
  loading: "Loading",
  ok: "OK",
  degraded: "Degraded",
  unavailable: "Unavailable",
  error: "Error",
  implemented: "Implemented",
  planned: "Planned",
  "out-of-scope": "Out of scope",
};

/** Text glyphs — never rely on color alone (POC-NFR-010). */
const GLYPHS: Record<BadgeState, string> = {
  loading: "…",
  ok: "✓",
  degraded: "!",
  unavailable: "○",
  error: "×",
  implemented: "✓",
  planned: "…",
  "out-of-scope": "—",
};

export function StateBadge({
  state,
  label,
}: {
  state: BadgeState;
  /** Optional override for the visible text label. */
  label?: string;
}) {
  const text = label ?? LABELS[state] ?? state;
  const glyph = GLYPHS[state] ?? "·";
  return (
    <span
      className={`state-badge state-badge--${state}`}
      data-state={state}
      role="status"
      aria-label={`State: ${text}`}
    >
      <span className="state-badge__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="state-badge__label">{text}</span>
    </span>
  );
}
