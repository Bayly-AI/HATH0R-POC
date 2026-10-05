import { useCallback, useEffect, useState } from "react";
import { FixtureBanner } from "../../components/FixtureBanner";
import { fetchHealth, fetchStatus, type ApiEnvelope, type StatusPayload } from "../../services/api";

const APP_VERSION = "0.1.0";

export interface AboutPageProps {
  loadHealth?: typeof fetchHealth;
  loadStatus?: typeof fetchStatus;
}

export function AboutFeaturePage({
  loadHealth = fetchHealth,
  loadStatus = fetchStatus,
}: AboutPageProps = {}) {
  const [health, setHealth] = useState<ApiEnvelope<{ status: string; service?: string }> | null>(
    null,
  );
  const [status, setStatus] = useState<ApiEnvelope<StatusPayload> | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [h, s] = await Promise.all([loadHealth(signal), loadStatus(signal)]);
        if (signal?.aborted) return;
        setHealth(h);
        setStatus(s);
      } catch {
        // About remains useful offline; identity content is static.
      }
    },
    [loadHealth, loadStatus],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const fixture = health?.source === "fixture" || status?.source === "fixture";
  let cliVersion = "unavailable";
  const versionProbe = status?.data?.probes.version;
  if (versionProbe?.meta.cliVersion) {
    cliVersion = versionProbe.meta.cliVersion;
  } else if (
    versionProbe?.data &&
    typeof versionProbe.data === "object" &&
    "version" in versionProbe.data &&
    typeof (versionProbe.data as { version?: unknown }).version === "string"
  ) {
    cliVersion = (versionProbe.data as { version: string }).version;
  }

  return (
    <div className="page about-page">
      {fixture ? <FixtureBanner /> : null}

      <header className="page-header" aria-labelledby="about-heading">
        <h1 id="about-heading">About</h1>
        <p className="muted">Product identity and source-of-truth boundaries for this POC.</p>
      </header>

      <section className="panel" aria-labelledby="identity-heading">
        <h2 id="identity-heading">Product identity</h2>
        <p>
          <strong>HATHOR Integration Console POC</strong> — a read-only React/TypeScript client over
          the OpenSource <code>hath0r</code> CLI. It is not a shell, policy engine, deployment
          controller, or second control plane.
        </p>
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
              <code>{health?.data?.service ?? "hathor-poc-adapter"}</code>
            </dd>
          </div>
          <div>
            <dt>CLI version</dt>
            <dd>
              <code data-testid="about-cli-version">{cliVersion || "unavailable"}</code>
            </dd>
          </div>
          <div>
            <dt>Package manager</dt>
            <dd>npm (lockfile committed)</dd>
          </div>
          <div>
            <dt>HTTP library</dt>
            <dd>Express (loopback adapter)</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="sot-heading">
        <h2 id="sot-heading">Source of truth</h2>
        <ul className="about-list">
          <li>
            <strong>Control tower / operator CLI:</strong> <code>HATH0R-CLI</code> (
            <code>Bayly-AI/HATH0R-CLI</code>)
          </li>
          <li>
            <strong>Framework contracts &amp; docs corpus:</strong> <code>hath0r/docs</code> and{" "}
            <code>hath0r/lib/schemas</code> (<code>Bayly-AI/HATH0R-Agentic-Framework</code>)
          </li>
          <li>
            <strong>This POC:</strong> consumer evidence only — fixed operation map, no free-form
            argv, no direct KB file reads from the browser
          </li>
          <li>
            <strong>Group knowledge hub:</strong> OpenSource <code>.hath0r/knowledgebase</code>{" "}
            (member stubs are pointers)
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="boundaries-heading">
        <h2 id="boundaries-heading">Boundaries</h2>
        <ul className="about-list">
          <li>Browser talks only to the local adapter over fixed routes.</li>
          <li>
            Adapter spawns <code>hath0r</code> with server-owned argv, timeouts, and redaction.
          </li>
          <li>Mutating / credential / deploy operations are out of scope for this console.</li>
          <li>
            Fixture responses must remain labeled <code>source: fixture</code> and never rewritten
            as live.
          </li>
        </ul>
      </section>
    </div>
  );
}
