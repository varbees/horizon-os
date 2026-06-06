# TrustClaw — verdict & bounded integration

Written 2026-06-06. Researched before designing any pivot around it.

## What it is (verified)

TrustClaw (`github.com/ComposioHQ/trustclaw`) is **Composio's** self-hostable personal AI agent —
the OpenClaw idea rebuilt security-first: 1000+ app integrations via **OAuth** (raw credentials never
exposed), sandboxed execution, vector memory, web/Telegram chat, 24/7 (hosted on Vercel). Hosted
**signups are closed**; new users self-host or use "Composio For You." **Composio is already in this
environment** (the `composio` MCP + `composio-cli` skill).

It is a secure personal-assistant agent with a large OAuth tool layer — **not** an autonomous
"cofounder that runs the business and decides on your behalf." That framing was projection.

Sources:
- https://github.com/ComposioHQ/trustclaw
- https://www.aitoolnet.com/trustclaw
- https://composio.dev/content/openclaw-alternatives
- https://www.trendmicro.com/en_us/research/26/b/what-openclaw-reveals-about-agentic-assistants.html

## Verdict: borrow the capability, refuse the pivot

- **Reject** adopting TrustClaw as an autonomous core that runs end-to-end on the Fedora laptop with
  live Cloudflare tokens. It's a bigger/riskier build than the source registry, crosses the
  owned-core / plan-gated line the v2 architecture drew, and the WIP tripwire (10 > 3) is already
  flagging tool-polishing over shipping. Polish-the-tool dressed as a pivot.
- **Accept** Composio's OAuth tool layer as a **gated adapter behind Horizon's existing executor/
  source registry** — the seam built for req #3. 1000+ secure integrations, no raw creds on the
  laptop, no rewrite, uses a resource already in hand.

## The three forks

1. **Autonomy ceiling:** stay plan-gated (propose → act on approval). No unsupervised action on a
   secrets-holding laptop. TrustClaw's sandboxing helps but does not remove the human gate.
2. **24/7 host:** not the sleeping laptop — run the always-on loop on **Cloudflare** (Worker/cron or a
   tiny VPS); laptop stays the control surface.
3. **The prompt:** the bounded Composio-adapter integration, gated by trigger — not "run everything."

## Plan

- **Now:** PhotoSelect (unchanged). v2 backbone is done; ship a money move.
- **Gated adapter** — trigger: a real task needs an app Horizon can't reach from disk (post to X,
  read Razorpay, send email). Then add one audited `composio` executor adapter behind the registry
  (`scripts/executors/`), OAuth via Composio MCP, plan-gated, one tool first (smallest slice through
  the existing action lifecycle). See [[executor-adapter-registry]].
- **Deferred indefinitely:** self-hosting TrustClaw; any unsupervised end-to-end autonomy.
