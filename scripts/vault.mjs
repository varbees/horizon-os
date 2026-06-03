// Obsidian vault bridge (filesystem only, no DB). Horizon mirrors its state
// into the vault as Markdown and reads vault notes back. All paths are confined
// to the vault root to prevent traversal.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function vaultRoot() {
  if (process.env.HORIZON_VAULT_PATH) return resolve(process.env.HORIZON_VAULT_PATH);
  const nested = resolve(repoRoot, "vault", "horizon");
  if (existsSync(nested)) return nested;
  return resolve(repoRoot, "vault");
}

function safeResolve(relPath) {
  const root = vaultRoot();
  const abs = resolve(root, relPath ?? "");
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error("path escapes vault");
  return abs;
}

function walk(dir, root, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // skip .obsidian, .trash, etc.
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, root, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      const st = statSync(abs);
      out.push({ path: relative(root, abs), name: entry.name.replace(/\.md$/i, ""), mtime: st.mtimeMs, size: st.size });
    }
  }
  return out;
}

export function vaultInfo() {
  const root = vaultRoot();
  const exists = existsSync(root);
  const notes = exists ? walk(root, root, []) : [];
  return { path: root, exists, noteCount: notes.length };
}

export function listNotes() {
  const root = vaultRoot();
  if (!existsSync(root)) return [];
  return walk(root, root, []).sort((a, b) => b.mtime - a.mtime);
}

export function readNote(relPath) {
  const abs = safeResolve(relPath);
  return { path: relPath, content: readFileSync(abs, "utf8") };
}

export function writeNote(relPath, content) {
  const abs = safeResolve(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  return { path: relPath, bytes: Buffer.byteLength(content) };
}

export function frontmatter(fields) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) lines.push(`${k}: ${v}`);
  lines.push("---", "");
  return lines.join("\n");
}
