/**
 * Server-owned allowlist of hath0r operations.
 * HTTP clients may only select by operation key — never raw argv.
 */

export const HATHOR_OPERATIONS = ["version", "doctor", "kb.path", "kb.products"] as const;

export type HathorOperation = (typeof HATHOR_OPERATIONS)[number];

/**
 * Immutable argv map. Prefer structured JSON when the CLI supports it.
 * The executable name is resolved separately by the runner.
 */
export const OPERATION_MAP: Readonly<Record<HathorOperation, readonly string[]>> = Object.freeze({
  version: Object.freeze(["--output", "json", "--version"]),
  doctor: Object.freeze(["--output", "json", "doctor"]),
  "kb.path": Object.freeze(["--output", "json", "--quiet", "kb", "path"]),
  "kb.products": Object.freeze(["--output", "json", "kb", "products"]),
});

export function isHathorOperation(value: string): value is HathorOperation {
  return (HATHOR_OPERATIONS as readonly string[]).includes(value);
}

export function argvFor(operation: HathorOperation): readonly string[] {
  return OPERATION_MAP[operation];
}
