# Horizon Founder Playbook Research

This note converts recent solo-founder research into Horizon OS operating rules. The useful part is not copying another creator's exact niche. The useful part is the repeatable machine: validate, ship, document, attach a free utility, then measure the funnel.

## Sources Reviewed

- AshishBuilds case studies and ThreadCam teardown.
- AshishBuilds free tools index.
- AshishBuilds RSS feed and One Person Company series snippets.
- Bryntum's React calendar comparison for FullCalendar, React Big Calendar, and Bryntum Calendar.
- Local `income_plan.md` and `twelve_month_plan.md`.

## Extracted Patterns

### 1. Spy First, Then Build

The case-study format starts with proof: revenue, downloads, pricing ladder, ads, search terms, screenshots, and the narrow wedge. Horizon should treat every new product lane this way before work starts.

Horizon implementation:

- Add a validation checklist before a project can move from Research to Focus Now.
- Require buyer, pain, proof, monetization, first artifact, and no-build kill condition.
- For PhotoSelect, validate through studio conversations and workflow proof before adding features.

### 2. Free Tools As Lead Magnets

The free-tools index is a growth surface, not just a utility list. Each tool is small, useful, indexable, and attached to a founder/builder pain.

Horizon implementation:

- Maintain a backlog of free tools that directly support revenue:
  - PhotoSelect turnaround calculator.
  - Studio culling cost calculator.
  - Founder runway calculator.
  - Build-in-public post generator for release notes.
  - LocalBusiness schema generator for HSKG-style client pages.
- Each tool should map to one offer, one CTA, and one content post.

### 3. Ship, Link, Refresh, Repeat

The solo-founder SEO loop is simple: ship a page, link it into the site, refresh it with proof, and repeat. It fits Antharmaya better than big content calendars.

Horizon implementation:

- Weekly public artifact:
  - one shipped screen,
  - one short teardown,
  - one free tool or checklist,
  - one proof screenshot.
- Sunday review records what shipped, what linked, what was refreshed, and what got a response.

### 4. The Calendar Needs Output Contracts

Calendar libraries provide views and drag/drop, but not judgment. Horizon's advantage is not replacing Google Calendar. It is attaching each block to an output contract, agent prompt, task, and evidence note.

Current decision:

- Keep Schedule-X for now because it is already integrated.
- Do not jump to FullCalendar or Bryntum until the missing need is specific.
- Build the Google connector after local event creation, edits, recurrence ownership, and conflict rules are clear.

### 5. One Public OSS Wedge

The open-source wedge should stay bounded: `agent-calendar-os`, extracted from Horizon's agent-aware calendar, task contracts, and local-first command base. It can chase stars without stealing the private foundry mission.

## Horizon Rule

Every public artifact must serve one of these:

1. Earn money now.
2. Improve PhotoSelect distribution.
3. Create proof for Antharmaya as a productized service foundry.
4. Strengthen the local command system.
5. Preserve the body, attention, capital, and spec backbone.

If it does not serve one of those, it goes to the parking lot.
