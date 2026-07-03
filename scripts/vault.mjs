// Obsidian vault bridge (filesystem only, no DB). Horizon mirrors its state
// into the vault as Markdown and reads vault notes back. All paths are confined
// to the vault root to prevent traversal.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function vaultRoot() {
  // 1. Explicit env override still works
  if (process.env.HORIZON_VAULT_PATH) return resolve(process.env.HORIZON_VAULT_PATH);
  
  // 2. Check if ~/Desktop/bolting/.obsidian exists → that's the real vault
  const boltingVault = resolve(homedir(), 'Desktop', 'bolting');
  if (existsSync(join(boltingVault, '.obsidian'))) return boltingVault;
  
  // 3. Fallback to old behavior
  const nested = resolve(repoRoot, 'vault', 'horizon');
  if (existsSync(nested)) return nested;
  return resolve(repoRoot, 'vault');
}

function safeResolve(relPath) {
  const root = vaultRoot();
  const abs = resolve(root, relPath ?? "");
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error("path escapes vault");
  return abs;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.venv', '__pycache__', '.expo',
  'dist', 'build', '.turbo', '.cache', '.horizon', '.claude',
  'playwright-report', 'test-results', '.vscode', '.idea',
  'vendor', 'target', '.wrangler', '.open-next'
]);

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
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs, root, out);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.canvas'))) {
      const st = statSync(abs);
      out.push({ path: relative(root, abs), name: entry.name.replace(/\.(md|canvas)$/i, ""), mtime: st.mtimeMs, size: st.size });
    }
  }
  return out;
}

export function vaultInfo() {
  const root = vaultRoot();
  const exists = existsSync(root);
  const notes = exists ? walk(root, root, []) : [];
  
  const brains = {
    "horizon-os": 0,
    "opensrc": 0,
    "graphify": 0
  };
  
  for (const n of notes) {
    if (n.path.startsWith("brains/horizon-os/")) brains["horizon-os"]++;
    else if (n.path.startsWith("brains/opensrc/")) brains["opensrc"]++;
    else if (n.path.startsWith("brains/graphify/")) brains["graphify"]++;
  }

  return { path: root, exists, noteCount: notes.length, brains };
}

export function listNotes() {
  const root = vaultRoot();
  if (!existsSync(root)) return [];
  return walk(root, root, []).sort((a, b) => b.mtime - a.mtime);
}

export function readNote(relPath) {
  let abs = safeResolve(relPath);
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    const nestedHtml = join(abs, "graphify-out", "graph.html");
    if (existsSync(nestedHtml)) {
      abs = nestedHtml;
    } else {
      const rootHtml = join(abs, "graph.html");
      if (existsSync(rootHtml)) {
        abs = rootHtml;
      }
    }
  }
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
