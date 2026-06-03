# MCP Connectors (v1.0)

The `/connectors` screen lets Horizon connect **directly** to HTTP MCP servers and authenticate them
with browser OAuth driven from the dashboard. This is a real MCP client embedded in the local API, not
an agent relay.

## Architecture

- `scripts/mcp-client.mjs` uses `@modelcontextprotocol/sdk` (`Client` +
  `StreamableHTTPClientTransport`) with a file-backed `OAuthClientProvider`. It performs the full
  OAuth 2.1 flow the spec defines: discovery, dynamic client registration (DCR), PKCE, code exchange,
  and refresh. Per-server client registration, PKCE verifiers, and tokens persist under
  `.horizon/mcp/<server>.json` (gitignored), so a restart keeps the connection.
- API endpoints:
  - `GET /api/mcp` — servers + connection state.
  - `POST /api/mcp/:id/connect` — returns `{ connected:true }` or `{ authUrl }` when OAuth is needed.
  - `GET /api/mcp/:id/callback` — OAuth redirect target; exchanges the code and finishes the connection.
  - `POST /api/mcp/:id/tools` and `POST /api/mcp/:id/call` — list and call the server's tools.
  - `POST /api/mcp/:id/disconnect`.

## The web-UI auth flow

1. Click **Connect** on a server card. Horizon attempts the MCP handshake.
2. If the server needs auth, Horizon runs discovery + DCR and returns an authorization URL. The
   dashboard opens it in a popup.
3. You complete the consent in your browser. The provider redirects to
   `http://127.0.0.1:8787/api/mcp/<id>/callback`, Horizon exchanges the code, stores the token, and the
   card flips to **Connected**.
4. **List tools** enumerates the server's tools; clicking one calls it and shows the result. Calendar
   and Gmail tool output can then be persisted into `intelligence_items` for the timeline.

## Seeded servers

Google Calendar, Gmail, and Google Drive (URLs match the local Claude Code MCP config). Add more by
extending `mcpServerSeed`.

## Known caveat

The seeded servers are Google's `*.googleapis.com/mcp` endpoints. Whether they accept **third-party
dynamic client registration** (Horizon registering itself) is the one thing only a live Connect can
confirm. If a provider rejects DCR, the fallback is to orchestrate the already-authenticated Claude
Code MCP stack via headless `claude -p`, which reuses its existing tokens. Generic MCP servers that
support DCR connect directly with no fallback needed.

## Exit gate

- `npm run build` passes; the API boots with the SDK and `GET /api/mcp` lists servers.
- With `npm run dev:full` running, Connect opens the OAuth consent and a successful sign-in flips the
  card to Connected (verified on a machine with network access to the provider).
