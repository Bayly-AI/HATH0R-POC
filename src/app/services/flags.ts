/**
 * In-memory feature flag client supporting OpenFeature catalog defaults.
 * Conforms to cfg/feature-flags/openfeature.json and catalog.example.json.
 */

export interface FeatureFlagCatalogEntry {
  key: string;
  type: "boolean" | "string" | "number";
  default: boolean | string | number;
  owner?: string;
  description?: string;
}

export const DEFAULT_CATALOG: FeatureFlagCatalogEntry[] = [
  {
    key: "poc.fixture_mode.default",
    type: "boolean",
    default: false,
    owner: "uxp",
    description: "Default to fixture status source when live API is unavailable",
  },
  {
    key: "poc.telemetry.console_debug",
    type: "boolean",
    default: false,
    owner: "observability",
    description: "Log client telemetry and health checks to browser developer console",
  },
  {
    key: "poc.dark_mode.preview",
    type: "boolean",
    default: true,
    owner: "uxp",
    description: "Enable dark mode styling preview in the integration console",
  },
];

class FeatureFlagService {
  private overrides: Map<string, boolean | string | number> = new Map();
  private defaults: Map<string, boolean | string | number> = new Map();

  constructor() {
    for (const item of DEFAULT_CATALOG) {
      this.defaults.set(item.key, item.default);
    }
  }

  getBoolean(key: string, fallback = false): boolean {
    if (this.overrides.has(key)) {
      const v = this.overrides.get(key);
      return typeof v === "boolean" ? v : fallback;
    }
    if (this.defaults.has(key)) {
      const v = this.defaults.get(key);
      return typeof v === "boolean" ? v : fallback;
    }
    return fallback;
  }

  setOverride(key: string, value: boolean | string | number): void {
    this.overrides.set(key, value);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  getAllFlags(): Record<string, boolean | string | number> {
    const res: Record<string, boolean | string | number> = {};
    for (const [k, v] of this.defaults.entries()) {
      res[k] = v;
    }
    for (const [k, v] of this.overrides.entries()) {
      res[k] = v;
    }
    return res;
  }
}

export const featureFlags = new FeatureFlagService();
