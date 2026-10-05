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

function installedLabel(state?: ApiState): string {
  if (state === "ok") return "Yes";
  if (state === "unavailable") return "No";
  return "Unknown";
}

function booleanLabel(v?: boolean): string {
  if (v === undefined) return "unknown";
  return v ? "Yes" : "No";
}

export interface StatusPageProps {
  /** Injectable fetchers for tests. */
  loadStatus?: typeof fetchStatus;
  loadCapabilities?: typeof fetchCapabilities;
  loadHealth?: typeof fetchHealth;
}

interface CliPanelProps {
  readonly versionProbe?: StatusPayload["probes"]["version"];
  readonly cliVersion?: string;
}

function CliPanel({ versionProbe, cliVersion }: CliPanelProps) {
  return (
    <section className="panel" aria-labelledby="cli-section-heading">
      <div className="panel__title-row">
        <h2 id="cli-section-heading">CLI</h2>
        <StateBadge state={versionProbe?.state ?? "unavailable"} />
      </div>
      <dl className="kv">
        <div>
          <dt>Installed</dt>
          <dd>{installedLabel(versionProbe?.state)}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>
            <code>{cliVersion ?? "unavailable"}</code>
          </dd>
        </div>
      </dl>
      {versionProbe?.state !== "ok" && <RemediationList items={versionProbe?.diagnostics ?? []} />}
    </section>
  );
}

interface DoctorPanelProps {
  readonly doctorProbe?: StatusPayload["probes"]["doctor"];
  readonly towerId?: string;
  readonly groupId?: string;
}

function DoctorPanel({ doctorProbe, towerId, groupId }: DoctorPanelProps) {
  return (
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
      {doctorProbe && doctorProbe.state !== "ok" && (
        <RemediationList items={doctorProbe.diagnostics} />
      )}
    </section>
  );
}

interface KbPanelProps {
  readonly kbProbe?: StatusPayload["probes"]["kb.path"];
  readonly kbConfigured?: boolean;
  readonly kbAvailable?: boolean;
}

function KbPanel({ kbProbe, kbConfigured, kbAvailable }: KbPanelProps) {
  return (
    <section className="panel" aria-labelledby="kb-section-heading">
      <div className="panel__title-row">
        <h2 id="kb-section-heading">Knowledgebase</h2>
        <StateBadge state={kbProbe?.state ?? "unavailable"} />
      </div>
      <dl className="kv">
        <div>
          <dt>Configured</dt>
          <dd>{booleanLabel(kbConfigured)}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd>{booleanLabel(kbAvailable)}</dd>
        </div>
      </dl>
      {kbProbe && kbProbe.state !== "ok" && <RemediationList items={kbProbe.diagnostics} />}
    </section>
  );
}

interface RemediationListProps {
  readonly items: Array<{ code: string; message: string; remediation?: string }>;
}

function RemediationList({ items }: RemediationListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="remediation-list">
      {items.map((d, i) => (
        <li key={`${d.code}-${i}`}>
          <strong>
            <code>{d.code}</code>
          </strong>
          : {d.message}
          {d.remediation && <p className="remediation">{d.remediation}</p>}
        </li>
      ))}
    </ul>
  );
}

function extractTowerId(doctorData: unknown): string | undefined {
  const direct = readString(doctorData, "control_tower_product_id");
  if (direct) return direct;
  if (isRecord(doctorData) && isRecord(doctorData.control_tower)) {
    return readString(doctorData.control_tower, "product_id");
  }
  return undefined;
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

  const doctorData = doctorProbe?.data;
  const towerId = extractTowerId(doctorData);
  const groupId = readString(doctorData, "group_id");

  const kbData = kbProbe?.data;
  const kbConfigured = readBool(kbData, "configured");
  const kbAvailable = readBool(kbData, "available");

  const cliVersion = readString(versionProbe?.data, "version");

  const overallState: ApiState | "loading" = useMemo(() => {
    if (phase === "loading") return "loading";
    if (!statusEnv || !capsEnv || !healthEnv) return "unavailable";
    const healthState: ApiState = healthEnv.data?.status === "ok" ? "ok" : "degraded";
    return worstState([
      statusEnv.state,
      capsEnv.state,
      healthState,
      versionProbe?.state ?? "unavailable",
      doctorProbe?.state ?? "unavailable",
      kbProbe?.state ?? "unavailable",
    ]);
  }, [statusEnv, capsEnv, healthEnv, versionProbe, doctorProbe, kbProbe]);

  const capabilities = useMemo<CapabilityEntry[]>(() => {
    return capsEnv?.data?.capabilities ?? [];
  }, [capsEnv]);

  const diagnostics = useMemo(() => {
    const out: Array<{ code: string; message: string; remediation?: string }> = [];
    if (statusEnv) out.push(...statusEnv.diagnostics);
    if (capsEnv) out.push(...capsEnv.diagnostics);
    return out;
  }, [statusEnv, capsEnv]);

  return (
    <div className="page status-page">
      {fixtureSource && <FixtureBanner />}

      <header className="page-header" aria-labelledby="status-overview-heading">
        <h1 id="status-overview-heading">Status</h1>
        <p className="muted">
          Read-only system state via <code>hath0r</code> CLI probes.
        </p>
        <div className="page-header__row">
          <StateBadge state={overallState} />
          <button
            type="button"
            className="btn"
            onClick={() => void reload()}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "Loading…" : "Retry"}
          </button>
        </div>
      </header>

      {phase === "loading" && (
        <section className="panel" aria-busy="true" aria-label="Loading status">
          <p data-testid="status-loading">Probing HATH0R components…</p>
        </section>
      )}

      {phase === "error" && (
        <section className="panel panel--error" aria-labelledby="status-error-heading">
          <h2 id="status-error-heading">Unable to load status</h2>
          <p>{loadError ?? "Unknown error"}</p>
          <p className="remediation">
            Ensure the local Express adapter is running on <code>http://localhost:3001</code>.
          </p>
        </section>
      )}

      {phase === "ready" && (
        <>
          <section className="panel" aria-labelledby="overview-heading">
            <h2 id="overview-heading">Overall</h2>
            <dl className="kv">
              <div>
                <dt>Overall state</dt>
                <dd>
                  <StateBadge state={overallState} />
                </dd>
              </div>
              <div>
                <dt>UI version</dt>
                <dd>
                  <code>{APP_VERSION}</code>
                </dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd>
                  <time dateTime={statusEnv?.generatedAt}>{statusEnv?.generatedAt ?? "—"}</time>
                </dd>
              </div>
            </dl>
          </section>

          <CliPanel versionProbe={versionProbe} cliVersion={cliVersion} />
          <DoctorPanel doctorProbe={doctorProbe} towerId={towerId} groupId={groupId} />
          <KbPanel kbProbe={kbProbe} kbConfigured={kbConfigured} kbAvailable={kbAvailable} />

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
                    {c.state === "planned" && (
                      <p className="cap-list__docs">
                        See Framework docs in <code>hath0r/docs</code> for the planned contract.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {diagnostics.length > 0 && (
            <section className="panel" aria-labelledby="diag-section-heading">
              <h2 id="diag-section-heading">Diagnostics</h2>
              <RemediationList items={diagnostics} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
