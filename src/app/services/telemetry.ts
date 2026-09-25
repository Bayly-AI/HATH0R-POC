/**
 * Client-side telemetry and OpenObservation golden signals collector for HATH0R-POC.
 * Conforms to cfg/observability/openobservation.json.
 */

import { featureFlags } from "./flags.js";

export interface ApiCallMetric {
  id: string;
  timestamp: string;
  path: string;
  method: string;
  durationMs: number;
  status: number;
  success: boolean;
  error?: string;
}

export interface RenderTimingMetric {
  id: string;
  timestamp: string;
  viewName: string;
  durationMs: number;
}

export interface ClientErrorMetric {
  id: string;
  timestamp: string;
  message: string;
  source: string;
  stack?: string;
}

export interface SliTargetStatus {
  id: string;
  description: string;
  target: number;
  actual: number;
  isMax: boolean;
  passed: boolean;
  unit: string;
}

export interface GoldenSignalsSummary {
  latency: {
    apiP50Ms: number;
    apiP95Ms: number;
    renderP50Ms: number;
    renderP95Ms: number;
  };
  traffic: {
    totalApiCalls: number;
    totalRenderEvents: number;
    apiCallsPerMinute: number;
  };
  errors: {
    totalApiErrors: number;
    totalClientErrors: number;
    apiErrorRate: number;
  };
  saturation: {
    bufferCapacity: number;
    bufferUsed: number;
    saturationPct: number;
  };
  slis: SliTargetStatus[];
}

