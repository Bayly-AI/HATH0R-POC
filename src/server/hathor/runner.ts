import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { argvFor, type HathorOperation } from "./operations.js";

export interface RunnerResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export interface RunnerOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  cwd?: string;
  /** Override executable path (tests / advanced ops). */
  executable?: string;
  env?: NodeJS.ProcessEnv;
  /** Injected spawn for tests. */
  spawnImpl?: typeof spawn;
}

export class HathorSpawnError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "HathorSpawnError";
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;
const DEFAULT_CONCURRENCY = 4;

const ALLOWED_ENV_KEYS = ["PATH", "HOME", "HATH0R_GROUP_ROOT", "HATH0R_KB_PATH"] as const;

export function buildMinimalEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED_ENV_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    }
  }
  // Ensure PATH exists so which/spawn can resolve binaries when not overridden.
  if (!out.PATH && typeof source.PATH === "string") {
    out.PATH = source.PATH;
  }
  return out;
}

export function resolveHathorExecutable(
  override?: string,
  pathEnv: string = process.env.PATH ?? "",
  opts: { checkOverrideAccess?: boolean } = {},
): string {
  const checkOverrideAccess = opts.checkOverrideAccess ?? true;
  if (override) {
    if (checkOverrideAccess) {
      accessSync(override, fsConstants.X_OK);
    }
    return override;
  }
  const candidates = pathEnv.split(path.delimiter).filter(Boolean);
  for (const dir of candidates) {
    for (const name of ["hath0r", "hath0r.exe"]) {
      const full = path.join(dir, name);
      try {
        accessSync(full, fsConstants.X_OK);
        return full;
      } catch {
        // try next
      }
    }
  }
  throw new HathorSpawnError(
    "hath0r executable not found on PATH. Install HATH0R-CLI (`pip install -e ../HATH0R-CLI`).",
  );
}

class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
    this.active += 1;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next();
  }

  get activeCount(): number {
    return this.active;
  }
}

const defaultSemaphore = new Semaphore(DEFAULT_CONCURRENCY);

/** Test/inspection hook for concurrency. */
export function getDefaultSemaphoreActiveCount(): number {
  return defaultSemaphore.activeCount;
}

export async function runHathorOperation(
  operation: HathorOperation,
  options: RunnerOptions = {},
  semaphore: Semaphore = defaultSemaphore,
): Promise<RunnerResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const cwd = options.cwd ?? os.tmpdir();
  const spawnImpl = options.spawnImpl ?? spawn;
  const envSource = options.env ?? process.env;

  let executable: string;
  try {
    executable = resolveHathorExecutable(options.executable, envSource.PATH ?? process.env.PATH, {
      // When spawn is injected (unit tests), skip filesystem execute checks on mock paths.
      checkOverrideAccess: options.spawnImpl === undefined,
    });
  } catch (err) {
    if (err instanceof HathorSpawnError) throw err;
    throw new HathorSpawnError("Failed to resolve hath0r executable", err);
  }

  const args = [...argvFor(operation)];
  const env = buildMinimalEnv(envSource);

  await semaphore.acquire();
  const started = performance.now();

  try {
    return await new Promise<RunnerResult>((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawnImpl(executable, args, {
          shell: false,
          cwd,
          env,
          stdio: ["ignore", "pipe", "pipe"],
        }) as unknown as ChildProcessWithoutNullStreams;
      } catch (err) {
        reject(new HathorSpawnError(`Failed to spawn hath0r: ${String(err)}`, err));
        return;
      }

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let truncated = false;
      let timedOut = false;
      let settled = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, timeoutMs);

      const onChunk = (stream: "stdout" | "stderr", chunk: Buffer) => {
        const list = stream === "stdout" ? stdoutChunks : stderrChunks;
        let used = stream === "stdout" ? stdoutBytes : stderrBytes;
        if (used >= maxOutputBytes) {
          truncated = true;
          return;
        }
        const remaining = maxOutputBytes - used;
        if (chunk.length > remaining) {
          list.push(chunk.subarray(0, remaining));
          used = maxOutputBytes;
          truncated = true;
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
        } else {
          list.push(chunk);
          used += chunk.length;
        }
        if (stream === "stdout") stdoutBytes = used;
        else stderrBytes = used;
      };

      child.stdout.on("data", (c: Buffer) => onChunk("stdout", c));
      child.stderr.on("data", (c: Buffer) => onChunk("stderr", c));

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new HathorSpawnError(`hath0r spawn error: ${err.message}`, err));
      });

      child.on("close", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const durationMs = Math.max(0, Math.round(performance.now() - started));
        resolve({
          exitCode: code,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
          signal,
          timedOut,
          truncated,
          durationMs,
        });
      });
    });
  } finally {
    semaphore.release();
  }
}

/** Exposed for unit tests of the semaphore in isolation. */
export function createSemaphore(max: number): Semaphore {
  return new Semaphore(max);
}
