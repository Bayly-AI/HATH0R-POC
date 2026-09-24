/**
 * Sanitization for CLI runner output before logs or browser responses.
 * Per HATHOR-GUIDE-043 §4–6 / POC-NFR-005.
 */

export const DEFAULT_MAX_TEXT_CHARS = 4_096;

/** CSI / OSC-style ANSI sequences. */
const ANSI_RE =
  // eslint-disable-next-line no-control-regex -- intentional control-char strip
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

/** Absolute home-style and common absolute roots (POSIX + Windows). */
const ABS_PATH_RE =
  /(?:\/(?:Users|home|root|var|private|opt|tmp)\/[^\s"'`]+)|(?:[A-Za-z]:\\[^\s"'`]+)|(?:\\\\[^\s"'`]+)/g;

/**
 * Secret-like assignments and tokens.
 * Conservative: mask value side, keep key/label when obvious.
 */
const SECRET_PATTERNS: RegExp[] = [
  /\b(api[_-]?key|token|password|passwd|secret|authorization|bearer|access[_-]?key|private[_-]?key)\s*[=:]\s*['"]?[^\s'"]+/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
];

export function stripAnsi(input: string): string {
  return input.replace(ANSI_RE, "");
}

export function redactAbsolutePaths(input: string, replacement = "[REDACTED_PATH]"): string {
  return input.replace(ABS_PATH_RE, replacement);
}

export function redactSecrets(input: string, replacement = "[REDACTED_SECRET]"): string {
  let out = input;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (match) => {
      const sep = match.search(/[=:]/);
      if (
        sep >= 0 &&
        /^(api|token|password|passwd|secret|authorization|access|private)/i.test(match)
      ) {
        const label = match.slice(0, sep + 1);
        return `${label} ${replacement}`;
      }
      return replacement;
    });
  }
  return out;
}

export function boundText(input: string, maxChars: number = DEFAULT_MAX_TEXT_CHARS): string {
  if (input.length <= maxChars) return input;
  return `${input.slice(0, Math.max(0, maxChars - 16))}…[truncated]`;
}

/**
 * Full redaction pipeline for free-form diagnostic / stdout text.
 */
export function redactText(input: string, maxChars: number = DEFAULT_MAX_TEXT_CHARS): string {
  const stripped = stripAnsi(input);
  const noSecrets = redactSecrets(stripped);
  const noPaths = redactAbsolutePaths(noSecrets);
  return boundText(noPaths, maxChars);
}

/**
 * Deep-redact string leaves in JSON-compatible values (diagnostics, data).
 * Non-strings are walked; arrays/objects preserved.
 */
export function redactValue<T>(value: T, maxChars: number = DEFAULT_MAX_TEXT_CHARS): T {
  if (typeof value === "string") {
    return redactText(value, maxChars) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, maxChars)) as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Prefer dropping absolute path fields for kb.path rather than leaking structure.
      if (k === "path" && typeof v === "string") {
        out[k] = redactAbsolutePaths(v);
        continue;
      }
      out[k] = redactValue(v, maxChars);
    }
    return out as T;
  }
  return value;
}
