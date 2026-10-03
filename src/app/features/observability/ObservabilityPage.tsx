import { useEffect, useState } from "react";
import { featureFlags } from "../../services/flags.js";
import {
  telemetryCollector,
  type GoldenSignalsSummary,
  type SliTargetStatus,
} from "../../services/telemetry.js";

export function ObservabilityPage() {
  const [signals, setSignals] = useState<GoldenSignalsSummary>(() =>
    telemetryCollector.getGoldenSignals(),
  );
  const [consoleDebug, setConsoleDebug] = useState<boolean>(() =>
    featureFlags.getBoolean("poc.telemetry.console_debug", false),
  );

  useEffect(() => {
    const start = performance.now();
    telemetryCollector.recordRender("ObservabilityPage", performance.now() - start);

    const interval = setInterval(() => {
      setSignals(telemetryCollector.getGoldenSignals());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleConsoleDebug = () => {
    const nextVal = !consoleDebug;
    featureFlags.setOverride("poc.telemetry.console_debug", nextVal);
    setConsoleDebug(nextVal);
  };

  const handleClearMetrics = () => {
    telemetryCollector.clear();
    setSignals(telemetryCollector.getGoldenSignals());
  };

  return (
    <div className="page observability-page">
      <header className="page-header" aria-labelledby="observability-heading">
        <h1 id="observability-heading">Observability &amp; Golden Signals</h1>
        <p className="muted">
          Runtime Golden Signals (latency, traffic, errors, saturation) and OpenObservation SLI
          evaluations per <code>cfg/observability/openobservation.json</code>.
        </p>
      </header>

      {/* Controls & OpenFeature toggles */}
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              data-testid="flag-console-debug"
              checked={consoleDebug}
              onChange={handleToggleConsoleDebug}
            />
            <span>
              <strong>OpenFeature:</strong> <code>poc.telemetry.console_debug</code> (Browser
              console logging)
            </span>
          </label>
        </div>
        <div>
          <button type="button" className="button" onClick={handleClearMetrics}>
            Clear Buffer
          </button>
        </div>
      </div>

      {/* 4 Golden Signals Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          margin: "1rem 0",
        }}
      >
        {/* Latency */}
        <div className="panel">
          <h3>⚡ Latency</h3>
          <p className="muted">p50 and p95 request &amp; render times</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <strong>API p50 / p95:</strong> {signals.latency.apiP50Ms}ms /{" "}
              {signals.latency.apiP95Ms}ms
            </li>
            <li>
              <strong>Render p50 / p95:</strong> {signals.latency.renderP50Ms}ms /{" "}
              {signals.latency.renderP95Ms}ms
            </li>
          </ul>
        </div>

        {/* Traffic */}
        <div className="panel">
          <h3>📈 Traffic</h3>
          <p className="muted">Request volume &amp; frequency</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <strong>API Calls:</strong> {signals.traffic.totalApiCalls}
            </li>
            <li>
              <strong>Render Events:</strong> {signals.traffic.totalRenderEvents}
            </li>
            <li>
              <strong>Calls / min:</strong> {signals.traffic.apiCallsPerMinute}
            </li>
          </ul>
        </div>

        {/* Errors */}
        <div className="panel">
          <h3>🛑 Errors</h3>
          <p className="muted">Failures &amp; unhandled exceptions</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <strong>API Errors:</strong> {signals.errors.totalApiErrors}
            </li>
            <li>
              <strong>Client Errors:</strong> {signals.errors.totalClientErrors}
            </li>
            <li>
              <strong>Error Rate:</strong> {(signals.errors.apiErrorRate * 100).toFixed(1)}%
            </li>
          </ul>
        </div>

        {/* Saturation */}
        <div className="panel">
          <h3>📦 Saturation</h3>
          <p className="muted">In-memory telemetry buffer utilization</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <strong>Buffer Used:</strong> {signals.saturation.bufferUsed} /{" "}
              {signals.saturation.bufferCapacity}
            </li>
            <li>
              <strong>Capacity Utilized:</strong> {signals.saturation.saturationPct}%
            </li>
          </ul>
        </div>
      </div>

      {/* SLI Compliance Table */}
      <section className="panel" aria-labelledby="sli-heading">
        <h2 id="sli-heading">Service Level Indicators (SLIs)</h2>
        <table className="table" style={{ width: "100%", textAlign: "left", marginTop: "0.5rem" }}>
          <thead>
            <tr>
              <th>SLI Identifier</th>
              <th>Target</th>
              <th>Actual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {signals.slis.map((sli: SliTargetStatus) => (
              <tr key={sli.id} data-testid={`sli-row-${sli.id}`}>
                <td>
                  <code>{sli.id}</code>
                  <div className="muted" style={{ fontSize: "0.85em" }}>
                    {sli.description}
                  </div>
                </td>
                <td>
                  {sli.isMax ? "≤ " : "≥ "}
                  {sli.unit === "ratio"
                    ? `${(sli.target * 100).toFixed(1)}%`
                    : `${sli.target} ${sli.unit}`}
                </td>
                <td>
                  {sli.unit === "ratio"
                    ? `${(sli.actual * 100).toFixed(1)}%`
                    : `${sli.actual} ${sli.unit}`}
                </td>
                <td>
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "4px",
                      fontWeight: 600,
                      backgroundColor: sli.passed
                        ? "rgba(46, 160, 67, 0.15)"
                        : "rgba(248, 81, 73, 0.15)",
                      color: sli.passed ? "#2ea043" : "#f85149",
                    }}
                  >
                    {sli.passed ? "PASS" : "DEGRADED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent Telemetry Activity */}
      <section className="panel" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Recent Telemetry Events</h2>
        <div style={{ maxHeight: "250px", overflowY: "auto", fontSize: "0.9em" }}>
          {telemetryCollector.getApiMetrics().length === 0 &&
          telemetryCollector.getClientErrors().length === 0 ? (
            <p className="muted">No telemetry events recorded yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {telemetryCollector
                .getApiMetrics()
                .slice(-10)
                .reverse()
                .map((m) => (
                  <li
                    key={m.id}
                    style={{
                      padding: "0.3rem 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      <strong>[{m.method}]</strong> <code>{m.path}</code> ({m.status})
                    </span>
                    <span className="muted">{m.durationMs}ms</span>
                  </li>
                ))}
              {telemetryCollector
                .getClientErrors()
                .slice(-5)
                .reverse()
                .map((e) => (
                  <li
                    key={e.id}
                    style={{
                      padding: "0.3rem 0",
                      color: "#f85149",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <strong>[ERROR: {e.source}]</strong> {e.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