const SECRET_PATTERNS = [
  /\b(api[_-]?key|token|password|passwd|secret|authorization|bearer|access[_-]?key|private[_-]?key)\s*[=:]\s*['"]?[^\s'"]+/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
];

const ABS_PATH_RE =
  /(?:\/(?:Users|home|root|var|private|opt|tmp)\/[^\s"'`]+)|(?:[A-Za-z]:\\[^\s"'`]+)|(?:\\\\[^\s"'`]+)/g;

export function redactSensitiveText(text: string): string {
  let clean = text.replace(ABS_PATH_RE, "[REDACTED_PATH]");
  for (const pat of SECRET_PATTERNS) {
    clean = clean.replace(pat, "[REDACTED_SECRET]");
  }
  return clean;
}

function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1));
  const val = sorted[clampedIndex];
  return typeof val === "number" ? Math.round(val) : 0;
}

export class ClientTelemetryCollector {
  private maxBufferSize = 200;
  private apiMetrics: ApiCallMetric[] = [];
  private renderMetrics: RenderTimingMetric[] = [];
  private clientErrors: ClientErrorMetric[] = [];
  private startTime = Date.now();

  constructor(maxBufferSize = 200) {
    this.maxBufferSize = maxBufferSize;
  }

  recordApiCall(metric: Omit<ApiCallMetric, "id" | "timestamp">): void {
    const item: ApiCallMetric = {
      id: `api_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      path: redactSensitiveText(metric.path),
      method: metric.method.toUpperCase(),
      durationMs: Math.max(0, Math.round(metric.durationMs)),
      status: metric.status,
      success: metric.success,
      error: metric.error ? redactSensitiveText(metric.error) : undefined,
    };

    this.apiMetrics.push(item);
    if (this.apiMetrics.length > this.maxBufferSize) {
      this.apiMetrics.shift();
    }

    if (featureFlags.getBoolean("poc.telemetry.console_debug", false)) {
      console.debug("[Telemetry] API Call:", item);
    }
  }

  recordRender(viewName: string, durationMs: number): void {
    const item: RenderTimingMetric = {
      id: `rnd_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      viewName: redactSensitiveText(viewName),
      durationMs: Math.max(0, Math.round(durationMs)),
    };

    this.renderMetrics.push(item);
    if (this.renderMetrics.length > this.maxBufferSize) {
      this.renderMetrics.shift();
    }

    if (featureFlags.getBoolean("poc.telemetry.console_debug", false)) {
      console.debug("[Telemetry] Render:", item);
    }
  }

  recordError(error: unknown, source: string): void {
    let msg = "Unknown error";
    let stack: string | undefined;

    if (error instanceof Error) {
      msg = error.message;
      stack = error.stack;
    } else if (typeof error === "string") {
      msg = error;
    }

    const item: ClientErrorMetric = {
      id: `err_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      source: redactSensitiveText(source),
      message: redactSensitiveText(msg),
      stack: stack ? redactSensitiveText(stack) : undefined,
    };

    this.clientErrors.push(item);
    if (this.clientErrors.length > this.maxBufferSize) {
      this.clientErrors.shift();
    }

    if (featureFlags.getBoolean("poc.telemetry.console_debug", false)) {
      console.debug("[Telemetry] Client Error:", item);
    }
  }

  getGoldenSignals(): GoldenSignalsSummary {
    const apiDurations = this.apiMetrics.map((m) => m.durationMs);
    const renderDurations = this.renderMetrics.map((m) => m.durationMs);

    const totalApiCalls = this.apiMetrics.length;
    const apiErrors = this.apiMetrics.filter((m) => !m.success).length;
    const apiSuccesses = this.apiMetrics.filter((m) => m.success).length;

    const apiErrorRate = totalApiCalls > 0 ? apiErrors / totalApiCalls : 0;
    const healthSuccessRate = totalApiCalls > 0 ? apiSuccesses / totalApiCalls : 1.0;

    const renderP95 = calculatePercentile(renderDurations, 95);
    const renderP50 = calculatePercentile(renderDurations, 50);
    const apiP95 = calculatePercentile(apiDurations, 95);
    const apiP50 = calculatePercentile(apiDurations, 50);

    const elapsedMinutes = Math.max(0.1, (Date.now() - this.startTime) / 60000);
    const apiCallsPerMinute = Math.round((totalApiCalls / elapsedMinutes) * 10) / 10;

    const totalUsed = this.apiMetrics.length + this.renderMetrics.length + this.clientErrors.length;
    const capacity = this.maxBufferSize * 3;
    const saturationPct = Math.round((totalUsed / capacity) * 100);

    const slis: SliTargetStatus[] = [
      {
        id: "ui.health.success_rate",
        description: "Status and API call success rate",
        target: 0.99,
        actual: Math.round(healthSuccessRate * 1000) / 1000,
        isMax: false,
        passed: healthSuccessRate >= 0.99,
        unit: "ratio",
      },
      {
        id: "ui.api.error_rate",
        description: "Client API error rate",
        target: 0.05,
        actual: Math.round(apiErrorRate * 1000) / 1000,
        isMax: true,
        passed: apiErrorRate <= 0.05,
        unit: "ratio",
      },
      {
        id: "ui.render.latency_p95_ms",
        description: "Render timing 95th percentile",
        target: 200,
        actual: renderP95,
        isMax: true,
        passed: renderP95 <= 200,
        unit: "ms",
      },
    ];

    return {
      latency: {
        apiP50Ms: apiP50,
        apiP95Ms: apiP95,
        renderP50Ms: renderP50,
        renderP95Ms: renderP95,
      },
      traffic: {
        totalApiCalls,
        totalRenderEvents: this.renderMetrics.length,
        apiCallsPerMinute,
      },
      errors: {
        totalApiErrors: apiErrors,
        totalClientErrors: this.clientErrors.length,
        apiErrorRate: Math.round(apiErrorRate * 1000) / 1000,
      },
      saturation: {
        bufferCapacity: capacity,
        bufferUsed: totalUsed,
        saturationPct,
      },
      slis,
    };
  }

  getApiMetrics(): ApiCallMetric[] {
    return [...this.apiMetrics];
  }

  getRenderMetrics(): RenderTimingMetric[] {
    return [...this.renderMetrics];
  }

  getClientErrors(): ClientErrorMetric[] {
    return [...this.clientErrors];
  }

  clear(): void {
    this.apiMetrics = [];
    this.renderMetrics = [];
    this.clientErrors = [];
    this.startTime = Date.now();
  }
}

export const telemetryCollector = new ClientTelemetryCollector();
