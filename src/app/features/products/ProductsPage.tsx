import { useCallback, useEffect, useState } from "react";
import { FixtureBanner } from "../../components/FixtureBanner";
import { StateBadge } from "../../components/StateBadge";
import { fetchProducts, type ApiEnvelope, type ProductsPayload } from "../../services/api";

type Phase = "loading" | "ready" | "error";

export interface ProductsPageProps {
  loadProducts?: typeof fetchProducts;
}

export function ProductsFeaturePage({ loadProducts = fetchProducts }: ProductsPageProps = {}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<ApiEnvelope<ProductsPayload | null> | null>(null);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setPhase("loading");
      setError(null);
      try {
        const env = await loadProducts(signal);
        if (signal?.aborted) return;
        setEnvelope(env);
        setPhase("ready");
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    },
    [loadProducts],
  );

  useEffect(() => {
    const ac = new AbortController();
    void reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  const data = envelope?.data ?? null;
  const structured = data?.mediaType === "application/json" ? data : null;
  const textPayload = data?.mediaType === "text/plain" ? data : null;
  const emptyStructured = structured && structured.products.length === 0;

  return (
    <div className="page products-page">
      {envelope?.source === "fixture" ? <FixtureBanner /> : null}

      <header className="page-header" aria-labelledby="products-heading">
        <h1 id="products-heading">Products</h1>
        <p className="muted">
          Suite product catalog from <code>GET /api/hathor/products</code> (CLI-mediated only).
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
        <section className="panel" aria-busy="true" aria-label="Loading products">
          <p data-testid="products-loading">Loading product catalog…</p>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className="panel panel--error" aria-labelledby="products-error-heading">
          <h2 id="products-error-heading">Unable to load products</h2>
          <p>{error ?? "Unknown error"}</p>
          <p className="remediation">Confirm the adapter is running, then use Retry.</p>
        </section>
      ) : null}

      {phase === "ready" && envelope ? (
        <section className="panel" aria-labelledby="catalog-heading">
          <h2 id="catalog-heading">Catalog</h2>
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
            {structured?.group_id ? (
              <div>
                <dt>Group</dt>
                <dd>
                  <code>{structured.group_id}</code>
                </dd>
              </div>
            ) : null}
            {structured?.control_tower_product_id ? (
              <div>
                <dt>Control tower</dt>
                <dd>
                  <code>{structured.control_tower_product_id}</code>
                </dd>
              </div>
            ) : null}
            {structured ? (
              <div>
                <dt>Media type</dt>
                <dd>
                  <code>{structured.mediaType}</code>
                </dd>
              </div>
            ) : null}
            {textPayload ? (
              <div>
                <dt>Media type</dt>
                <dd>
                  <code>{textPayload.mediaType}</code>
                </dd>
              </div>
            ) : null}
          </dl>

          {envelope.state !== "ok" ? (
            <div className="panel-note">
              <StateBadge state={envelope.state} />
              {envelope.diagnostics.length > 0 ? (
                <ul className="remediation-list">
                  {envelope.diagnostics.map((d, i) => (
                    <li key={`${d.code}-${i}`}>
                      <strong>
                        <code>{d.code}</code>
                      </strong>
                      : {d.message}
                      {d.remediation ? <p className="remediation">{d.remediation}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No product payload available for this state.</p>
              )}
            </div>
          ) : null}

          {envelope.state === "ok" && structured ? (
            emptyStructured ? (
              <p data-testid="products-empty" className="muted">
                Catalog returned zero products.
              </p>
            ) : (
              <div className="table-wrap" role="region" aria-label="Product table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Product ID</th>
                      <th scope="col">Name</th>
                      <th scope="col">Role</th>
                      <th scope="col">Tower</th>
                      <th scope="col">Canonical</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structured.products.map((p) => (
                      <tr key={p.product_id}>
                        <td>
                          <code>{p.product_id}</code>
                        </td>
                        <td>{p.product_name ?? "—"}</td>
                        <td>{p.role ?? "—"}</td>
                        <td>{p.is_control_tower ? "Yes" : "No"}</td>
                        <td>{p.canonical ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {envelope.state === "ok" && textPayload ? (
            <pre className="code-block" data-testid="products-text">
              {textPayload.text}
            </pre>
          ) : null}

          {envelope.state === "ok" && !structured && !textPayload ? (
            <p className="muted" data-testid="products-empty">
              No catalog payload in response.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
