import "./env.mjs";

// Horizon MCP client manager. Lets the local API connect directly to HTTP MCP
// servers and authenticate them via browser OAuth driven from the dashboard.
// Tokens, client registration, and PKCE verifiers persist per server under
// .horizon/mcp/ so a restart keeps the connection.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mcpDir = resolve(repoRoot, ".horizon", "mcp");
const apiBase = process.env.HORIZON_API_PUBLIC ?? `http://127.0.0.1:${process.env.HORIZON_API_PORT ?? 8787}`;

function storeFile(serverId) {
  return resolve(mcpDir, `${serverId}.json`);
}

function loadStore(serverId) {
  const file = storeFile(serverId);
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveStore(serverId, patch) {
  mkdirSync(mcpDir, { recursive: true });
  const next = { ...loadStore(serverId), ...patch };
  writeFileSync(storeFile(serverId), JSON.stringify(next, null, 2), "utf8");
  return next;
}

// File-backed OAuthClientProvider (the SDK drives DCR + PKCE through this).
class HorizonOAuthProvider {
  constructor(serverId) {
    this.serverId = serverId;
    this.lastAuthUrl = null;
  }
  get redirectUrl() {
    return `${apiBase}/api/mcp/${encodeURIComponent(this.serverId)}/callback`;
  }
  get clientMetadata() {
    return {
      client_name: "Horizon OS Command Center",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "openid email profile",
    };
  }
  clientInformation() {
    return loadStore(this.serverId).clientInformation;
  }
  saveClientInformation(info) {
    saveStore(this.serverId, { clientInformation: info });
  }
  tokens() {
    return loadStore(this.serverId).tokens;
  }
  saveTokens(tokens) {
    saveStore(this.serverId, { tokens });
  }
  redirectToAuthorization(authorizationUrl) {
    // server-side: capture instead of redirecting; the UI opens this URL
    this.lastAuthUrl = authorizationUrl.toString();
    saveStore(this.serverId, { pendingAuthUrl: this.lastAuthUrl });
  }
  saveCodeVerifier(verifier) {
    saveStore(this.serverId, { codeVerifier: verifier });
  }
  codeVerifier() {
    const v = loadStore(this.serverId).codeVerifier;
    if (!v) throw new Error("missing code verifier");
    return v;
  }
}

const sessions = new Map(); // serverId -> { client, transport, provider }

function makeTransport(serverId, url, provider) {
  return new StreamableHTTPClientTransport(new URL(url), { authProvider: provider });
}

export function isConnected(serverId) {
  return sessions.has(serverId) && Boolean(loadStore(serverId).tokens);
}

export function connectionState(serverId) {
  const store = loadStore(serverId);
  if (sessions.has(serverId)) return "connected";
  if (store.tokens) return "authorized";
  return "disconnected";
}

// Try to connect. Returns { connected:true } or { authUrl } if OAuth is needed.
export async function connectServer(serverId, url) {
  const provider = new HorizonOAuthProvider(serverId);
  const transport = makeTransport(serverId, url, provider);
  const client = new Client({ name: "horizon-os", version: "0.1.0" }, { capabilities: {} });
  try {
    await client.connect(transport);
    sessions.set(serverId, { client, transport, provider, url });
    saveStore(serverId, { pendingAuthUrl: null });
    return { connected: true };
  } catch (error) {
    if (error instanceof UnauthorizedError || /unauthor/i.test(String(error?.message))) {
      const authUrl = provider.lastAuthUrl ?? loadStore(serverId).pendingAuthUrl;
      // keep the half-open transport so the callback can finish the same flow
      sessions.set(serverId, { client, transport, provider, url, pending: true });
      if (authUrl) return { connected: false, authUrl };
    }
    throw error;
  }
}

// OAuth redirect handler: exchange the code, then complete the connection.
export async function finishAuth(serverId, code) {
  const session = sessions.get(serverId);
  if (!session) throw new Error("no pending connection for this server");
  await session.transport.finishAuth(code);
  // reconnect now that tokens are stored
  const provider = new HorizonOAuthProvider(serverId);
  const transport = makeTransport(serverId, session.url, provider);
  const client = new Client({ name: "horizon-os", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  sessions.set(serverId, { client, transport, provider, url: session.url });
  saveStore(serverId, { pendingAuthUrl: null });
  return { connected: true };
}

export async function listTools(serverId) {
  const session = sessions.get(serverId);
  if (!session || session.pending) throw new Error("server not connected");
  const result = await session.client.listTools();
  return result.tools ?? [];
}

export async function callTool(serverId, name, args = {}) {
  const session = sessions.get(serverId);
  if (!session || session.pending) throw new Error("server not connected");
  return session.client.callTool({ name, arguments: args });
}

export function disconnectServer(serverId) {
  const session = sessions.get(serverId);
  if (session?.transport) session.transport.close?.();
  sessions.delete(serverId);
  saveStore(serverId, { tokens: null, pendingAuthUrl: null });
}

// Revive sessions from persisted tokens on process start. The OAuth tokens survive a restart in
// .horizon/mcp/<id>.json, but the in-memory session map does not — so without this, every API
// restart silently drops tool access and the autonomous loop cannot call connected tools until a
// human re-connects in the browser. Best-effort and non-throwing: pass the {id, url} pairs from
// the connector registry (mcp-client does not know server URLs on its own).
export async function reconnectStored(servers = []) {
  const out = [];
  for (const { id, url } of servers) {
    if (!url) continue;
    const store = loadStore(id);
    if (!store.tokens) continue; // never authorized -> nothing to revive
    try {
      const result = await connectServer(id, url);
      out.push({ id, ...result });
    } catch (error) {
      out.push({ id, connected: false, error: String(error?.message ?? error) });
    }
  }
  return out;
}
