import { describe, expect, it } from "vitest";
import {
  boundText,
  redactAbsolutePaths,
  redactSecrets,
  redactText,
  redactValue,
  stripAnsi,
} from "../../src/server/hathor/redact";

describe("stripAnsi", () => {
  it("removes CSI color sequences", () => {
    const colored = "\u001B[31merror\u001B[0m plain";
    expect(stripAnsi(colored)).toBe("error plain");
  });
});

describe("redactAbsolutePaths", () => {
  it("masks macOS and Linux home paths", () => {
    expect(redactAbsolutePaths("see /Users/raybayly/secret/file")).toContain("[REDACTED_PATH]");
    expect(redactAbsolutePaths("see /Users/raybayly/secret/file")).not.toContain("raybayly");
    expect(redactAbsolutePaths("kb at /home/ubuntu/.hath0r/kb")).toContain("[REDACTED_PATH]");
  });
});

describe("redactSecrets", () => {
  it("masks assignment-style secrets and bearer tokens", () => {
    expect(redactSecrets("api_key=super-secret-value")).toContain("[REDACTED_SECRET]");
    expect(redactSecrets("api_key=super-secret-value")).not.toContain("super-secret-value");
    expect(redactSecrets("Authorization: Bearer abcdefghijklmnop")).toContain("[REDACTED_SECRET]");
    expect(redactSecrets("token ghp_abcdefghijklmnopqrstuv")).toContain("[REDACTED_SECRET]");
  });
});

describe("boundText", () => {
  it("truncates long strings", () => {
    const out = boundText("x".repeat(100), 32);
    expect(out.length).toBeLessThanOrEqual(32);
    expect(out).toContain("[truncated]");
  });
});

describe("redactText", () => {
  it("applies ansi, secret, path, and bound pipeline", () => {
    const raw =
      "\u001B[32mok\u001B[0m path=/Users/alice/proj token=sk-abcdefghijklmnopqrstuvwxyz012345";
    const out = redactText(raw);
    expect(out.includes("\u001B")).toBe(false);
    expect(out).not.toContain("/Users/alice");
    expect(out).not.toContain("sk-abcdefghijklmnopqrstuvwxyz012345");
    expect(out).toContain("[REDACTED_");
  });
});

describe("redactValue", () => {
  it("walks objects and redacts path fields", () => {
    const value = {
      configured: true,
      path: "/Users/bob/.hath0r/knowledgebase",
      note: "HOME=/Users/bob",
    };
    const out = redactValue(value);
    expect(out.path).toBe("[REDACTED_PATH]");
    expect(out.note).not.toContain("/Users/bob");
    expect(out.configured).toBe(true);
  });
});
