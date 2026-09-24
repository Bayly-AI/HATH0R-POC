/**
 * POC capability contract (hathor-poc.capabilities/1).
 * States reflect adapter support / product policy, not live probe health.
 * Per HATHOR-GUIDE-043 §7.
 */

/** CLI operation keys the adapter may expose (mirrors server operation map). */
export const ADAPTER_OPERATIONS = ["version", "doctor", "kb.path", "kb.products"] as const;
export type AdapterOperation = (typeof ADAPTER_OPERATIONS)[number];

export const POC_CAPABILITIES_SCHEMA = "hathor-poc.capabilities/1" as const;

export type CapabilityState = "implemented" | "planned" | "unavailable" | "out-of-scope";

export interface CapabilityEntry {
  id: string;
  state: CapabilityState;
  summary: string;
  /** Why this state was chosen (adapter evidence, not UI optimism). */
  evidence: string;
}

export interface CapabilityDocument {
  schema: typeof POC_CAPABILITIES_SCHEMA;
  generatedAt: string;
  capabilities: CapabilityEntry[];
}

/** Adapter feature flags used to derive capability rows (never invent success). */
export interface AdapterSupport {
  /** Named CLI operations the server operation map exposes. */
  operations: readonly AdapterOperation[];
  /** Runner requests --output json and normalizer validates hath0r.cli.response/1. */
  structuredOutput: boolean;
  /** Framework knowledge search command exists in released CLI. */
  frameworkKnowledgeSearch: boolean;
  /** Framework validation command exists in released CLI. */
  frameworkValidation: boolean;
  /** Framework orchestration command exists in released CLI. */
  frameworkOrchestration: boolean;
  /** Mutating operator commands allowed on POC allowlist. */
  operatorMutations: boolean;
}

const OP_TO_CAPABILITY: Record<AdapterOperation, { id: string; summary: string }> = {
  version: {
    id: "cli.version",
    summary: "CLI version probe via fixed operation map",
  },
  doctor: {
    id: "cli.doctor",
    summary: "Suite doctor probe; overall health may still be degraded at runtime",
  },
  "kb.path": {
    id: "kb.path",
    summary: "Canonical knowledgebase path probe; availability may fail at runtime",
  },
  "kb.products": {
    id: "kb.products",
    summary: "Suite product catalog probe via CLI",
  },
};

/**
 * Default support for the current OpenSource POC adapter (P2/P3 shipped).
 * Framework-only and mutating surfaces stay unavailable / out-of-scope until
 * a released CLI contract exists and is allowlisted.
 */
export function defaultAdapterSupport(): AdapterSupport {
  return {
    operations: ADAPTER_OPERATIONS,
    structuredOutput: true,
    frameworkKnowledgeSearch: false,
    frameworkValidation: false,
    frameworkOrchestration: false,
    operatorMutations: false,
  };
}

/**
 * Build a capability document from adapter support flags.
 * Runtime probe failures must not flip `implemented` → they affect envelope `state` only.
 */
export function buildCapabilityDocument(
  support: AdapterSupport = defaultAdapterSupport(),
  generatedAt: string = new Date().toISOString(),
): CapabilityDocument {
  const implementedOps = new Set<AdapterOperation>(support.operations);
  const capabilities: CapabilityEntry[] = [];

  for (const op of ADAPTER_OPERATIONS) {
    const meta = OP_TO_CAPABILITY[op];
    const supported = implementedOps.has(op);
    capabilities.push({
      id: meta.id,
      state: supported ? "implemented" : "unavailable",
      summary: meta.summary,
      evidence: supported
        ? `operation map includes "${op}"`
        : `operation map does not include "${op}"`,
    });
  }

  capabilities.push({
    id: "cli.structured-output",
    state: support.structuredOutput ? "implemented" : "planned",
    summary: "Machine JSON envelope hath0r.cli.response/1 on CLI probes",
    evidence: support.structuredOutput
      ? "runner argv includes --output json; normalizer validates envelope"
      : "structured JSON not yet wired in adapter",
  });

  capabilities.push({
    id: "framework.knowledge-search",
    state: support.frameworkKnowledgeSearch ? "implemented" : "unavailable",
    summary: "Framework knowledge search surface",
    evidence: support.frameworkKnowledgeSearch
      ? "released CLI command allowlisted"
      : "no released CLI command on POC allowlist",
  });

  capabilities.push({
    id: "framework.validation",
    state: support.frameworkValidation ? "implemented" : "unavailable",
    summary: "Framework validation surface",
    evidence: support.frameworkValidation
      ? "released CLI command allowlisted"
      : "no released CLI command on POC allowlist",
  });

  capabilities.push({
    id: "framework.orchestration",
    state: support.frameworkOrchestration ? "implemented" : "unavailable",
    summary: "Framework orchestration surface",
    evidence: support.frameworkOrchestration
      ? "released CLI command allowlisted"
      : "no released CLI command on POC allowlist",
  });

  capabilities.push({
    id: "operator.mutations",
    state: support.operatorMutations ? "implemented" : "out-of-scope",
    summary: "Mutating operator commands (write/deploy/credential)",
    evidence: support.operatorMutations
      ? "explicitly allowlisted after threat review"
      : "deliberately excluded from initial POC allowlist",
  });

  return {
    schema: POC_CAPABILITIES_SCHEMA,
    generatedAt,
    capabilities,
  };
}

export function getCapability(doc: CapabilityDocument, id: string): CapabilityEntry | undefined {
  return doc.capabilities.find((c) => c.id === id);
}
