import { spawn } from "node:child_process";

// Shared subprocess runner for local-agent executors (Claude Code, Codex). Non-blocking:
// returns a promise, streams the prompt over stdin (avoids arg-length/escaping limits),
// captures stdout/stderr, and enforces a hard wall-clock timeout by killing the child.
// No secrets pass through here — the local CLIs authenticate with the operator's own
// subscription (Claude Code login / ChatGPT plan), which is the whole point of going native.

export function runCommand({ command, args = [], input = "", timeoutMs = 180000, cwd } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      resolve({ ok: false, code: null, stdout: "", stderr: "", timedOut: false, error: String(error?.message ?? error) });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };

    child.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf8"); });

    child.on("error", (error) => {
      // ENOENT here = the CLI is not installed / not on PATH. Caller falls back to handoff.
      const code = error?.code === "ENOENT" ? "cli_not_found" : String(error?.message ?? error);
      finish({ ok: false, code: null, stdout, stderr, timedOut, error: code });
    });

    child.on("close", (code) => {
      finish({ ok: code === 0 && !timedOut, code, stdout, stderr, timedOut, error: timedOut ? "timeout" : "" });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

// Quick version probe used by the Connectors health checks. Short timeout; never throws.
export async function probeVersion(command, args = ["--version"]) {
  const res = await runCommand({ command, args, input: "", timeoutMs: 8000 });
  if (res.ok) {
    return { ok: true, version: (res.stdout || res.stderr).trim().split("\n")[0] };
  }
  return { ok: false, version: "", error: res.error || `exit ${res.code}` };
}
