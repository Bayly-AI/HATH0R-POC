/**
 * In-memory feature flag client supporting OpenFeature catalog defaults.
 * Conforms to cfg/feature-flags/openfeature.json and catalog.example.json.
 */

export type FlagType = "boolean" | "string" | "number";
export type FlagValue = boolean | string | number;

export interface FeatureFlagCatalogEntry {
  readonly key: string;
  readonly type: FlagType;
  readonly default: FlagValue;
  readonly owner?: string;
  readonly description?: string;
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
  private readonly overrides: Map<string, FlagValue> = new Map();
  private readonly defaults: Map<string, FlagValue> = new Map();

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

  setOverride(key: string, value: FlagValue): void {
    this.overrides.set(key, value);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  getAllFlags(): Record<string, FlagValue> {
    const res: Record<string, FlagValue> = {};
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
