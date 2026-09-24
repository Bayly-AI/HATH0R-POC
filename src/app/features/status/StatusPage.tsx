import { useCallback, useEffect, useMemo, useState } from "react";
import { FixtureBanner } from "../../components/FixtureBanner";
import { StateBadge } from "../../components/StateBadge";
import {
  fetchCapabilities,
  fetchHealth,
  fetchStatus,
  type ApiEnvelope,
  type ApiState,
  type CapabilitiesPayload,
  type StatusPayload,
} from "../../services/api";
import type { CapabilityEntry } from "../../../shared/contracts/capability.js";

const APP_VERSION = "0.1.0";

type LoadState = "loading" | "ready" | "error";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function readString(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function readBool(obj: unknown, key: string): boolean | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "boolean" ? v : undefined;
}

function worstState(states: ApiState[]): ApiState {
  if (states.includes("error")) return "error";
  if (states.includes("unavailable")) return "unavailable";
  if (states.includes("degraded")) return "degraded";
  return "ok";
}

export interface StatusPageProps {
  /** Injectable fetchers for tests. */
  loadStatus?: typeof fetchStatus;
  loadCapabilities?: typeof fetchCapabilities;
  loadHealth?: typeof fetchHealth;
}

export function StatusOverviewPage({
  loadStatus = fetchStatus,
  loadCapabilities = fetchCapabilities,
  loadHealth = fetchHealth,
}: StatusPageProps = {}) {
  const [phase, setPhase] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusEnv, setStatusEnv] = useState<ApiEnvelope<StatusPayload> | null>(null);
  const [capsEnv, setCapsEnv] = useState<ApiEnvelope<CapabilitiesPayload> | null>(null);
  const [healthEnv, setHealthEnv] = useState<ApiEnvelope<{
    status: string;
    service?: string;
  }> | null>(null);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setPhase("loading");
      setLoadError(null);
      try {
        const [status, caps, health] = await Promise.all([
          loadStatus(signal),
          loadCapabilities(signal),
          loadHealth(signal),
        ]);
        if (signal?.aborted) return;
        setStatusEnv(status);
        setCapsEnv(caps);
        setHealthEnv(health);
        setPhase("ready");
      } catch (err) {
        if (signal?.aborted) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    },
    [loadStatus, loadCapabilities, loadHealth],
  );

  useEffect(() => {
    const ac = new AbortController();
    void reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  const fixtureSource =
    statusEnv?.source === "fixture" ||
    capsEnv?.source === "fixture" ||
    healthEnv?.source === "fixture";

  const probes = statusEnv?.data?.probes;
  const versionProbe = probes?.version;
  const doctorProbe = probes?.doctor;
  const kbProbe = probes?.["kb.path"];

  const cliVersion =
    versionProbe?.meta.cliVersion ?? readString(versionProbe?.data, "version") ?? undefined;

  const doctorData = doctorProbe?.data;
  const towerId =
    isRecord(doctorData) && isRecord(doctorData.control_tower)
      ? readString(doctorData.control_tower, "product_id")
      : undefined;
  const groupId = readString(doctorData, "group_id");

  const kbConfigured = readBool(kbProbe?.data, "configured");
  const kbAvailable = readBool(kbProbe?.data, "available");

  const overall = useMemo(() => {
    if (phase === "loading") return "loading" as const;
    if (phase === "error") return "error" as const;
    const states: ApiState[] = [];
    if (statusEnv?.state) states.push(statusEnv.state);
    if (statusEnv?.data?.overall) states.push(statusEnv.data.overall);
    if (versionProbe?.state) states.push(versionProbe.state);
    if (doctorProbe?.state) states.push(doctorProbe.state);
    if (kbProbe?.state) states.push(kbProbe.state);
    return states.length ? worstState(states) : (statusEnv?.state ?? "error");
  }, [phase, statusEnv, versionProbe, doctorProbe, kbProbe]);

  /** Envelope-level only; per-probe diagnostics render under each section. */
  const diagnostics = statusEnv?.diagnostics ?? [];

  const capabilities: CapabilityEntry[] = capsEnv?.data?.capabilities ?? [];

  return (
    <div className="status-page">
      {fixtureSource ? <FixtureBanner /> : null}

      <header className="status-page__header" aria-labelledby="status-heading">
        <h1 id="status-heading">Status</h1>
        <p className="status-page__lede">
          Live overview of the HATHOR Integration Console adapter and OpenSource CLI probes.
        </p>
        <div className="status-page__overall" aria-live="polite">
          <span className="muted">Overall</span>{" "}
          {phase === "loading" ? (
            <StateBadge state="loading" />
          ) : (
            <StateBadge state={overall === "loading" ? "error" : overall} />
          )}
        </div>
        <div className="status-page__actions">
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
        <section className="panel" aria-busy="true" aria-label="Loading status">
          <p data-testid="status-loading">Loading status probes…</p>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className="panel panel--error" aria-labelledby="status-error-heading">
          <h2 id="status-error-heading">Unable to load status</h2>
          <p>{loadError ?? "Unknown error"}</p>
          <p className="remediation">
            Confirm the adapter is running on loopback and try Retry. Endpoint:{" "}
            <code>GET /api/hathor/status</code>
          </p>
        </section>
      ) : null}

      {phase === "ready" && statusEnv ? (
        <>
          <section className="panel" aria-labelledby="app-section-heading">
            <h2 id="app-section-heading">Application</h2>
            <dl className="kv">
              <div>
                <dt>Console version</dt>
                <dd>
                  <code>{APP_VERSION}</code>
                </dd>
              </div>
              <div>
                <dt>Adapter service</dt>
                <dd>
                  <code>{healthEnv?.data?.service ?? "hathor-poc-adapter"}</code>
                </dd>
              </div>
              <div>
                <dt>Response source</dt>
                <dd>
                  <code>{statusEnv.source}</code>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="cli-section-heading">
            <div className="panel__title-row">
              <h2 id="cli-section-heading">CLI</h2>
              <StateBadge state={versionProbe?.state ?? "unavailable"} />
            </div>
            <dl className="kv">
              <div>
                <dt>Installed</dt>
                <dd>
                  {versionProbe?.state === "ok"
                    ? "Yes"
                    : versionProbe?.state === "unavailable"
                      ? "No"
                      : "Unknown"}
                </dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>
                  <code>{cliVersion ?? "unavailable"}</code>
                </dd>
              </div>
            </dl>
            {versionProbe?.state !== "ok" ? (
              <RemediationList items={versionProbe?.diagnostics ?? []} />
            ) : null}
          </section>

          <section className="panel" aria-labelledby="doctor-section-heading">
            <div className="panel__title-row">
              <h2 id="doctor-section-heading">Doctor</h2>
              <StateBadge state={doctorProbe?.state ?? "unavailable"} />
            </div>
            <dl className="kv">
              <div>
                <dt>Suite health</dt>
                <dd>
                  <StateBadge state={doctorProbe?.state ?? "unavailable"} />
                </dd>
              </div>
              <div>
                <dt>Control tower</dt>
                <dd>
                  <code>{towerId ?? "unknown"}</code>
                </dd>
              </div>
              <div>
                <dt>Group</dt>
                <dd>
                  <code>{groupId ?? "unknown"}</code>
                </dd>
              </div>
            </dl>
            {doctorProbe && doctorProbe.state !== "ok" ? (
              <RemediationList items={doctorProbe.diagnostics} />
            ) : null}
          </section>

          <section className="panel" aria-labelledby="kb-section-heading">
            <div className="panel__title-row">
              <h2 id="kb-section-heading">Knowledgebase</h2>
              <StateBadge state={kbProbe?.state ?? "unavailable"} />
            </div>
            <dl className="kv">
              <div>
                <dt>Configured</dt>
                <dd>{kbConfigured === undefined ? "unknown" : kbConfigured ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{kbAvailable === undefined ? "unknown" : kbAvailable ? "Yes" : "No"}</dd>
              </div>
            </dl>
            {kbProbe && kbProbe.state !== "ok" ? (
              <RemediationList items={kbProbe.diagnostics} />
            ) : null}
          </section>

          <section className="panel" aria-labelledby="caps-section-heading">
            <h2 id="caps-section-heading">Capabilities</h2>
            {capabilities.length === 0 ? (
              <p className="muted">No capability document returned.</p>
            ) : (
              <ul className="cap-list">
                {capabilities.map((c) => (
                  <li key={c.id} className="cap-list__item">
                    <div className="cap-list__head">
                      <code>{c.id}</code>
                      <StateBadge state={c.state} />
                    </div>
                    <p className="cap-list__summary">{c.summary}</p>
                    {c.state === "planned" ? (
                      <p className="cap-list__docs">
                        See Framework docs in <code>hath0r/docs</code> for the planned contract.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {diagnostics.length > 0 ? (
            <section className="panel" aria-labelledby="diag-section-heading">
              <h2 id="diag-section-heading">Diagnostics</h2>
              <RemediationList items={diagnostics} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RemediationList({
  items,
}: {
  items: Array<{ code: string; message: string; remediation?: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="remediation-list">
      {items.map((d, i) => (
        <li key={`${d.code}-${i}`}>
          <strong>
            <code>{d.code}</code>
          </strong>
          : {d.message}
          {d.remediation ? <p className="remediation">{d.remediation}</p> : null}
        </li>
      ))}
    </ul>
  );
}
