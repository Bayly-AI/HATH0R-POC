import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HATHOR_OPERATIONS,
  OPERATION_MAP,
  argvFor,
  isHathorOperation,
} from "../../src/server/hathor/operations";
import {
  HathorSpawnError,
  buildMinimalEnv,
  createSemaphore,
  resolveHathorExecutable,
  runHathorOperation,
} from "../../src/server/hathor/runner";

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill = vi.fn(() => {
    this.killed = true;
    // simulate close after kill
    queueMicrotask(() => this.emit("close", null, "SIGKILL"));
    return true;
  });
}

describe("operations map", () => {
  it("exposes exactly four immutable operations", () => {
    expect(HATHOR_OPERATIONS).toHaveLength(4);
    expect(Object.keys(OPERATION_MAP)).toHaveLength(4);
    expect(Object.isFrozen(OPERATION_MAP)).toBe(true);
    for (const op of HATHOR_OPERATIONS) {
      expect(Object.isFrozen(OPERATION_MAP[op])).toBe(true);
      expect(argvFor(op)[0]).toBe("--output");
      expect(argvFor(op)).toContain("json");
    }
    expect(isHathorOperation("version")).toBe(true);
    expect(isHathorOperation("rm -rf")).toBe(false);
  });
});

describe("buildMinimalEnv", () => {
  it("passes only allowlisted keys", () => {
    const env = buildMinimalEnv({
      PATH: "/usr/bin",
      HOME: "/mock/home",
      HATH0R_GROUP_ROOT: "/mock/group",
      HATH0R_KB_PATH: "/mock/kb",
      SECRET: "nope",
      AWS_SECRET_ACCESS_KEY: "nope",
    });
    expect(env).toEqual({
      PATH: "/usr/bin",
      HOME: "/mock/home",
      HATH0R_GROUP_ROOT: "/mock/group",
      HATH0R_KB_PATH: "/mock/kb",
    });
    expect(env).not.toHaveProperty("SECRET");
  });
});

describe("resolveHathorExecutable", () => {
  it("throws HathorSpawnError when not on PATH", () => {
    expect(() => resolveHathorExecutable(undefined, "/no/such/dir")).toThrow(HathorSpawnError);
  });
});

describe("runHathorOperation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns with shell:false and fixed argv on success", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit("data", Buffer.from('{"ok":true}'));
        child.emit("close", 0, null);
      });
      return child;
    });

    const result = await runHathorOperation("version", {
      executable: "/mock/bin/hath0r",
      spawnImpl: spawnImpl as never,
      env: { PATH: "/usr/bin", HOME: "/tmp" },
      cwd: "/tmp",
    });

    expect(spawnImpl).toHaveBeenCalledWith(
      "/mock/bin/hath0r",
      ["--output", "json", "--version"],
      expect.objectContaining({
        shell: false,
        cwd: "/tmp",
        env: { PATH: "/usr/bin", HOME: "/tmp" },
      }),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('{"ok":true}');
    expect(result.timedOut).toBe(false);
    expect(result.truncated).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns nonzero exit without throwing", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => {
      queueMicrotask(() => {
        child.stderr.emit("data", Buffer.from("fail"));
        child.emit("close", 6, null);
      });
      return child;
    });

    const result = await runHathorOperation("doctor", {
      executable: "/mock/bin/hath0r",
      spawnImpl: spawnImpl as never,
      env: { PATH: "/usr/bin" },
    });
    expect(result.exitCode).toBe(6);
    expect(result.stderr).toBe("fail");
  });

  it("times out and kills the process", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => child);

    const resultPromise = runHathorOperation("kb.path", {
      executable: "/mock/bin/hath0r",
      spawnImpl: spawnImpl as never,
      env: { PATH: "/usr/bin" },
      timeoutMs: 20,
    });

    const result = await resultPromise;
    expect(result.timedOut).toBe(true);
    expect(child.kill).toHaveBeenCalled();
  });

  it("caps output and marks truncated", async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.emit("data", Buffer.alloc(100, 0x61));
        // close may race with kill from cap; ensure close eventually
      });
      return child;
    });

    const result = await runHathorOperation("kb.products", {
      executable: "/mock/bin/hath0r",
      spawnImpl: spawnImpl as never,
      env: { PATH: "/usr/bin" },
      maxOutputBytes: 16,
    });
    expect(result.truncated).toBe(true);
    expect(Buffer.byteLength(result.stdout, "utf8")).toBeLessThanOrEqual(16);
    expect(child.kill).toHaveBeenCalled();
  });

  it("throws HathorSpawnError on spawn failure", async () => {
    const spawnImpl = vi.fn(() => {
      throw new Error("ENOENT");
    });
    await expect(
      runHathorOperation("version", {
        executable: "/mock/bin/hath0r",
        spawnImpl: spawnImpl as never,
        env: { PATH: "/usr/bin" },
      }),
    ).rejects.toBeInstanceOf(HathorSpawnError);
  });

  it("limits concurrency via semaphore", async () => {
    const sem = createSemaphore(1);
    const children: FakeChild[] = [];
    const spawnImpl = vi.fn(() => {
      const child = new FakeChild();
      children.push(child);
      return child;
    });

    const p1 = runHathorOperation(
      "version",
      {
        executable: "/mock/bin/hath0r",
        spawnImpl: spawnImpl as never,
        env: { PATH: "/usr/bin" },
        timeoutMs: 5000,
      },
      sem,
    );
    // allow first spawn to start
    await new Promise((r) => setTimeout(r, 5));
    expect(spawnImpl).toHaveBeenCalledTimes(1);

    const p2 = runHathorOperation(
      "doctor",
      {
        executable: "/mock/bin/hath0r",
        spawnImpl: spawnImpl as never,
        env: { PATH: "/usr/bin" },
        timeoutMs: 5000,
      },
      sem,
    );
    await new Promise((r) => setTimeout(r, 10));
    // second must wait on semaphore
    expect(spawnImpl).toHaveBeenCalledTimes(1);

    children[0]?.emit("close", 0, null);
    await p1;
    await new Promise((r) => setTimeout(r, 10));
    expect(spawnImpl).toHaveBeenCalledTimes(2);
    children[1]?.emit("close", 0, null);
    await p2;
  });
});
