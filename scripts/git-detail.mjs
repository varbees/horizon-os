import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// Rich per-project git status for the project-detail screen. Read-only: never mutates
// a repo. Tolerant — a non-git or missing path returns a clean shape, never throws.

const SEP = "\x1f"; // unit separator, safe field delimiter for git log

function git(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// "~/x" -> "/home/you/x"; "A + B" / "A · B" -> first concrete path.
export function normalizeProjectPath(raw) {
  if (!raw) return "";
  let p = String(raw).split(/\s+[+·]\s+/)[0].trim();
  if (p.startsWith("~")) p = homedir() + p.slice(1);
  return p;
}

function toWebUrl(remote) {
  if (!remote) return "";
  return remote
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "");
}

export function gitDetail(rawPath) {
  const path = normalizeProjectPath(rawPath);
  if (!path || !existsSync(path)) return { ok: false, reason: "path_missing", path };

  const top = git(path, ["rev-parse", "--show-toplevel"]);
  if (!top) return { ok: true, isGit: false, path };

  const branch = git(top, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const remote = git(top, ["remote", "get-url", "origin"]);
  const porcelain = git(top, ["status", "--porcelain=v1"]);
  const dirtyFiles = porcelain
    ? porcelain
        .split("\n")
        .filter(Boolean)
        .map((line) => ({ code: line.slice(0, 2).trim() || "?", file: line.slice(3) }))
    : [];

  let ahead = 0;
  let behind = 0;
  const counts = git(top, ["rev-list", "--left-right", "--count", "@{u}...HEAD"]);
  if (counts) {
    const [b, a] = counts.split(/\s+/).map((n) => Number(n) || 0);
    behind = b;
    ahead = a;
  }

  const logRaw = git(top, ["log", "-10", `--pretty=format:%h${SEP}%s${SEP}%cr${SEP}%an`]);
  const commits = logRaw
    ? logRaw.split("\n").map((line) => {
        const [hash, subject, when, author] = line.split(SEP);
        return { hash, subject, when, author };
      })
    : [];

  return {
    ok: true,
    isGit: true,
    path: top,
    branch,
    remote,
    webUrl: toWebUrl(remote),
    ahead,
    behind,
    dirtyCount: dirtyFiles.length,
    dirtyFiles: dirtyFiles.slice(0, 60),
    commits,
    checkedAt: new Date().toISOString(),
  };
}
