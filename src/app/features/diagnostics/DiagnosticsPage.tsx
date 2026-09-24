import { useCallback, useEffect, useMemo, useState } from "react";
import { FixtureBanner } from "../../components/FixtureBanner";
import { StateBadge } from "../../components/StateBadge";
import {
  fetchStatus,
  type ApiEnvelope,
  type StatusPayload,
  type StatusProbeView,
} from "../../services/api";

type Phase = "loading" | "ready" | "error";

export interface DiagnosticsPageProps {
  loadStatus?: typeof fetchStatus;
}

interface DiagnosticRow {
  id: string;
  operation: string;
  code: string;
  message: string;
  remediation?: string;
  probeState: string;
  generatedAt: string;
  source: string;
  durationMs?: number;
}

function collectRows(env: ApiEnvelope<StatusPayload>): DiagnosticRow[] {
  const rows: DiagnosticRow[] = [];
  const probes = env.data?.probes;
  const pushProbe = (key: string, probe: StatusProbeView | undefined) => {
    if (!probe) return;
    if (probe.diagnostics.length === 0 && probe.state !== "ok") {
      rows.push({
        id: `${key}-state`,
        operation: key,
        code: `PROBE_${probe.state.toUpperCase()}`,
        message: `Probe reported state ${probe.state}.`,
        probeState: probe.state,
        generatedAt: env.generatedAt,
        source: env.source,
        durationMs: probe.meta.durationMs,
      });
      return;
    }
    for (const [i, d] of probe.diagnostics.entries()) {
      rows.push({
        id: `${key}-${d.code}-${i}`,
        operation: key,
        code: d.code,
        message: d.message,
        remediation: d.remediation,
        probeState: probe.state,
        generatedAt: env.generatedAt,
        source: env.source,
        durationMs: probe.meta.durationMs,
      });
    }
  };

  pushProbe("version", probes?.version);
  pushProbe("doctor", probes?.doctor);
  pushProbe("kb.path", probes?.["kb.path"]);

  for (const [i, d] of env.diagnostics.entries()) {
    rows.push({
      id: `envelope-${d.code}-${i}`,
      operation: "envelope",
      code: d.code,
      message: d.message,
      remediation: d.remediation,
      probeState: env.state,
      generatedAt: env.generatedAt,
      source: env.source,
    });
  }

  return rows;
}

export function DiagnosticsFeaturePage({ loadStatus = fetchStatus }: DiagnosticsPageProps = {}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<ApiEnvelope<StatusPayload> | null>(null);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setPhase("loading");
      setError(null);
      try {
        const env = await loadStatus(signal);
        if (signal?.aborted) return;
        setEnvelope(env);
        setPhase("ready");
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    },
    [loadStatus],
  );

  useEffect(() => {
    const ac = new AbortController();
    void reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  const rows = useMemo(() => (envelope ? collectRows(envelope) : []), [envelope]);

  return (
    <div className="page diagnostics-page">
      {envelope?.source === "fixture" ? <FixtureBanner /> : null}

      <header className="page-header" aria-labelledby="diagnostics-heading">
        <h1 id="diagnostics-heading">Diagnostics</h1>
        <p className="muted">
          Sanitized CLI diagnostics from status probes. Absolute paths and secrets are redacted by
          the adapter before display.
        </p>
        <div className="page-header__row">
          {envelope ? (
            <StateBadge state={envelope.state} />
          ) : phase === "loading" ? (
            <StateBadge state="loading" />
          ) : null}
          <button
            type="button"
            className="btn"
            onClick={() => void reload()}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "Refreshing…" : "Retry"}
          </button>
        </div>
      </header>

      {phase === "loading" ? (
        <section className="panel" aria-busy="true" aria-label="Loading diagnostics">
          <p data-testid="diagnostics-loading">Loading diagnostics…</p>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className="panel panel--error" aria-labelledby="diagnostics-error-heading">
          <h2 id="diagnostics-error-heading">Unable to load diagnostics</h2>
          <p>{error ?? "Unknown error"}</p>
          <p className="remediation">Confirm the adapter is running, then use Retry.</p>
        </section>
      ) : null}

      {phase === "ready" && envelope ? (
        <section className="panel" aria-labelledby="diag-list-heading">
          <h2 id="diag-list-heading">Entries</h2>
          <dl className="kv">
            <div>
              <dt>Source</dt>
              <dd>
                <code>{envelope.source}</code>
              </dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>
                <time dateTime={envelope.generatedAt}>{envelope.generatedAt}</time>
              </dd>
            </div>
            <div>
              <dt>Overall</dt>
              <dd>
                <StateBadge state={envelope.state} />
              </dd>
            </div>
          </dl>

          {rows.length === 0 ? (
            <p data-testid="diagnostics-empty" className="muted">
              No diagnostics — all probes reported OK.
            </p>
          ) : (
            <ul className="diag-list" aria-label="Diagnostic entries">
              {rows.map((row) => (
                <li key={row.id} className="diag-list__item">
                  <div className="diag-list__head">
                    <code>{row.operation}</code>
                    <StateBadge
                      state={row.probeState as "ok" | "degraded" | "unavailable" | "error"}
                    />
                  </div>
                  <p>
                    <strong>
                      <code>{row.code}</code>
                    </strong>
                    : {row.message}
                  </p>
                  {row.remediation ? <p className="remediation">{row.remediation}</p> : null}
                  <p className="diag-meta muted">
                    source=<code>{row.source}</code> ·{" "}
                    <time dateTime={row.generatedAt}>{row.generatedAt}</time>
                    {row.durationMs !== undefined ? ` · ${row.durationMs} ms` : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
